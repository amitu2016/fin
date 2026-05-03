# FinAlly — API Contract Reference

This document is the shared contract for all agents building FinAlly. All frontend, backend, and test agents must conform to these specifications.

## Base URL

All API endpoints are served from the same origin as the frontend. In development and production: `http://localhost:8000`.

---

## API Endpoints

### Market Data

#### `GET /api/stream/prices`

Long-lived SSE stream of live price updates for all tickers in the watchlist.

**Headers:** `Accept: text/event-stream`

**SSE Event format** (one event per tick, ~500ms cadence):
```
data: {"ticker": "AAPL", "price": 192.34, "prev_price": 191.80, "change": 0.54, "change_pct": 0.28, "direction": "up", "timestamp": "2026-05-03T07:00:00.000Z"}
```

| Field | Type | Description |
|---|---|---|
| `ticker` | string | Ticker symbol |
| `price` | number | Current price |
| `prev_price` | number | Previous price |
| `change` | number | Absolute price change |
| `change_pct` | number | Percentage change |
| `direction` | `"up"` \| `"down"` \| `"flat"` | Price direction |
| `timestamp` | string | ISO 8601 timestamp |

The `EventSource` API handles reconnection automatically. Server sends all tracked tickers each tick.

---

### Portfolio

#### `GET /api/portfolio`

Returns the current portfolio state.

**Response:**
```json
{
  "cash": 8500.00,
  "total_value": 12300.50,
  "positions": [
    {
      "ticker": "AAPL",
      "quantity": 10.0,
      "avg_cost": 190.00,
      "current_price": 192.34,
      "market_value": 1923.40,
      "unrealized_pnl": 23.40,
      "unrealized_pnl_pct": 1.23
    }
  ]
}
```

#### `POST /api/portfolio/trade`

Execute a market order. Instant fill at current price.

**Request:**
```json
{
  "ticker": "AAPL",
  "side": "buy",
  "quantity": 10.0
}
```

**Response (success, 200):**
```json
{
  "trade_id": "uuid",
  "ticker": "AAPL",
  "side": "buy",
  "quantity": 10.0,
  "price": 192.34,
  "total": 1923.40,
  "executed_at": "2026-05-03T07:00:00Z"
}
```

**Response (error, 400):**
```json
{
  "error": "Insufficient cash",
  "detail": "Required: $1923.40, Available: $500.00"
}
```

Validation rules:
- Buy: `cash >= quantity * current_price`
- Sell: `position.quantity >= quantity`
- `quantity` must be > 0

#### `GET /api/portfolio/history`

Portfolio value snapshots for the P&L chart.

**Response:**
```json
{
  "snapshots": [
    {"total_value": 10000.00, "recorded_at": "2026-05-03T06:00:00Z"},
    {"total_value": 10150.25, "recorded_at": "2026-05-03T06:00:30Z"}
  ]
}
```

---

### Watchlist

#### `GET /api/watchlist`

Returns all watched tickers with latest prices.

**Response:**
```json
{
  "tickers": [
    {
      "ticker": "AAPL",
      "price": 192.34,
      "prev_price": 191.80,
      "change_pct": 0.28
    }
  ]
}
```

Default seed: AAPL, GOOGL, MSFT, AMZN, TSLA, NVDA, META, JPM, V, NFLX

#### `POST /api/watchlist`

Add a ticker to the watchlist.

**Request:**
```json
{"ticker": "PYPL"}
```

**Response (200):**
```json
{"ticker": "PYPL", "added_at": "2026-05-03T07:00:00Z"}
```

**Response (409):** Already in watchlist.

#### `DELETE /api/watchlist/{ticker}`

Remove a ticker from the watchlist.

**Response (200):**
```json
{"ticker": "PYPL", "removed": true}
```

**Response (404):** Ticker not in watchlist.

---

### Chat

#### `POST /api/chat`

Send a user message to the LLM assistant. Returns a complete JSON response (not streaming).

**Request:**
```json
{"message": "Buy 10 shares of AAPL for me"}
```

**Response (200):**
```json
{
  "message": "Done! I've bought 10 shares of AAPL at $192.34, costing $1,923.40. Your remaining cash is $8,076.60.",
  "trades": [
    {"ticker": "AAPL", "side": "buy", "quantity": 10, "price": 192.34, "status": "executed"}
  ],
  "watchlist_changes": []
}
```

- `trades`: trades the LLM requested; each includes `status: "executed" | "failed"` and optional `error`
- `watchlist_changes`: watchlist modifications; each includes `action: "add" | "remove"` and `status`

LLM structured output schema (internal):
```json
{
  "message": "string",
  "trades": [{"ticker": "string", "side": "buy|sell", "quantity": "number"}],
  "watchlist_changes": [{"ticker": "string", "action": "add|remove"}]
}
```

---

### System

#### `GET /api/health`

Health check for Docker/deployment readiness.

**Response (200):**
```json
{"status": "ok", "db": "ok"}
```

---

## Database Schema

All tables include `user_id TEXT DEFAULT 'default'` for single-user deployments with future multi-user compatibility.

| Table | Key columns |
|---|---|
| `users_profile` | `id`, `cash_balance`, `created_at` |
| `watchlist` | `id`, `user_id`, `ticker`, `added_at` — UNIQUE `(user_id, ticker)` |
| `positions` | `id`, `user_id`, `ticker`, `quantity`, `avg_cost`, `updated_at` — UNIQUE `(user_id, ticker)` |
| `trades` | `id`, `user_id`, `ticker`, `side`, `quantity`, `price`, `executed_at` |
| `portfolio_snapshots` | `id`, `user_id`, `total_value`, `recorded_at` |
| `chat_messages` | `id`, `user_id`, `role`, `content`, `actions` (JSON), `created_at` |

Database path: `/app/db/finally.db` in container, volume-mounted from `db/` in project root.
Lazy initialization: backend creates schema and seeds defaults on first request if file is missing.

Default seed: user profile with `cash_balance=10000.0`, watchlist with 10 tickers (AAPL, GOOGL, MSFT, AMZN, TSLA, NVDA, META, JPM, V, NFLX).

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `OPENROUTER_API_KEY` | — | Required for LLM chat |
| `MASSIVE_API_KEY` | `""` | If set, uses Massive API for real market data |
| `LLM_MOCK` | `false` | If `true`, returns deterministic mock LLM responses |

---

## Key Design Decisions

- **SSE not WebSockets**: one-way push is sufficient; simpler, universal browser support
- **Static Next.js export**: single origin, no CORS, one port, one container
- **SQLite**: single-user, no server, zero config, volume-mounted for persistence
- **Market orders only**: no order book complexity
- **No auth/login**: single user, fake money — simplicity over security
- **Cerebras via OpenRouter**: fast inference; `openrouter/openai/gpt-oss-120b` model via LiteLLM
