import asyncio
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from api.chat import router as chat_router
from api.health import router as health_router
from api.portfolio import router as portfolio_router
from api.stream import router as stream_router
from api.watchlist import router as watchlist_router
from db.schema import init_db
from tasks.snapshot import snapshot_loop


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    if os.environ.get("MASSIVE_API_KEY"):
        from market.massive import MassiveClient
        provider = MassiveClient()
    else:
        from market.simulator import GBMSimulator
        provider = GBMSimulator()
    app.state.market_provider = provider
    await provider.subscribe()
    task = asyncio.create_task(snapshot_loop())
    yield
    task.cancel()


app = FastAPI(title="FinAlly", lifespan=lifespan)

app.include_router(health_router, prefix="/api")
app.include_router(stream_router, prefix="/api")
app.include_router(watchlist_router, prefix="/api")
app.include_router(portfolio_router, prefix="/api")
app.include_router(chat_router, prefix="/api")

static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
