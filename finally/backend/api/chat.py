import asyncio
import json
import uuid
from datetime import datetime, timezone

import aiosqlite
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from cache.prices import get_price
from db.schema import DB_PATH
from llm.client import call_llm
from llm.prompt import build_system_prompt

router = APIRouter()


@router.get("/chat/history")
async def get_chat_history():
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT role, content, actions FROM chat_messages WHERE user_id = 'default' ORDER BY rowid LIMIT 100"
        )
        rows = await cursor.fetchall()
    return [
        {
            "role": r["role"],
            "content": r["content"],
            "actions": json.loads(r["actions"]) if r["actions"] else None,
        }
        for r in rows
    ]


class ChatRequest(BaseModel):
    message: str


async def _load_portfolio_context(db: aiosqlite.Connection) -> dict:
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
        unrealized = (price - avg_cost) * qty if price else 0.0
        pnl_pct = (price - avg_cost) / avg_cost * 100 if price and avg_cost else 0.0
        pos_value = qty * price if price else qty * avg_cost
        total_pos_value += pos_value
        total_pnl += unrealized
        positions.append({
            "ticker": ticker,
            "quantity": qty,
            "avg_cost": avg_cost,
            "current_price": price,
            "unrealized_pnl": unrealized,
            "pnl_pct": pnl_pct,
        })

    cursor = await db.execute(
        "SELECT ticker FROM watchlist WHERE user_id = 'default' ORDER BY added_at"
    )
    wl_rows = await cursor.fetchall()
    watchlist = [{"ticker": r["ticker"], "price": get_price(r["ticker"])} for r in wl_rows]

    return {
        "cash_balance": cash,
        "positions": positions,
        "watchlist": watchlist,
        "total_value": cash + total_pos_value,
        "total_pnl": total_pnl,
    }


async def _load_chat_history(db: aiosqlite.Connection) -> list[dict]:
    db.row_factory = aiosqlite.Row
    cursor = await db.execute(
        "SELECT role, content FROM chat_messages WHERE user_id = 'default' ORDER BY rowid DESC LIMIT 20"
    )
    rows = await cursor.fetchall()
    return [{"role": r["role"], "content": r["content"]} for r in reversed(rows)]


async def _execute_trade(db: aiosqlite.Connection, ticker: str, side: str, quantity: float) -> dict:
    ticker = ticker.upper()
    side = side.lower()
    price = get_price(ticker)
    if price is None:
        return {"error": f"No price for {ticker}"}

    now = datetime.now(timezone.utc).isoformat()
    trade_id = str(uuid.uuid4())

    cursor = await db.execute(
        "SELECT cash_balance FROM users_profile WHERE id = 'default'"
    )
    profile = await cursor.fetchone()
    cash = profile["cash_balance"]

    if side == "buy":
        cost = quantity * price
        if cash < cost:
            return {"error": f"Insufficient cash for {ticker}: need {cost:.2f}, have {cash:.2f}"}
        new_cash = cash - cost

        cursor = await db.execute(
            "SELECT quantity, avg_cost FROM positions WHERE user_id = 'default' AND ticker = ?",
            (ticker,),
        )
        existing = await cursor.fetchone()
        if existing:
            new_qty = existing["quantity"] + quantity
            new_avg = (existing["quantity"] * existing["avg_cost"] + quantity * price) / new_qty
            await db.execute(
                "UPDATE positions SET quantity = ?, avg_cost = ?, updated_at = ? WHERE user_id = 'default' AND ticker = ?",
                (new_qty, new_avg, now, ticker),
            )
        else:
            new_qty, new_avg = quantity, price
            await db.execute(
                "INSERT INTO positions (id, user_id, ticker, quantity, avg_cost, updated_at) VALUES (?, 'default', ?, ?, ?, ?)",
                (str(uuid.uuid4()), ticker, new_qty, new_avg, now),
            )

    else:  # sell
        cursor = await db.execute(
            "SELECT quantity, avg_cost FROM positions WHERE user_id = 'default' AND ticker = ?",
            (ticker,),
        )
        existing = await cursor.fetchone()
        have = existing["quantity"] if existing else 0.0
        if not existing or have < quantity:
            return {"error": f"Insufficient shares of {ticker}: need {quantity}, have {have}"}
        new_cash = cash + quantity * price
        new_qty = have - quantity
        if new_qty == 0:
            await db.execute(
                "DELETE FROM positions WHERE user_id = 'default' AND ticker = ?", (ticker,)
            )
        else:
            await db.execute(
                "UPDATE positions SET quantity = ?, updated_at = ? WHERE user_id = 'default' AND ticker = ?",
                (new_qty, now, ticker),
            )

    await db.execute(
        "UPDATE users_profile SET cash_balance = ? WHERE id = 'default'", (new_cash,)
    )
    await db.execute(
        "INSERT INTO trades (id, user_id, ticker, side, quantity, price, executed_at) VALUES (?, 'default', ?, ?, ?, ?, ?)",
        (trade_id, ticker, side, quantity, price, now),
    )
    return {"trade_id": trade_id, "ticker": ticker, "side": side, "quantity": quantity, "price": price}


