from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api import deps
from app.models import Wallet
from app.schemas.wallet import Wallet as WalletSchema

from app.models.user import User

router = APIRouter()

@router.get("/me", response_model=WalletSchema)
async def read_wallet_me(
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db)
):
    result = await db.execute(select(Wallet).filter(Wallet.user_id == current_user.id))
    wallet = result.scalars().first()
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    return wallet
