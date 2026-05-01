import asyncio
import httpx
from app.db.session import AsyncSessionLocal
from app.models.user import User
from sqlalchemy.future import select
from app.core.security import create_access_token
from datetime import timedelta

async def get_admin_token():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).filter(User.role == "admin"))
        admin = result.scalars().first()
        if admin:
            return create_access_token(data={"sub": str(admin.id)}, expires_delta=timedelta(days=1))
    return None

async def main():
    token = await get_admin_token()
    if not token:
        print("No admin user found")
        return
        
    print(f"Got token: {token[:10]}...")
    
    async with httpx.AsyncClient() as client:
        res = await client.get(
            "http://127.0.0.1:8000/admin/users",
            headers={"Authorization": f"Bearer {token}"}
        )
        print(f"Status: {res.status_code}")
        print(f"Body: {res.text}")
        
        res2 = await client.get(
            "http://127.0.0.1:8000/admin/transactions",
            headers={"Authorization": f"Bearer {token}"}
        )
        print(f"Transactions Status: {res2.status_code}")
        print(f"Transactions Body: {res2.text}")

if __name__ == "__main__":
    asyncio.run(main())
