import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "Points-Based Gaming Platform"
    
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-super-secret-key-change-this-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    
    # Optional: individual components if you prefer building the URL manually
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "postgres")
    POSTGRES_SERVER: str = os.getenv("POSTGRES_SERVER", "localhost")
    POSTGRES_PORT: str = os.getenv("POSTGRES_PORT", "5432")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "points_game_db")
    
    @property
    def DATABASE_URL(self) -> str:
        # If the environment variable is provided directly, use it
        url = os.getenv("DATABASE_URL")
        if url:
            return url
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    
    @property
    def ASYNC_DATABASE_URL(self) -> str:
        # For async connections, users can provide ASYNC_DATABASE_URL
        # If they only provide DATABASE_URL, we'll try to convert it (e.g., postgresql:// to postgresql+asyncpg://)
        async_url = os.getenv("ASYNC_DATABASE_URL")
        if async_url:
            return async_url
            
        url = os.getenv("DATABASE_URL")
        if url and url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        elif url and url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql+asyncpg://", 1)
            
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

settings = Settings()
