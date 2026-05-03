import aiosqlite
from fastapi import APIRouter
from db.schema import DB_PATH

router = APIRouter()


@router.get("/health")
async def health():
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute("SELECT 1")
        db_status = "ok"
    except Exception:
        db_status = "error"
    return {"status": "ok", "db": db_status}
