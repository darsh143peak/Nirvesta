# Nirvesta Backend

This backend adds two interfaces over the same domain logic:

- A FastAPI app for the Nirvesta frontend
- An MCP server for AI agents and copilots

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

## Suggested Frontend Integration

- `GET /api/v1/overview` for dashboard cards
- `POST /api/v1/connect/sessions` for broker connect flows
- `POST /api/v1/concierge/respond` for onboarding chat
- `POST /api/v1/strategy/simulate` for roadmap recalculations
- `GET /api/v1/market-engine/recommendations` for ideas and allocations
- `GET /api/v1/sentinel/alerts` for live monitoring
- `GET /api/v1/auditor/report` for portfolio scans
- `GET /api/v1/command-center/briefing` for terminal summaries
