from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from decimal import Decimal

from app.api import deps
from app.models import Wallet, Transaction, TransactionType, TransactionStatus, Transfer
from app.models.user import User
from app.schemas.transaction import Transaction as TransactionSchema
from pydantic import BaseModel

router = APIRouter()

class TransferRequest(BaseModel):
    receiver_username: str
    amount: Decimal

@router.post("/transfer")
async def transfer_points(
    req: TransferRequest,
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db)
):
    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
        
    if current_user.username == req.receiver_username:
        raise HTTPException(status_code=400, detail="Cannot transfer to yourself")

    # Get receiver user
    receiver_user_res = await db.execute(select(User).filter(User.username == req.receiver_username))
    receiver_user = receiver_user_res.scalars().first()
    if not receiver_user:
        raise HTTPException(status_code=404, detail="Receiver not found")

    # Get sender wallet
    sender_res = await db.execute(select(Wallet).filter(Wallet.user_id == current_user.id).with_for_update())
    sender_wallet = sender_res.scalars().first()
    
    # Get receiver wallet
    receiver_res = await db.execute(select(Wallet).filter(Wallet.user_id == receiver_user.id).with_for_update())
    receiver_wallet = receiver_res.scalars().first()
    
    if not sender_wallet or not receiver_wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
        
    if sender_wallet.balance < req.amount:
        raise HTTPException(status_code=400, detail="Insufficient funds")
        
    # Perform transfer
    sender_wallet.balance -= req.amount
    receiver_wallet.balance += req.amount
    
    # Record transfer
    transfer = Transfer(sender_id=current_user.id, receiver_id=receiver_user.id, amount=req.amount)
    db.add(transfer)
    await db.flush() # To get transfer.id
    
    # Record transactions
    tx_out = Transaction(
        wallet_id=sender_wallet.id,
        amount=-transfer.amount,
        type=TransactionType.transfer_out,
        status=TransactionStatus.completed,
        reference_id=f"transfer_to_{receiver_wallet.id}"
    )
    tx_in = Transaction(
        wallet_id=receiver_wallet.id,
        amount=transfer.amount,
        type=TransactionType.transfer_in,
        reference_id=str(transfer.id)
    )
    db.add(tx_out)
    db.add(tx_in)
    
    # Referral Bonus Logic
    if current_user.role == "cashier":
        if receiver_user.referred_by_id and not receiver_user.referral_reward_claimed:
            if req.amount >= 50:
                receiver_user.referral_reward_claimed = True
                inviter_wallet_res = await db.execute(select(Wallet).filter(Wallet.user_id == receiver_user.referred_by_id).with_for_update())
                inviter_wallet = inviter_wallet_res.scalars().first()
                if inviter_wallet:
                    inviter_wallet.balance += Decimal("5.00")
                    reward_tx = Transaction(
                        wallet_id=inviter_wallet.id,
                        amount=Decimal("5.00"),
                        type=TransactionType.adjustment,
                        status=TransactionStatus.completed,
                        reference_id=f"referral_bonus_{receiver_user.id}"
                    )
                    db.add(reward_tx)
    
    await db.commit()
    
    return {"message": "Transfer successful"}

@router.get("/me", response_model=List[TransactionSchema])
async def read_transactions_me(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db)
):
    wallet_res = await db.execute(select(Wallet).filter(Wallet.user_id == current_user.id))
    wallet = wallet_res.scalars().first()
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
        
    result = await db.execute(
        select(Transaction)
        .filter(Transaction.wallet_id == wallet.id)
        .order_by(Transaction.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    transactions = result.scalars().all()
    return transactions
