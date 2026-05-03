import asyncio
import math
import random

from market.base import MarketDataProvider
from market.cache import PriceCache


_SEED_PRICES = {
    "AAPL": 190.0,
    "GOOGL": 175.0,
    "MSFT": 415.0,
    "AMZN": 185.0,
    "TSLA": 175.0,
    "NVDA": 875.0,
    "META": 505.0,
    "JPM": 200.0,
    "V": 275.0,
    "NFLX": 630.0,
}

# Tech tickers share a correlated market factor
_TECH = {"AAPL", "GOOGL", "MSFT", "AMZN", "TSLA", "NVDA", "META", "NFLX"}

_MU = 0.0001       # drift per step
_SIGMA = 0.003     # base volatility per step
_DT = 0.5          # seconds per step
_MARKET_SIGMA = 0.0015  # shared tech market factor
_EVENT_PROB = 0.002     # probability of spike per ticker per step


class GBMSimulator(MarketDataProvider):
    def __init__(self):
        self.cache = PriceCache()
        self._prices: dict[str, float] = dict(_SEED_PRICES)
        self._task: asyncio.Task | None = None

    async def subscribe(self):
        # seed cache with initial prices
        for ticker, price in self._prices.items():
            await self.cache.update(ticker, price)
        self._task = asyncio.create_task(self._run())

    async def _run(self):
        while True:
            await asyncio.sleep(_DT)
            market_shock = random.gauss(0, _MARKET_SIGMA)
            for ticker, price in list(self._prices.items()):
                idio = random.gauss(0, _SIGMA)
                factor = (market_shock if ticker in _TECH else 0.0) + idio
                new_price = price * math.exp(_MU * _DT + factor)
                # occasional event spike
                if random.random() < _EVENT_PROB:
                    spike = random.uniform(0.02, 0.05) * random.choice([-1, 1])
                    new_price *= 1 + spike
                new_price = max(new_price, 0.01)
                self._prices[ticker] = new_price
                await self.cache.update(ticker, round(new_price, 4))

    async def get_price(self, ticker: str) -> dict:
        entry = await self.cache.get(ticker)
        if entry is None:
            raise KeyError(f"Unknown ticker: {ticker}")
        return {"ticker": ticker, **entry}

    async def get_all_prices(self) -> dict[str, dict]:
        return await self.cache.get_all()
