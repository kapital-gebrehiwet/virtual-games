import random
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.future import select
from typing import List, Any
from pydantic import BaseModel, Field
from decimal import Decimal
from datetime import datetime, timedelta, timezone

from app.api import deps
from app.models.user import User
from app.core.economy import process_game_bet, process_game_reward
from app.plugins.guess_master.models import GuessMasterSession, GuessMasterEntry

router = APIRouter()

GUESS_MASTER_FEE = 100 # Example fee

class GuessSubmit(BaseModel):
    guesses: List[int] = Field(..., min_length=5, max_length=5)

@router.get("/session", response_model=Any)
async def get_session(db: Session = Depends(deps.get_db)):
    result = await db.execute(select(GuessMasterSession).filter(GuessMasterSession.status.in_(["waiting", "tie_breaker"])).order_by(GuessMasterSession.id.desc()))
    session = result.scalars().first()
    
    if not session:
        # Check for finished
        res = await db.execute(select(GuessMasterSession).order_by(GuessMasterSession.id.desc()))
        session = res.scalars().first()
        if not session:
            return {"status": "none"}
            
    expires_in = 0
    if hasattr(session, 'expires_at') and session.expires_at:
        now = datetime.now(timezone.utc)
        # Handle naive datetime from db if necessary
        if session.expires_at.tzinfo is None:
            expires_at_aware = session.expires_at.replace(tzinfo=timezone.utc)
        else:
            expires_at_aware = session.expires_at
        diff = (expires_at_aware - now).total_seconds()
        expires_in = int(max(0, diff))
            
    return {
        "id": session.id,
        "status": session.status,
        "round_number": session.round_number,
        "prize_pool": float(session.prize_pool),
        "drawn_numbers": session.drawn_numbers,
        "tie_breaker_players": session.tie_breaker_players,
        "expires_in": expires_in
    }

@router.post("/submit_guess", response_model=Any)
async def submit_guess(
    data: GuessSubmit,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db)
):
    # Validate numbers
    if any(n < 1 or n > 90 for n in data.guesses):
        raise HTTPException(status_code=400, detail="Numbers must be between 1 and 90")
    if len(set(data.guesses)) != 5:
        raise HTTPException(status_code=400, detail="Numbers must be unique")
        
    # Get active session
    result = await db.execute(select(GuessMasterSession).filter(GuessMasterSession.status.in_(["waiting", "tie_breaker"])))
    session = result.scalars().first()
    
    if not session:
        # Create one if not exists
        expires = datetime.now(timezone.utc) + timedelta(minutes=3)
        session = GuessMasterSession(status="waiting", prize_pool=0.0, expires_at=expires)
        db.add(session)
        await db.commit()
        await db.refresh(session)
        
    if session.status == "finished":
        raise HTTPException(status_code=400, detail="Session is finished")

    # Check if already submitted in this tie-breaker round
    if session.round_number > 1:
        existing = await db.execute(select(GuessMasterEntry).filter(
            GuessMasterEntry.session_id == session.id,
            GuessMasterEntry.user_id == current_user.id,
            GuessMasterEntry.round_number == session.round_number
        ))
        if existing.scalars().first():
            raise HTTPException(status_code=400, detail="Already submitted your tie breaker guess for this round")

    # Process based on round
    if session.round_number == 1:
        # Deduct bet and add to pool
        await process_game_bet(db, current_user.id, GUESS_MASTER_FEE, "guess_master", f"guess_master_{session.id}")
        session.prize_pool = float(session.prize_pool) + GUESS_MASTER_FEE
    else:
        # Tie breaker check
        if current_user.id not in session.tie_breaker_players:
            raise HTTPException(status_code=403, detail="You are not in the tie-breaker for this session")

    entry = GuessMasterEntry(
        session_id=session.id,
        user_id=current_user.id,
        round_number=session.round_number,
        guesses=data.guesses
    )
    db.add(entry)
    await db.commit()
    
    return {"message": "Guess submitted successfully"}


