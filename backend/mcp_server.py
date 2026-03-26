from app.config import get_settings
from app.models import ConciergeMessageRequest, ConnectSessionRequest, StrategySimulationRequest
from app.services import (
    analyze_uploaded_portfolio,
    create_connect_session,
    get_auditor_report,
    get_command_center_briefing,
    get_market_indices,
    get_market_quote,
    get_market_quotes,
    get_market_recommendations,
    get_market_snapshot,
    get_market_status,
    get_overview,
    get_tracked_symbols,
    refresh_market_snapshot,
    get_sentinel_alerts,
    respond_to_concierge,
    simulate_strategy,
)
from mcp.server.fastmcp import FastMCP

settings = get_settings()
mcp = FastMCP("Nirvesta MCP", json_response=True)


@mcp.resource("nirvesta://overview")
def overview_resource() -> dict:
    """Return the current dashboard overview snapshot."""
    return get_overview().model_dump()


@mcp.resource("nirvesta://nse/market-status")
def market_status_resource() -> dict:
    """Return the latest NSE market status payload."""
    return get_market_status().model_dump()


@mcp.resource("nirvesta://nse/market-snapshot")
def market_snapshot_resource() -> dict:
    """Return the latest persisted tracked-market snapshot."""
    return get_market_snapshot().model_dump()


@mcp.tool()
def create_broker_connect_session(broker: str, redirect_url: str | None = None) -> dict:
    """Create a broker authorization session for supported platforms."""
    payload = ConnectSessionRequest(broker=broker, redirect_url=redirect_url)
    return create_connect_session(payload).model_dump()


@mcp.tool()
def summarize_portfolio_upload(filename: str, content: str) -> dict:
    """Inspect a portfolio CSV, XLSX-export text, or PDF text extract and summarize ingestion results."""

    class InMemoryFile:
        def __init__(self, raw_text: str) -> None:
            self._raw = raw_text.encode("utf-8")

        def read(self) -> bytes:
            return self._raw

    return analyze_uploaded_portfolio(filename, InMemoryFile(content)).model_dump()


@mcp.tool()
def concierge_reply(message: str, profile_name: str = "Guest Investor") -> dict:
    """Generate the next concierge onboarding turn and updated persona snapshot."""
    payload = ConciergeMessageRequest(message=message, profile_name=profile_name)
    return respond_to_concierge(payload).model_dump()


@mcp.tool()
def simulate_wealth_strategy(
    monthly_surplus: float,
    risk_mode: str = "balanced",
    event_label: str | None = None,
    event_amount: float = 0,
    sip_pause_months: int = 0,
) -> dict:
    """Run a roadmap simulation for a surplus and optional life event."""
    event = None
    if event_label:
        event = {
            "label": event_label,
            "amount": event_amount,
            "sip_pause_months": sip_pause_months,
        }

    payload = StrategySimulationRequest(
        monthly_surplus=monthly_surplus,
        risk_mode=risk_mode,
        event=event,
    )
    return simulate_strategy(payload).model_dump()


@mcp.tool()
def get_market_opportunities() -> dict:
    """Return current market-engine recommendations and milestone acceleration estimates."""
    return get_market_recommendations().model_dump()


@mcp.tool()
def get_nse_quote(symbol: str) -> dict:
    """Return a live NSE quote snapshot for a single symbol."""
    return get_market_quote(symbol).model_dump()


@mcp.tool()
def get_nse_quotes(symbols: str = "") -> dict:
    """Return live NSE quote snapshots for a comma-separated symbol list."""
    parsed_symbols = [symbol.strip().upper() for symbol in symbols.split(",") if symbol.strip()] or None
    return get_market_quotes(parsed_symbols).model_dump()


@mcp.tool()
def get_nse_indices(index_names: str = "") -> dict:
    """Return NSE index snapshots for a comma-separated list of index names."""
    parsed_names = [name.strip() for name in index_names.split(",") if name.strip()] or None
    return get_market_indices(parsed_names).model_dump()


@mcp.tool()
def get_nse_market_status() -> dict:
    """Return the latest NSE market status snapshot."""
    return get_market_status().model_dump()


@mcp.tool()
def get_tracked_nse_quotes() -> dict:
    """Return live NSE quotes for the full tracked symbol universe."""
    return get_market_quotes(get_tracked_symbols()).model_dump()


@mcp.tool()
def refresh_tracked_market_snapshot() -> dict:
    """Refresh and persist the tracked NSE market snapshot immediately."""
    return refresh_market_snapshot().model_dump()


@mcp.tool()
def get_sentinel_snapshot() -> dict:
    """Return current portfolio risk alerts and mitigation readiness."""
    return get_sentinel_alerts().model_dump()


@mcp.tool()
def get_auditor_snapshot() -> dict:
    """Return diversification, holdings diagnostics, and optimization ideas."""
    return get_auditor_report().model_dump()


@mcp.tool()
def get_command_briefing() -> dict:
    """Return the terminal-style signal briefing for the command center."""
    return get_command_center_briefing().model_dump()


if __name__ == "__main__":
    mcp.run(transport=settings.mcp_transport)
