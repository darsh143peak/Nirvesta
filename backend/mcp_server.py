from app.config import get_settings
from app.models import ConciergeMessageRequest, ConnectSessionRequest, StrategySimulationRequest
from app.services import (
    analyze_uploaded_portfolio,
    create_connect_session,
    get_auditor_report,
    get_command_center_briefing,
    get_market_recommendations,
    get_overview,
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
