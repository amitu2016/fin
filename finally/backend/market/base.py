from abc import ABC, abstractmethod


class MarketDataProvider(ABC):
    @abstractmethod
    async def get_price(self, ticker: str) -> dict:
        """Return {price, prev_price, timestamp, direction} for a single ticker."""

    @abstractmethod
    async def get_all_prices(self) -> dict[str, dict]:
        """Return mapping of ticker -> {price, prev_price, timestamp, direction}."""

    @abstractmethod
    async def subscribe(self):
        """Start background price updates."""
