from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func, Numeric, Enum
from sqlalchemy.orm import relationship
from app.db.base_class import Base
import enum

class TransactionType(str, enum.Enum):
    purchase = "purchase"
    redemption = "redemption"
    transfer_in = "transfer_in"
    transfer_out = "transfer_out"
    game_bet = "game_bet"
    game_reward = "game_reward"
    adjustment = "adjustment"

class TransactionStatus(str, enum.Enum):
    pending = "pending"
    completed = "completed"
    failed = "failed"
    rejected = "rejected"

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    wallet_id = Column(Integer, ForeignKey("wallets.id"), index=True)
    type = Column(Enum(TransactionType))
    amount = Column(Numeric(10, 2))
    status = Column(Enum(TransactionStatus), default=TransactionStatus.completed)
    reference_id = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    wallet = relationship("Wallet", back_populates="transactions")
