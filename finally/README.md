# FinAlly — AI Trading Workstation

An AI-powered trading workstation with live price streaming, simulated portfolio, and LLM chat assistant. Built with FastAPI + Next.js, served from a single Docker container.

## Quick Start

```bash
cp .env.example .env
# Edit .env to add your OPENROUTER_API_KEY
./scripts/start_mac.sh
# Open http://localhost:8000
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `OPENROUTER_API_KEY` | Yes | OpenRouter API key for LLM chat |
| `MASSIVE_API_KEY` | No | Massive/Polygon.io key for real market data (uses simulator if unset) |
| `LLM_MOCK` | No | Set to `true` for deterministic mock LLM responses (default: `false`) |

## How to Run (Docker)

**Start:**
```bash
./scripts/start_mac.sh          # macOS/Linux
./scripts/start_windows.ps1     # Windows PowerShell
```

**Stop:**
```bash
./scripts/stop_mac.sh           # macOS/Linux
./scripts/stop_windows.ps1      # Windows PowerShell
```

The database persists across restarts via a Docker named volume (`finally-data`).

## Architecture

- **Backend**: FastAPI (Python/uv), port 8000
- **Frontend**: Next.js TypeScript, built as static export, served by FastAPI
- **Database**: SQLite at `db/finally.db` (volume-mounted, auto-initialized)
- **Market data**: GBM simulator by default, Massive API if key provided
- **Real-time**: Server-Sent Events (`/api/stream/prices`)
- **AI**: LiteLLM → OpenRouter (Cerebras inference)

## Project Layout

```
finally/
├── frontend/       # Next.js TypeScript (static export)
├── backend/        # FastAPI uv project
├── planning/       # Agent-shared API contracts and docs
├── scripts/        # Start/stop Docker scripts
├── test/           # Playwright E2E tests
├── db/             # Volume mount target for SQLite
├── Dockerfile
├── docker-compose.yml
└── .env.example
```