@router.post("/draw", response_model=Any)
async def draw_numbers(
    db: Session = Depends(deps.get_db)
):
    result = await db.execute(
        select(GuessMasterSession)
        .filter(GuessMasterSession.status.in_(["waiting", "tie_breaker"]))
        .with_for_update()
    )
    session = result.scalars().first()
    
    if not session:
        raise HTTPException(status_code=404, detail="No active session found")
        
    if session.expires_at:
        now = datetime.now(timezone.utc)
        if session.expires_at.tzinfo is None:
            expires_at_aware = session.expires_at.replace(tzinfo=timezone.utc)
        else:
            expires_at_aware = session.expires_at
            
        if now < expires_at_aware - timedelta(seconds=2):
            raise HTTPException(status_code=400, detail="Draw timer has not expired yet")
        
    entries_result = await db.execute(select(GuessMasterEntry).filter(
        GuessMasterEntry.session_id == session.id,
        GuessMasterEntry.round_number == session.round_number
    ))
    entries = entries_result.scalars().all()
    
    if not entries:
        raise HTTPException(status_code=400, detail="No entries in this round")

    # Generate 20 numbers
    drawn = random.sample(range(1, 91), 20)
    drawn_set = set(drawn)
    
    # Calculate matches
    max_matches = -1
    for entry in entries:
        matches = len(set(entry.guesses) & drawn_set)
        entry.match_count = matches
        if matches > max_matches:
            max_matches = matches
            
    # Find winners
    winners = [e for e in entries if e.match_count == max_matches]
    
    if len(winners) == 1:
        # 1 winner gets 80%
        prize = Decimal(str(float(session.prize_pool) * 0.80))
        winners[0].is_winner = True
        await process_game_reward(db, winners[0].user_id, prize, "guess_master", f"guess_master_{session.id}_win")
        
        cashier_prize = Decimal(str(float(session.prize_pool) * 0.20))
        cashier_result = await db.execute(select(User).filter(User.role == "cashier"))
        cashier_user = cashier_result.scalars().first()
        if cashier_user:
            await process_game_reward(db, cashier_user.id, cashier_prize, "guess_master", f"guess_master_{session.id}_house_cut")
            
        session.status = "finished"
        session.drawn_numbers = drawn
        
    elif len(winners) == 2:
        # 2 winners get 40% each, 20% to cashier
        prize = Decimal(str(float(session.prize_pool) * 0.40))
        for w in winners:
            w.is_winner = True
            await process_game_reward(db, w.user_id, prize, "guess_master", f"guess_master_{session.id}_win")
            
        cashier_prize = Decimal(str(float(session.prize_pool) * 0.20))
        cashier_result = await db.execute(select(User).filter(User.role == "cashier"))
        cashier_user = cashier_result.scalars().first()
        if cashier_user:
            await process_game_reward(db, cashier_user.id, cashier_prize, "guess_master", f"guess_master_{session.id}_house_cut")
            
        session.status = "finished"
        session.drawn_numbers = drawn
        
    else:
        # 2 or more: Tie breaker
        session.tie_breaker_players = list(set([w.user_id for w in winners]))
        session.round_number += 1
        session.status = "tie_breaker"
        session.drawn_numbers = drawn
        session.expires_at = datetime.now(timezone.utc) + timedelta(minutes=3)
        
    await db.commit()
    
    return {
        "drawn_numbers": drawn,
        "status": session.status,
        "round_number": session.round_number,
        "winners": [w.user_id for w in winners],
        "max_matches": max_matches
    }

@router.get("/my_entries", response_model=Any)
async def get_my_entries(
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db)
):
    result = await db.execute(select(GuessMasterSession).order_by(GuessMasterSession.id.desc()))
    session = result.scalars().first()
    
    if not session:
        return []
        
    entries_result = await db.execute(select(GuessMasterEntry).filter(
        GuessMasterEntry.session_id == session.id,
        GuessMasterEntry.user_id == current_user.id
    ).order_by(GuessMasterEntry.round_number.asc()))
    
    entries = entries_result.scalars().all()
    return [{"round": e.round_number, "guesses": e.guesses, "matches": e.match_count, "is_winner": e.is_winner} for e in entries]

@router.get("/lobby", response_model=Any)
async def get_lobby(db: Session = Depends(deps.get_db)):
    result = await db.execute(select(GuessMasterSession).order_by(GuessMasterSession.id.desc()))
    session = result.scalars().first()
    
    if not session:
        return []
        
    entries_result = await db.execute(
        select(GuessMasterEntry, User.username)
        .join(User, User.id == GuessMasterEntry.user_id)
        .filter(GuessMasterEntry.session_id == session.id, GuessMasterEntry.round_number == session.round_number)
    )
    
    lobby_data = []
    for entry, username in entries_result.all():
        lobby_data.append({
            "username": username,
            "guesses": entry.guesses,
            "matches": entry.match_count
        })
        
    return lobby_data
