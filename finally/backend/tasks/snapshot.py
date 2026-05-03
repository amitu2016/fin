import asyncio
import uuid
from datetime import datetime, timezone

import aiosqlite

from cache.prices import get_price
from db.schema import DB_PATH


async def take_snapshot() -> None:
    """Record a portfolio snapshot: cash + sum(quantity * current_price)."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT cash_balance FROM users_profile WHERE id = 'default'"
        )
        profile = await cursor.fetchone()
        if not profile:
            return
        cash = profile["cash_balance"]

        cursor = await db.execute(
            "SELECT ticker, quantity FROM positions WHERE user_id = 'default'"
        )
        rows = await cursor.fetchall()
        pos_value = sum(r["quantity"] * (get_price(r["ticker"]) or 0.0) for r in rows)

        await db.execute(
            "INSERT INTO portfolio_snapshots (id, user_id, total_value, recorded_at) VALUES (?, 'default', ?, ?)",
            (str(uuid.uuid4()), cash + pos_value, datetime.now(timezone.utc).isoformat()),
        )
        await db.commit()


async def snapshot_loop() -> None:
    """Background task: record portfolio snapshot every 30 seconds."""
    while True:
        try:
            await take_snapshot()
        except Exception:
            pass
        await asyncio.sleep(30)
