from sqlalchemy import Column, Integer, ForeignKey, DateTime, func, Numeric, Enum
from sqlalchemy.orm import relationship
from app.db.base_class import Base
import enum

class RedemptionStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"

class RedemptionRequest(Base):
    __tablename__ = "redemption_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    cashier_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    amount = Column(Numeric(10, 2))
    status = Column(Enum(RedemptionStatus), default=RedemptionStatus.pending)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", foreign_keys=[user_id])
    cashier = relationship("User", foreign_keys=[cashier_id])
