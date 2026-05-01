import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy.future import select
from datetime import timedelta
from typing import Any, Optional
from pydantic import BaseModel

from app.api import deps
from app.core import security
from app.core.config import settings
from app.models.user import User, UserRole
from app.models.wallet import Wallet

router = APIRouter()

class UserCreate(BaseModel):
    username: str
    password: str
    role: UserRole = UserRole.player
    referred_by_code: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str

@router.post("/signup", response_model=Token)
async def signup(user_in: UserCreate, db: Session = Depends(deps.get_db)) -> Any:
    """
    Register a new user and return a JWT token.
    """
    # Check if user exists
    result = await db.execute(select(User).filter(User.username == user_in.username))
    user = result.scalars().first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="A user with this username already exists in the system.",
        )
    
    # Generate unique referral code
    new_referral_code = str(uuid.uuid4())[:8].upper()
    
    # Check referral code
    referred_by_id = None
    if user_in.referred_by_code:
        ref_res = await db.execute(select(User).filter(User.referral_code == user_in.referred_by_code.strip().upper()))
        ref_user = ref_res.scalars().first()
        if ref_user:
            referred_by_id = ref_user.id
            
    # Create user
    user = User(
        username=user_in.username,
        hashed_password=security.get_password_hash(user_in.password),
        role=user_in.role,
        referral_code=new_referral_code,
        referred_by_id=referred_by_id
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Create wallet with initial 10000 points for testing
    wallet = Wallet(user_id=user.id, balance=10000)
    db.add(wallet)
    await db.commit()

    # Generate token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "role": user.role}

@router.post("/login", response_model=Token)
async def login(
    db: Session = Depends(deps.get_db), form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    result = await db.execute(select(User).filter(User.username == form_data.username))
    user = result.scalars().first()
    
    if not user or not user.hashed_password:
        raise HTTPException(status_code=400, detail="Incorrect username or password")
        
    if not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "role": user.role}
