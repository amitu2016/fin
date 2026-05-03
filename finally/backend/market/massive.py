import asyncio
import os

import httpx

from market.base import MarketDataProvider
from market.cache import PriceCache


_POLL_INTERVAL = 15  # seconds — respects Polygon.io free tier
_BASE_URL = "https://api.polygon.io"
_TICKERS = ["AAPL", "GOOGL", "MSFT", "AMZN", "TSLA", "NVDA", "META", "JPM", "V", "NFLX"]


class MassiveClient(MarketDataProvider):
    """Polygon.io REST API client (free-tier polling)."""

    def __init__(self):
        self.cache = PriceCache()
        self._api_key = os.environ["MASSIVE_API_KEY"]
        self._task: asyncio.Task | None = None

    async def subscribe(self):
        self._task = asyncio.create_task(self._run())

    async def _run(self):
        async with httpx.AsyncClient(timeout=10) as client:
            while True:
                try:
                    await self._poll(client)
                except Exception:
                    pass  # keep running; stale cache is fine
                await asyncio.sleep(_POLL_INTERVAL)

    async def _poll(self, client: httpx.AsyncClient):
        tickers_param = ",".join(_TICKERS)
        resp = await client.get(
            f"{_BASE_URL}/v2/snapshot/locale/us/markets/stocks/tickers",
            params={"tickers": tickers_param, "apiKey": self._api_key},
        )
        resp.raise_for_status()
        data = resp.json()
        for snapshot in data.get("tickers", []):
            ticker = snapshot.get("ticker")
            day = snapshot.get("day", {})
            price = day.get("c") or snapshot.get("lastTrade", {}).get("p")
            if ticker and price:
                await self.cache.update(ticker, float(price))

    async def get_price(self, ticker: str) -> dict:
        entry = await self.cache.get(ticker)
        if entry is None:
            raise KeyError(f"No data for ticker: {ticker}")
        return {"ticker": ticker, **entry}

    async def get_all_prices(self) -> dict[str, dict]:
        return await self.cache.get_all()
