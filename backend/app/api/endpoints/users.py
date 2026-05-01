from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from app.api import deps
from app.models import User, Wallet
from app.schemas.user import User as UserSchema, UserCreate

router = APIRouter()

@router.get("/me", response_model=UserSchema)
async def read_user_me(
    current_user: User = Depends(deps.get_current_user),
):
    return current_user

@router.post("/", response_model=UserSchema)
async def create_user(
    user_in: UserCreate,
    db: AsyncSession = Depends(deps.get_db)
):
    # Check if user already exists
    if user_in.telegram_id:
        result = await db.execute(select(User).filter(User.telegram_id == user_in.telegram_id))
        user = result.scalars().first()
        if user:
            raise HTTPException(status_code=400, detail="User already exists")
            
    # Create user
    db_user = User(
        telegram_id=user_in.telegram_id,
        username=user_in.username,
        role=user_in.role
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    
    # Create wallet for the new user
    db_wallet = Wallet(user_id=db_user.id, balance=0.0)
    db.add(db_wallet)
    await db.commit()
    
    return db_user

@router.get("/", response_model=List[UserSchema])
async def read_users(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(deps.get_db)
):
    result = await db.execute(select(User).offset(skip).limit(limit))
    users = result.scalars().all()
    return users
