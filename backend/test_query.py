import asyncio
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.models.wallet import Wallet
from sqlalchemy.future import select

async def main():
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(User, Wallet)
            .outerjoin(Wallet, User.id == Wallet.user_id)
            .order_by(User.created_at.desc())
        )
        for user, wallet in result.all():
            print(user.username, wallet.balance if wallet else 0)

if __name__ == "__main__":
    asyncio.run(main())
