_prices: dict[str, float] = {}


def get_price(ticker: str) -> float | None:
    return _prices.get(ticker)


def set_price(ticker: str, price: float) -> None:
    _prices[ticker] = price


def set_prices(updates: dict[str, float]) -> None:
    _prices.update(updates)


def get_all() -> dict[str, float]:
    return dict(_prices)
