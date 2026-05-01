from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from decimal import Decimal
from app.models.transaction import TransactionType, TransactionStatus

class TransactionBase(BaseModel):
    wallet_id: int
    type: TransactionType
    amount: Decimal
    status: TransactionStatus = TransactionStatus.completed
    reference_id: Optional[str] = None

class TransactionCreate(TransactionBase):
    pass

class Transaction(TransactionBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
