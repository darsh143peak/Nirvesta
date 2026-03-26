# Nirvesta Backend

This backend adds two interfaces over the same domain logic:

- A FastAPI app for the Nirvesta frontend
- An MCP server for AI agents and copilots

The market endpoints are now backed by live NSE India quote, index, and market-status data. Portfolio-style endpoints derive their values from the configured `NIRVESTA_PORTFOLIO_HOLDINGS` basket plus live NSE prices.

## Structure

```text
backend/
├── app/
│   ├── api.py
│   ├── config.py
│   ├── main.py
│   ├── models.py
│   └── services.py
├── mcp_server.py
└── pyproject.toml
```

## Run The API

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload
```

The API will start on `http://127.0.0.1:8000`.

## Live Data Configuration

Set a watchlist in `.env`:

```bash
NIRVESTA_MARKET_SYMBOLS=INFY,HDFCBANK,RELIANCE,ITC,SBIN,NIFTYBEES,GOLDBEES,MID150BEES
NIRVESTA_MARKET_REFRESH_INTERVAL_SECONDS=3600
```

New market endpoints:

- `GET /api/v1/market/quotes?symbols=INFY,RELIANCE,NIFTYBEES`
- `GET /api/v1/market/indices?index_names=NIFTY 50,NIFTY BANK,NIFTY IT`
- `GET /api/v1/market/status`
- `GET /api/v1/market/snapshot`

## Hourly Market Refresh

The backend supports two hourly refresh modes:

- Celery + Redis worker/beat scheduling
- the existing in-process FastAPI fallback loop

When `NIRVESTA_USE_CELERY_SCHEDULER=true`, Celery beat dispatches an hourly refresh task through Redis and the API stops creating the in-process loop.

It refreshes and persists live quotes for the full tracked symbol universe, including every tracked ETF price:

- every symbol in `NIRVESTA_MARKET_SYMBOLS`
- every symbol from `backend/data/portfolio_holdings.json` after CSV upload

The persisted hourly snapshot is written to:

- `backend/data/market_snapshot.json`

### Run Celery With Redis

Start Redis locally, then run:

```bash
cd backend
uv sync
uv run celery -A app.celery_app:celery_app worker --loglevel=info
```

In a second terminal, run Celery beat:

```bash
cd backend
uv run celery -A app.celery_app:celery_app beat --loglevel=info
```

Then run the FastAPI API normally:

```bash
cd backend
uv run uvicorn app.main:app --reload
```

If you prefer the old in-process scheduler, set:

```bash
NIRVESTA_USE_CELERY_SCHEDULER=false
```

## Upload CSV Holdings

Uploading a CSV now replaces the default configured portfolio basket used by overview, auditor, sentinel, and command-center responses.

Expected CSV columns:

```csv
symbol,quantity
INFY,12
HDFCBANK,18
NIFTYBEES,80
```

Sample file to test with:

- `backend/data/mock_portfolio_upload.csv`

When uploaded through `POST /api/v1/connect/uploads`, the backend persists the holdings into:

- `backend/data/portfolio_holdings.json`

That file overrides `NIRVESTA_PORTFOLIO_HOLDINGS` until you upload a new CSV or delete the persisted JSON.

## Run The MCP Server

`stdio` transport works well for local MCP clients:

```bash
cd backend
uv run python mcp_server.py
```

To expose it over HTTP:

```bash
cd backend
NIRVESTA_MCP_TRANSPORT=streamable-http uv run python mcp_server.py
```

The MCP SDK quick example documents `FastMCP` and the supported transports here:
https://py.sdk.modelcontextprotocol.io/

The MCP server now exposes NSE-backed tools such as:

- `get_nse_quote`
- `get_nse_quotes`
- `get_tracked_nse_quotes`
- `get_nse_indices`
- `get_nse_market_status`
- `refresh_tracked_market_snapshot`
- `get_market_opportunities`
- `get_auditor_snapshot`

## Suggested Frontend Integration

- `GET /api/v1/overview` for dashboard cards
- `POST /api/v1/connect/sessions` for broker connect flows
- `POST /api/v1/concierge/respond` for onboarding chat
- `POST /api/v1/strategy/simulate` for roadmap recalculations
- `GET /api/v1/market-engine/recommendations` for ideas and allocations
- `GET /api/v1/sentinel/alerts` for live monitoring
- `GET /api/v1/auditor/report` for portfolio scans
- `GET /api/v1/command-center/briefing` for terminal summaries
