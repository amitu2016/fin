import asyncio
import uuid
from datetime import datetime, timezone

import aiosqlite
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from cache.prices import get_price
from db.schema import DB_PATH

router = APIRouter()


class TradeRequest(BaseModel):
    ticker: str
    quantity: float
    side: str  # "buy" or "sell"


@router.get("/portfolio")
async def get_portfolio():
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT cash_balance FROM users_profile WHERE id = 'default'"
        )
        profile = await cursor.fetchone()
        if not profile:
            raise HTTPException(404, "User not found")
        cash = profile["cash_balance"]

        cursor = await db.execute(
            "SELECT ticker, quantity, avg_cost FROM positions WHERE user_id = 'default'"
        )
        pos_rows = await cursor.fetchall()

    positions = []
    total_pos_value = 0.0
    total_pnl = 0.0
    for row in pos_rows:
        ticker, qty, avg_cost = row["ticker"], row["quantity"], row["avg_cost"]
        price = get_price(ticker)
        if price is not None:
            unrealized = (price - avg_cost) * qty
            pnl_pct = (price - avg_cost) / avg_cost * 100 if avg_cost else 0.0
            pos_value = qty * price
        else:
            unrealized, pnl_pct = 0.0, 0.0
            pos_value = qty * avg_cost
        total_pos_value += pos_value
        total_pnl += unrealized
        positions.append(
            {
                "ticker": ticker,
                "quantity": qty,
                "avg_cost": avg_cost,
                "current_price": price,
                "unrealized_pnl": unrealized,
                "pnl_pct": pnl_pct,
            }
        )

    return {
        "cash_balance": cash,
        "positions": positions,
        "total_value": cash + total_pos_value,
        "total_pnl": total_pnl,
    }


@router.post("/portfolio/trade")
async def execute_trade(trade: TradeRequest):
    ticker = trade.ticker.upper()
    side = trade.side.lower()
    qty = trade.quantity

    if side not in ("buy", "sell"):
        raise HTTPException(400, "side must be 'buy' or 'sell'")
    if qty <= 0:
        raise HTTPException(400, "quantity must be positive")

    price = get_price(ticker)
    if price is None:
        raise HTTPException(400, f"No price available for {ticker}")

    trade_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT cash_balance FROM users_profile WHERE id = 'default'"
        )
        profile = await cursor.fetchone()
        cash = profile["cash_balance"]

        if side == "buy":
            cost = qty * price
            if cash < cost:
                raise HTTPException(400, f"Insufficient cash: need {cost:.2f}, have {cash:.2f}")
            new_cash = cash - cost

            cursor = await db.execute(
                "SELECT quantity, avg_cost FROM positions WHERE user_id = 'default' AND ticker = ?",
                (ticker,),
            )
            existing = await cursor.fetchone()
            if existing:
                new_qty = existing["quantity"] + qty
                new_avg = (existing["quantity"] * existing["avg_cost"] + qty * price) / new_qty
                await db.execute(
                    "UPDATE positions SET quantity = ?, avg_cost = ?, updated_at = ? WHERE user_id = 'default' AND ticker = ?",
                    (new_qty, new_avg, now, ticker),
                )
            else:
                new_qty, new_avg = qty, price
                await db.execute(
                    "INSERT INTO positions (id, user_id, ticker, quantity, avg_cost, updated_at) VALUES (?, 'default', ?, ?, ?, ?)",
                    (str(uuid.uuid4()), ticker, new_qty, new_avg, now),
                )
            position = {"ticker": ticker, "quantity": new_qty, "avg_cost": new_avg}

        else:  # sell
            cursor = await db.execute(
                "SELECT quantity, avg_cost FROM positions WHERE user_id = 'default' AND ticker = ?",
                (ticker,),
            )
            existing = await cursor.fetchone()
            have = existing["quantity"] if existing else 0.0
            if not existing or have < qty:
                raise HTTPException(400, f"Insufficient shares: need {qty}, have {have}")

            new_cash = cash + qty * price
            new_qty = have - qty
            if new_qty == 0:
                await db.execute(
                    "DELETE FROM positions WHERE user_id = 'default' AND ticker = ?", (ticker,)
                )
                position = None
            else:
                await db.execute(
                    "UPDATE positions SET quantity = ?, updated_at = ? WHERE user_id = 'default' AND ticker = ?",
                    (new_qty, now, ticker),
                )
                position = {"ticker": ticker, "quantity": new_qty, "avg_cost": existing["avg_cost"]}

        await db.execute(
            "UPDATE users_profile SET cash_balance = ? WHERE id = 'default'", (new_cash,)
        )
        await db.execute(
            "INSERT INTO trades (id, user_id, ticker, side, quantity, price, executed_at) VALUES (?, 'default', ?, ?, ?, ?, ?)",
            (trade_id, ticker, side, qty, price, now),
        )
        await db.commit()

    # Snapshot after trade (background, non-blocking)
    from tasks.snapshot import take_snapshot
    asyncio.create_task(take_snapshot())

    return {
        "success": True,
        "trade_id": trade_id,
        "message": f"{side.capitalize()} {qty} {ticker} @ {price:.2f}",
        "new_cash_balance": new_cash,
        "position": position,
    }


@router.get("/portfolio/history")
async def get_portfolio_history():
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT total_value, recorded_at FROM portfolio_snapshots WHERE user_id = 'default' ORDER BY recorded_at"
        )
        rows = await cursor.fetchall()
    return [{"total_value": r["total_value"], "recorded_at": r["recorded_at"]} for r in rows]
