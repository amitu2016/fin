import asyncio
from datetime import datetime, timezone

from cache.prices import set_price


class PriceCache:
    """In-memory price cache: ticker -> {price, prev_price, timestamp, direction}."""

    def __init__(self):
        self._data: dict[str, dict] = {}
        self._lock = asyncio.Lock()

    async def update(self, ticker: str, new_price: float):
        async with self._lock:
            prev = self._data.get(ticker, {})
            prev_price = prev.get("price", new_price)
            direction = "up" if new_price > prev_price else ("down" if new_price < prev_price else "flat")
            self._data[ticker] = {
                "price": new_price,
                "prev_price": prev_price,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "direction": direction,
            }
        # Sync with global cache for simple lookup in API routers
        set_price(ticker, new_price)

    async def get(self, ticker: str) -> dict | None:
        async with self._lock:
            return self._data.get(ticker)

    async def get_all(self) -> dict[str, dict]:
        async with self._lock:
            return dict(self._data)
