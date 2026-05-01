import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import update
from app.db.session import AsyncSessionLocal
from app.models.wallet import Wallet

async def grant_points():
    async with AsyncSessionLocal() as session:
        await session.execute(update(Wallet).values(balance=10000))
        await session.commit()
        print("Successfully granted 10000 points to all wallets!")

if __name__ == "__main__":
    asyncio.run(grant_points())
