import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import engine, AsyncSessionLocal
from app.models.user import User, UserRole
from app.models.wallet import Wallet

async def seed_data():
    async with AsyncSessionLocal() as db:
        # Create a test player
        test_user = User(
            telegram_id="123456789",
            username="player_one",
            role=UserRole.player
        )
        db.add(test_user)
        await db.commit()
        await db.refresh(test_user)
        
        # Give them a wallet with 10,000 points
        wallet = Wallet(
            user_id=test_user.id,
            balance=10000
        )
        db.add(wallet)
        await db.commit()
        
        print("✅ Successfully seeded database!")
        print(f"Test User ID: {test_user.id}")
        print(f"Test User Wallet Balance: {wallet.balance} PTS")

if __name__ == "__main__":
    asyncio.run(seed_data())
