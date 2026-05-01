from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.future import select
from typing import List, Any
import random

from app.api import deps
from app.plugins.bingo.models import BingoSession, BingoSessionStatus, BingoCard
from app.models.user import User
from app.core.bingo_logic import generate_bingo_card, check_winner
from app.core.economy import process_game_bet, process_game_reward

router = APIRouter()

BINGO_CARD_PRICE = 50

@router.post("/buy_card", response_model=Any)
async def buy_bingo_card(
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db)
):
    user_id = current_user.id

    # Find or create an active/waiting session
    session_result = await db.execute(select(BingoSession).filter(BingoSession.status == BingoSessionStatus.waiting))
    session = session_result.scalars().first()
    
    if not session:
        session = BingoSession(status=BingoSessionStatus.waiting)
        db.add(session)
        await db.commit()
        await db.refresh(session)

    # Process bet using core economy
    await process_game_bet(
        db=db,
        user_id=user_id,
        amount=BINGO_CARD_PRICE,
        game_name="bingo",
        reference_id=f"bingo_{session.id}_card"
    )

    # Generate and save Bingo Card
    grid = generate_bingo_card()
    card = BingoCard(
        session_id=session.id,
        user_id=user_id,
        grid=grid
    )
    db.add(card)
    
    await db.commit()
    await db.refresh(card)

    return {"message": "Card purchased successfully", "card_id": card.id, "grid": card.grid, "session_id": session.id}


@router.post("/draw/{session_id}", response_model=Any)
async def draw_number(
    session_id: int,
    db: Session = Depends(deps.get_db)
):
    # Fetch session
    result = await db.execute(select(BingoSession).filter(BingoSession.id == session_id))
    session = result.scalars().first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    if session.status == BingoSessionStatus.finished:
        raise HTTPException(status_code=400, detail="Session is already finished")
        
    if session.status == BingoSessionStatus.waiting:
        session.status = BingoSessionStatus.active

    # Get available numbers
    all_numbers = set(range(1, 76))
    drawn = set(session.drawn_numbers)
    available = list(all_numbers - drawn)
    
    if not available:
        raise HTTPException(status_code=400, detail="All numbers drawn")
        
    new_number = random.choice(available)
    
    # We must explicitly assign a new list for SQLAlchemy JSON column mutation tracking
    updated_drawn = session.drawn_numbers + [new_number]
    session.drawn_numbers = updated_drawn
    
    await db.commit()
    
    # Check for winners
    cards_result = await db.execute(select(BingoCard).filter(BingoCard.session_id == session_id))
    cards = cards_result.scalars().all()
    
    winners = []
    for card in cards:
        if card.is_winner == 0 and check_winner(card.grid, set(updated_drawn)):
            card.is_winner = 1
            winners.append(card.user_id)
            
            # Reward using core economy
            await process_game_reward(
                db=db,
                user_id=card.user_id,
                amount=500,
                game_name="bingo",
                reference_id=f"bingo_{session.id}_reward"
            )
                
    if winners:
        session.status = BingoSessionStatus.finished
        
    await db.commit()
    
    return {
        "drawn_number": new_number,
        "all_drawn": session.drawn_numbers,
        "winners": winners,
        "session_status": session.status
    }


@router.get("/session/{session_id}", response_model=Any)
async def get_session(
    session_id: int,
    db: Session = Depends(deps.get_db)
):
    result = await db.execute(select(BingoSession).filter(BingoSession.id == session_id))
    session = result.scalars().first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    return {
        "id": session.id,
        "status": session.status,
        "drawn_numbers": session.drawn_numbers
    }

@router.get("/my_cards/{session_id}", response_model=Any)
async def get_my_cards(
    session_id: int,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db)
):
    result = await db.execute(select(BingoCard).filter(BingoCard.session_id == session_id, BingoCard.user_id == current_user.id))
    cards = result.scalars().all()
    
    return [{"id": c.id, "grid": c.grid, "is_winner": c.is_winner} for c in cards]
