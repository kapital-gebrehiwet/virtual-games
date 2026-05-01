from sqlalchemy import Column, Integer, String, Enum, DateTime, func, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.db.base_class import Base
import enum

class UserRole(str, enum.Enum):
    player = "player"
    cashier = "cashier"
    admin = "admin"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    telegram_id = Column(String, unique=True, index=True, nullable=True)
    username = Column(String, index=True, nullable=True)
    hashed_password = Column(String, nullable=True)
    role = Column(Enum(UserRole), default=UserRole.player)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    referral_code = Column(String, unique=True, index=True, nullable=True)
    referred_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    referral_reward_claimed = Column(Boolean, default=False)

    wallet = relationship("Wallet", back_populates="user", uselist=False)
    referred_by = relationship("User", remote_side=[id], backref="referrals")
