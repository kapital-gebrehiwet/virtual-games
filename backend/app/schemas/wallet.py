from pydantic import BaseModel, ConfigDict
from datetime import datetime
from decimal import Decimal

class WalletBase(BaseModel):
    balance: Decimal = Decimal("0.0")

class WalletCreate(WalletBase):
    user_id: int

class Wallet(WalletBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
