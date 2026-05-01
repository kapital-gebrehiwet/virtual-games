from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import users, wallets, transactions, redemptions, admin
from app.api import auth
from app.plugins import register_plugins

app = FastAPI(title="Points-Based Gaming Platform API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the actual origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(wallets.router, prefix="/wallets", tags=["wallets"])
app.include_router(transactions.router, prefix="/transactions", tags=["transactions"])
app.include_router(redemptions.router, prefix="/redemptions", tags=["redemptions"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])

# Load all game plugins dynamically
register_plugins(app)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Points-Based Gaming Platform API"}
