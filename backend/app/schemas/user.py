from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from app.models.user import UserRole

class UserBase(BaseModel):
    telegram_id: Optional[str] = None
    username: Optional[str] = None
    role: UserRole = UserRole.player
    referral_code: Optional[str] = None
    referred_by_id: Optional[int] = None

class UserCreate(UserBase):
    pass

class User(UserBase):
    id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
