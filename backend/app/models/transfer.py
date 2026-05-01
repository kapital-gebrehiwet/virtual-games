from sqlalchemy import Column, Integer, ForeignKey, DateTime, func, Numeric, Enum
from sqlalchemy.orm import relationship
from app.db.base_class import Base
import enum

class TransferStatus(str, enum.Enum):
    pending = "pending"
    completed = "completed"
    failed = "failed"

class Transfer(Base):
    __tablename__ = "transfers"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), index=True)
    receiver_id = Column(Integer, ForeignKey("users.id"), index=True)
    amount = Column(Numeric(10, 2))
    status = Column(Enum(TransferStatus), default=TransferStatus.completed)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    sender = relationship("User", foreign_keys=[sender_id])
    receiver = relationship("User", foreign_keys=[receiver_id])
