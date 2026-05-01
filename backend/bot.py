import asyncio
import logging
import os
from aiogram import Bot, Dispatcher, types
from aiogram.filters import CommandStart, Command
from aiogram.enums import ParseMode
from aiogram.client.default import DefaultBotProperties
import httpx

# Configure logging
logging.basicConfig(level=logging.INFO)

# Initialize bot and dispatcher
BOT_TOKEN = os.getenv("BOT_TOKEN", "YOUR_TELEGRAM_BOT_TOKEN_HERE")
API_URL = "http://127.0.0.1:8000" # Local FastAPI backend URL

bot = Bot(token=BOT_TOKEN, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
dp = Dispatcher()

# Simple hardcoded user logic for demo since bot doesn't directly hit DB
USER_ID = 1

@dp.message(CommandStart())
async def command_start_handler(message: types.Message) -> None:
    username = message.from_user.username
    await message.answer(f"Hello, {username}! Welcome to the Points-Based Gaming Platform.\nUse /balance to check your points and /bingo to play!")

@dp.message(Command("balance"))
async def command_balance_handler(message: types.Message) -> None:
    async with httpx.AsyncClient() as client:
        try:
            res = await client.get(f"{API_URL}/wallets/{USER_ID}")
            if res.status_code == 200:
                data = res.json()
                await message.answer(f"Your balance is: {data['balance']} PTS")
            else:
                await message.answer("Error getting balance.")
        except:
            await message.answer("Backend is unavailable.")

@dp.message(Command("bingo"))
async def command_bingo_handler(message: types.Message) -> None:
    async with httpx.AsyncClient() as client:
        try:
            res = await client.post(f"{API_URL}/bingo/buy_card?user_id={USER_ID}")
            if res.status_code == 200:
                data = res.json()
                await message.answer(f"🎉 You successfully bought a Bingo card for Session #{data['session_id']}!\n50 PTS have been deducted.\nVisit the Web Dashboard to view your card and play live!")
            else:
                data = res.json()
                await message.answer(f"Could not buy card: {data.get('detail', 'Unknown error')}")
        except:
            await message.answer("Backend is unavailable.")

async def main() -> None:
    # And the run events dispatching
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
