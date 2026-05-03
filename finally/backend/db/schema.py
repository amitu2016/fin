import os
import aiosqlite
from db.seed import seed_defaults

DB_PATH = os.environ.get("DB_PATH", "/app/db/finally.db")

_CREATE_TABLES = """
CREATE TABLE IF NOT EXISTS users_profile (
    id TEXT PRIMARY KEY,
    cash_balance REAL DEFAULT 10000.0,
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS watchlist (
    id TEXT PRIMARY KEY,
    user_id TEXT DEFAULT 'default',
    ticker TEXT,
    added_at TEXT,
    UNIQUE(user_id, ticker)
);

CREATE TABLE IF NOT EXISTS positions (
    id TEXT PRIMARY KEY,
    user_id TEXT DEFAULT 'default',
    ticker TEXT,
    quantity REAL,
    avg_cost REAL,
    updated_at TEXT,
    UNIQUE(user_id, ticker)
);

CREATE TABLE IF NOT EXISTS trades (
    id TEXT PRIMARY KEY,
    user_id TEXT DEFAULT 'default',
    ticker TEXT,
    side TEXT,
    quantity REAL,
    price REAL,
    executed_at TEXT
);

CREATE TABLE IF NOT EXISTS portfolio_snapshots (
    id TEXT PRIMARY KEY,
    user_id TEXT DEFAULT 'default',
    total_value REAL,
    recorded_at TEXT
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    user_id TEXT DEFAULT 'default',
    role TEXT,
    content TEXT,
    actions TEXT,
    created_at TEXT
);
"""


async def init_db():
    """Create schema and seed defaults if DB is empty."""
    db_dir = os.path.dirname(os.path.abspath(DB_PATH))
    os.makedirs(db_dir, exist_ok=True)
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript(_CREATE_TABLES)
        await db.commit()
        cursor = await db.execute("SELECT COUNT(*) FROM users_profile WHERE id = 'default'")
        row = await cursor.fetchone()
        if row[0] == 0:
            await seed_defaults(db)
