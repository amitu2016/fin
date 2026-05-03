import uuid
from datetime import datetime, timezone

WATCHLIST_TICKERS = ["AAPL", "GOOGL", "MSFT", "AMZN", "TSLA", "NVDA", "META", "JPM", "V", "NFLX"]


async def seed_defaults(db):
    """Seed default user profile and watchlist tickers."""
    now = datetime.now(timezone.utc).isoformat()
    await db.execute(
        "INSERT INTO users_profile (id, cash_balance, created_at) VALUES (?, ?, ?)",
        ("default", 10000.0, now),
    )
    for ticker in WATCHLIST_TICKERS:
        await db.execute(
            "INSERT INTO watchlist (id, user_id, ticker, added_at) VALUES (?, ?, ?, ?)",
            (str(uuid.uuid4()), "default", ticker, now),
        )
    await db.commit()