async def _apply_watchlist_change(db: aiosqlite.Connection, ticker: str, action: str) -> dict:
    ticker = ticker.upper()
    now = datetime.now(timezone.utc).isoformat()
    if action == "add":
        try:
            await db.execute(
                "INSERT INTO watchlist (id, user_id, ticker, added_at) VALUES (?, 'default', ?, ?)",
                (str(uuid.uuid4()), ticker, now),
            )
            return {"ticker": ticker, "action": "added"}
        except Exception:
            return {"ticker": ticker, "action": "already_in_watchlist"}
    else:
        cursor = await db.execute(
            "DELETE FROM watchlist WHERE user_id = 'default' AND ticker = ?", (ticker,)
        )
        if cursor.rowcount == 0:
            return {"ticker": ticker, "action": "not_in_watchlist"}
        return {"ticker": ticker, "action": "removed"}


@router.post("/chat")
async def chat(req: ChatRequest):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        portfolio = await _load_portfolio_context(db)
        history = await _load_chat_history(db)

    system_prompt = build_system_prompt(portfolio)
    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(history)
    messages.append({"role": "user", "content": req.message})

    llm_response = await call_llm(messages)
    assistant_message = llm_response.get("message", "")
    trades_to_exec = llm_response.get("trades", [])
    wl_changes = llm_response.get("watchlist_changes", [])

    trades_executed = []
    watchlist_changes = []
    errors = []

    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        for t in trades_to_exec:
            result = await _execute_trade(db, t["ticker"], t["side"], t["quantity"])
            if "error" in result:
                errors.append(result["error"])
            else:
                trades_executed.append(result)

        for wc in wl_changes:
            result = await _apply_watchlist_change(db, wc["ticker"], wc["action"])
            watchlist_changes.append(result)

        actions = {
            "trades_executed": trades_executed,
            "watchlist_changes": watchlist_changes,
            "errors": errors,
        }
        now = datetime.now(timezone.utc).isoformat()
        await db.execute(
            "INSERT INTO chat_messages (id, user_id, role, content, actions, created_at) VALUES (?, 'default', ?, ?, ?, ?)",
            (str(uuid.uuid4()), "user", req.message, None, now),
        )
        await db.execute(
            "INSERT INTO chat_messages (id, user_id, role, content, actions, created_at) VALUES (?, 'default', ?, ?, ?, ?)",
            (str(uuid.uuid4()), "assistant", assistant_message, json.dumps(actions), now),
        )
        await db.commit()

    if trades_executed:
        from tasks.snapshot import take_snapshot
        asyncio.create_task(take_snapshot())

    return {
        "message": assistant_message,
        "trades_executed": trades_executed,
        "watchlist_changes": watchlist_changes,
        "errors": errors,
    }
