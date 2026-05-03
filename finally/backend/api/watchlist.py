import re
import uuid
from datetime import datetime, timezone

import aiosqlite
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from cache.prices import get_price
from db.schema import DB_PATH

router = APIRouter()

_TICKER_RE = re.compile(r"^[A-Z]{1,5}$")


class AddTickerRequest(BaseModel):
    ticker: str


@router.get("/watchlist")
async def get_watchlist():
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT ticker FROM watchlist WHERE user_id = 'default' ORDER BY added_at"
        )
        rows = await cursor.fetchall()
    return [{"ticker": r["ticker"], "price": get_price(r["ticker"])} for r in rows]


@router.post("/watchlist", status_code=201)
async def add_to_watchlist(body: AddTickerRequest):
    ticker = body.ticker.upper().strip()
    if not _TICKER_RE.match(ticker):
        raise HTTPException(400, f"Invalid ticker format: {ticker!r}")
    async with aiosqlite.connect(DB_PATH) as db:
        try:
            await db.execute(
                "INSERT INTO watchlist (id, user_id, ticker, added_at) VALUES (?, 'default', ?, ?)",
                (str(uuid.uuid4()), ticker, datetime.now(timezone.utc).isoformat()),
            )
            await db.commit()
        except aiosqlite.IntegrityError:
            raise HTTPException(409, f"{ticker} already in watchlist")
    return {"ticker": ticker}


@router.delete("/watchlist/{ticker}", status_code=204)
async def remove_from_watchlist(ticker: str):
    ticker = ticker.upper()
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "DELETE FROM watchlist WHERE user_id = 'default' AND ticker = ?", (ticker,)
        )
        await db.commit()
        if cursor.rowcount == 0:
            raise HTTPException(404, f"{ticker} not in watchlist")
