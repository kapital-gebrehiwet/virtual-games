from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from decimal import Decimal

from app.api import deps
from app.models import Wallet, Transaction, TransactionType, TransactionStatus
from app.models.redemption import RedemptionRequest, RedemptionStatus
from app.models.user import User

router = APIRouter()

class RedemptionCreate(BaseModel):
    amount: Decimal

@router.post("/request")
async def request_redemption(
    req: RedemptionCreate,
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db)
):
    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
        
    # Get user wallet
    wallet_res = await db.execute(select(Wallet).filter(Wallet.user_id == current_user.id).with_for_update())
    wallet = wallet_res.scalars().first()
    
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
        
    if wallet.balance < req.amount:
        raise HTTPException(status_code=400, detail="Insufficient funds")
        
    # Deduct points immediately
    wallet.balance -= req.amount
    
    # Create redemption request
    redemption = RedemptionRequest(
        user_id=current_user.id,
        amount=req.amount,
        status=RedemptionStatus.pending
    )
    db.add(redemption)
    await db.flush() # to get redemption.id
    
    # Create pending transaction record
    tx = Transaction(
        wallet_id=wallet.id,
        amount=-req.amount,
        type=TransactionType.redemption,
        status=TransactionStatus.pending,
        reference_id=f"redemption_{redemption.id}"
    )
    db.add(tx)
    
    await db.commit()
    
    return {"message": "Redemption requested successfully", "redemption_id": redemption.id}

@router.get("/pending")
async def get_pending_redemptions(
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db)
):
    # Only admins or cashiers should be able to view this
    if current_user.role not in ["admin", "cashier"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    result = await db.execute(
        select(RedemptionRequest, User)
        .join(User, RedemptionRequest.user_id == User.id)
        .filter(RedemptionRequest.status == RedemptionStatus.pending)
        .order_by(RedemptionRequest.created_at.asc())
    )
    
    pending = []
    for req, user in result.all():
        pending.append({
            "id": req.id,
            "user_id": req.user_id,
            "username": user.username,
            "amount": float(req.amount),
            "status": req.status,
            "created_at": req.created_at
        })
        
    return pending

@router.post("/{redemption_id}/approve")
async def approve_redemption(
    redemption_id: int,
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db)
):
    if current_user.role not in ["admin", "cashier"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    res = await db.execute(select(RedemptionRequest).filter(RedemptionRequest.id == redemption_id).with_for_update())
    req = res.scalars().first()
    
    if not req:
        raise HTTPException(status_code=404, detail="Redemption request not found")
        
    if req.status != RedemptionStatus.pending:
        raise HTTPException(status_code=400, detail="Redemption request is not pending")
        
    req.status = RedemptionStatus.approved
    req.cashier_id = current_user.id
    
    # Update transaction status
    tx_res = await db.execute(select(Transaction).filter(Transaction.reference_id == f"redemption_{req.id}"))
    tx = tx_res.scalars().first()
    if tx:
        tx.status = TransactionStatus.completed
        
    await db.commit()
    return {"message": "Redemption approved successfully"}

@router.post("/{redemption_id}/reject")
async def reject_redemption(
    redemption_id: int,
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db)
):
    if current_user.role not in ["admin", "cashier"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    res = await db.execute(select(RedemptionRequest).filter(RedemptionRequest.id == redemption_id).with_for_update())
    req = res.scalars().first()
    
    if not req:
        raise HTTPException(status_code=404, detail="Redemption request not found")
        
    if req.status != RedemptionStatus.pending:
        raise HTTPException(status_code=400, detail="Redemption request is not pending")
        
    req.status = RedemptionStatus.rejected
    req.cashier_id = current_user.id
    
    # Refund the user
    wallet_res = await db.execute(select(Wallet).filter(Wallet.user_id == req.user_id).with_for_update())
    wallet = wallet_res.scalars().first()
    if wallet:
        wallet.balance += req.amount
        
        # Create refund transaction
        refund_tx = Transaction(
            wallet_id=wallet.id,
            amount=req.amount,
            type=TransactionType.adjustment,
            status=TransactionStatus.completed,
            reference_id=f"refund_redemption_{req.id}"
        )
        db.add(refund_tx)
        
    # Update original transaction status
    tx_res = await db.execute(select(Transaction).filter(Transaction.reference_id == f"redemption_{req.id}"))
    tx = tx_res.scalars().first()
    if tx:
        tx.status = TransactionStatus.rejected
        
    await db.commit()
    return {"message": "Redemption rejected and points refunded"}
