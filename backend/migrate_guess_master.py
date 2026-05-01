import asyncio
from app.db.session import AsyncSessionLocal
from sqlalchemy import text

async def main():
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("ALTER TABLE guess_master_sessions ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;"))
            await session.commit()
            print("Migration applied successfully!")
    except Exception as e:
        print(f"Migration failed or already applied: {e}")

if __name__ == "__main__":
    asyncio.run(main())
