from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from decimal import Decimal

from app.api import deps
from app.models import Wallet, Transaction, TransactionType, TransactionStatus
from app.models.user import User

router = APIRouter()

class MintRequest(BaseModel):
    username: str
    amount: Decimal

@router.post("/mint")
async def mint_points(
    req: MintRequest,
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can mint points")
        
    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
        
    # Get target user
    target_user_res = await db.execute(select(User).filter(User.username == req.username))
    target_user = target_user_res.scalars().first()
    
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Get target wallet
    wallet_res = await db.execute(select(Wallet).filter(Wallet.user_id == target_user.id).with_for_update())
    wallet = wallet_res.scalars().first()
    
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
        
    # Mint points
    wallet.balance += req.amount
    
    # Record transaction
    tx = Transaction(
        wallet_id=wallet.id,
        amount=req.amount,
        type=TransactionType.adjustment,
        status=TransactionStatus.completed,
        reference_id=f"mint_{current_user.id}"
    )
    db.add(tx)
    
    await db.commit()
    
    return {"message": f"Successfully minted {req.amount} points to @{req.username}", "new_balance": float(wallet.balance)}

@router.get("/users")
async def get_all_users(
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view all users")
        
    result = await db.execute(
        select(User, Wallet)
        .outerjoin(Wallet, User.id == Wallet.user_id)
        .order_by(User.created_at.desc())
    )
    
    users_data = []
    for user, wallet in result.all():
        users_data.append({
            "id": user.id,
            "username": user.username,
            "role": user.role,
            "balance": float(wallet.balance) if wallet else 0,
            "created_at": user.created_at
        })
    return users_data

@router.get("/transactions")
async def get_all_transactions(
    limit: int = 50,
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view system transactions")
        
    result = await db.execute(
        select(Transaction)
        .order_by(Transaction.created_at.desc())
        .limit(limit)
    )
    transactions = result.scalars().all()
    
    tx_data = []
    for tx in transactions:
        tx_data.append({
            "id": tx.id,
            "wallet_id": tx.wallet_id,
            "type": tx.type,
            "amount": float(tx.amount),
            "status": tx.status,
            "reference_id": tx.reference_id,
            "created_at": tx.created_at
        })
    return tx_data
