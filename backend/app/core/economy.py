from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import HTTPException
from decimal import Decimal
from app.models.wallet import Wallet
from app.models.transaction import Transaction, TransactionType, TransactionStatus

async def process_game_bet(db: AsyncSession, user_id: int, amount: Decimal, game_name: str, reference_id: str = None) -> Wallet:
    """
    Deducts a bet amount from the user's wallet for a game.
    Raises HTTPException 400 if insufficient funds.
    """
    res = await db.execute(select(Wallet).filter(Wallet.user_id == user_id).with_for_update())
    wallet = res.scalars().first()
    
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
        
    if wallet.balance < amount:
        raise HTTPException(status_code=400, detail="Insufficient funds for this bet")
        
    # Deduct the bet
    wallet.balance -= amount
    
    # Record transaction
    tx = Transaction(
        wallet_id=wallet.id,
        amount=-amount,
        type=TransactionType.game_bet,
        status=TransactionStatus.completed,
        reference_id=reference_id or f"bet_{game_name}"
    )
    db.add(tx)
    
    await db.flush()
    return wallet

async def process_game_reward(db: AsyncSession, user_id: int, amount: Decimal, game_name: str, reference_id: str = None) -> Wallet:
    """
    Adds a reward amount to the user's wallet for winning a game.
    """
    res = await db.execute(select(Wallet).filter(Wallet.user_id == user_id).with_for_update())
    wallet = res.scalars().first()
    
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
        
    # Add the reward
    wallet.balance += amount
    
    # Record transaction
    tx = Transaction(
        wallet_id=wallet.id,
        amount=amount,
        type=TransactionType.game_reward,
        status=TransactionStatus.completed,
        reference_id=reference_id or f"reward_{game_name}"
    )
    db.add(tx)
    
    await db.flush()
    return wallet
