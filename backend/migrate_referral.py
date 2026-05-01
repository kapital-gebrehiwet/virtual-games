import asyncio
from app.db.session import AsyncSessionLocal
from sqlalchemy import text

async def main():
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("ALTER TABLE users ADD COLUMN referral_code VARCHAR;"))
            await session.execute(text("ALTER TABLE users ADD COLUMN referred_by_id INTEGER REFERENCES users(id);"))
            await session.execute(text("ALTER TABLE users ADD COLUMN referral_reward_claimed BOOLEAN DEFAULT FALSE;"))
            await session.execute(text("CREATE UNIQUE INDEX ix_users_referral_code ON users (referral_code);"))
            await session.commit()
            print("Migration applied successfully!")
    except Exception as e:
        print(f"Migration failed or already applied: {e}")

if __name__ == "__main__":
    asyncio.run(main())
