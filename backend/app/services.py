from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import BinaryIO
from uuid import uuid4

from .models import (
    AlertItem,
    AuditHolding,
    AuditRecommendation,
    AuditorResponse,
    CommandCenterResponse,
    CommandSignal,
    ConciergeMessageRequest,
    ConciergeMessageResponse,
    ConciergeOption,
    ConnectSessionRequest,
    ConnectSessionResponse,
    MarketEngineResponse,
    OverviewResponse,
    OverviewStat,
    Recommendation,
    SentinelResponse,
    StrategyMilestone,
    StrategySimulationRequest,
    StrategySimulationResponse,
    UploadPortfolioResponse,
)


def get_overview() -> OverviewResponse:
    return OverviewResponse(
        total_portfolio_value="INR 12,40,000",
        monthly_surplus="INR 4,500",
        risk_profile="Balanced Growth Seeker",
        stats=[
            OverviewStat(label="Goal Health", value="94%", tone="positive"),
            OverviewStat(label="Portfolio Drift", value="0.02%", tone="neutral"),
            OverviewStat(label="Watch Alerts", value="2 critical", tone="warning"),
        ],
    )


def create_connect_session(payload: ConnectSessionRequest) -> ConnectSessionResponse:
    state_token = uuid4().hex
    redirect_url = payload.redirect_url or "http://localhost:5173/connect/callback"
    authorization_url = (
        f"https://connect.nirvesta.local/{payload.broker}/authorize"
        f"?state={state_token}&redirect_uri={redirect_url}"
    )
    return ConnectSessionResponse(
        broker=payload.broker,
        authorization_url=authorization_url,
        expires_in_seconds=600,
        state_token=state_token,
    )


def analyze_uploaded_portfolio(filename: str, file_obj: BinaryIO) -> UploadPortfolioResponse:
    raw = file_obj.read()
    lowered_name = filename.lower()
    detected_format = "pdf" if lowered_name.endswith(".pdf") else "spreadsheet"
    lines = [line for line in raw.decode("utf-8", errors="ignore").splitlines() if line.strip()]
    holdings_detected = max(1, min(len(lines) - 1, 12)) if lines else 3
    return UploadPortfolioResponse(
        filename=filename,
        accepted=True,
        detected_format=detected_format,
        holdings_detected=holdings_detected,
        notes=[
            "Portfolio artifact queued for normalization.",
            "Instrument mapping will be enriched with exchange metadata.",
        ],
    )


def respond_to_concierge(payload: ConciergeMessageRequest) -> ConciergeMessageResponse:
    message = payload.message.lower()
    if "buy" in message or "dip" in message:
        persona = "Opportunistic Accumulator"
        maturity = 61
        reply = "That response signals you can tolerate volatility when it improves long-term entry prices."
    elif "anx" in message or "worry" in message:
        persona = "Pragmatic Resilience"
        maturity = 45
        reply = "You appear comfortable staying invested, but you still want recovery timelines to feel bounded and understandable."
    else:
        persona = "Measured Builder"
        maturity = 52
        reply = "Your answers suggest a preference for compounding steadily without taking unnecessary drawdown risk."

    return ConciergeMessageResponse(
        persona=persona,
        profile_maturity_percent=maturity,
        reply=reply,
        next_prompt=(
            f"{payload.profile_name}, if markets fall 20% and you have fresh liquidity available, "
            "which move feels most natural to you?"
        ),
        suggestions=[
            ConciergeOption(title="Inject Capital", subtitle="Buy the dip aggressively"),
            ConciergeOption(title="Hold Reserve", subtitle="Wait for further stability"),
            ConciergeOption(title="Rebalance Only", subtitle="Shift from debt to equity"),
            ConciergeOption(title="De-risk", subtitle="Move to gold or cash"),
        ],
    )


def simulate_strategy(payload: StrategySimulationRequest) -> StrategySimulationResponse:
    base_split = {
        "equity": 0.55,
        "debt": 0.2,
        "gold": 0.1,
        "international": 0.15,
    }
    if payload.risk_mode == "conservative":
        base_split = {"equity": 0.4, "debt": 0.35, "gold": 0.15, "international": 0.1}
    elif payload.risk_mode == "aggressive":
        base_split = {"equity": 0.7, "debt": 0.1, "gold": 0.05, "international": 0.15}

    retirement_age = 42 if payload.risk_mode != "conservative" else 45
    wealth_at_fifty = "USD 12.4M" if payload.risk_mode == "aggressive" else "USD 9.1M"
    summary = f"Using a {payload.risk_mode} plan, the engine allocates your surplus across four sleeves."

    if payload.event:
        retirement_age += 1 if payload.event.amount > 1_000_000 else 0
        summary += (
            f" The event '{payload.event.label}' temporarily slows milestone velocity because it absorbs "
            f"{payload.event.amount:,.0f} of deployable capital."
        )

    return StrategySimulationResponse(
        recommended_split=base_split,
        projected_retirement_age=retirement_age,
        wealth_at_fifty=wealth_at_fifty,
        risk_sensitivity="Medium-High" if payload.risk_mode != "conservative" else "Moderate",
        milestones=[
            StrategyMilestone(title="Marriage Fund", target_year=2026, target_amount="USD 45,000", status="on_track"),
            StrategyMilestone(title="Coastal Residence", target_year=2030, target_amount="USD 280,000", status="building"),
            StrategyMilestone(title="Freedom Ledger", target_year=2045, target_amount="USD 4.2M", status="seeded"),
        ],
        summary=summary,
    )


def get_market_recommendations() -> MarketEngineResponse:
    return MarketEngineResponse(
        sentiment="Bullish +2.4%",
        recommendations=[
            Recommendation(
                symbol="GOLDBEES",
                category="Commodity",
                monthly_sip="USD 2,450",
                thesis="Gold exposure helps offset rate and currency volatility in the current regime.",
                expense_ratio="0.04%",
                action="execute_buy",
            ),
            Recommendation(
                symbol="NIFTYBEES",
                category="Equity: Large Cap",
                monthly_sip="USD 4,200",
                thesis="Core large-cap exposure supports milestone compounding with lower tracking drift.",
                expense_ratio="0.05%",
                action="initiate_sip",
            ),
            Recommendation(
                symbol="MID150BEES",
                category="Equity: Mid Cap",
                monthly_sip="USD 1,850",
                thesis="Mid-cap participation adds measured growth torque for long-dated goals.",
                expense_ratio="0.21%",
                action="execute_buy",
            ),
        ],
        projected_acceleration=[
            OverviewStat(label="Retirement", value="-2 years", tone="positive"),
            OverviewStat(label="Education", value="-8 months", tone="positive"),
            OverviewStat(label="Leisure Fund", value="On Track", tone="neutral"),
        ],
    )


def get_sentinel_alerts() -> SentinelResponse:
    return SentinelResponse(
        vulnerability_score=88,
        aggregate_impact="-0.82% (USD 14,402)",
        auto_mitigation_ready=True,
        alerts=[
            AlertItem(
                timestamp_utc=_minutes_ago_iso(5),
                headline="Singapore logistics disruption increases tech and shipping risk.",
                impact="-4.2%",
                severity="critical",
                action="rebalance_now",
            ),
            AlertItem(
                timestamp_utc=_minutes_ago_iso(42),
                headline="Nordic clean energy uptime boost improves renewable manufacturers.",
                impact="+2.8%",
                severity="medium",
                action="analyze_exposure",
            ),
            AlertItem(
                timestamp_utc=_minutes_ago_iso(111),
                headline="Commodities signal remains neutral after lunar mining headline.",
                impact="neutral",
                severity="low",
                action="monitor",
            ),
        ],
    )


def get_auditor_report() -> AuditorResponse:
    return AuditorResponse(
        diversification_score=82,
        annualized_risk_trend=[40, 65, 30, 50, 20, 90, 45, 60, 75, 35],
        recommendation=AuditRecommendation(
            current_holding="Gold ETF A",
            suggested_holding="Gold ETF B",
            annual_savings="USD 1,240",
            reason="Lower expense ratio with similar tracking quality improves long-run fee drag.",
        ),
        holdings=[
            AuditHolding(
                symbol="AAPL",
                name="Apple Inc.",
                badge="High Expense Ratio",
                volatility_impact=64,
                market_value="USD 12,450",
                performance="+4.2%",
            ),
            AuditHolding(
                symbol="TSLA",
                name="Tesla, Inc.",
                badge="Efficient Holding",
                volatility_impact=88,
                market_value="USD 8,210",
                performance="-2.1%",
            ),
            AuditHolding(
                symbol="VTI",
                name="Vanguard Total Stock Market ETF",
                badge="Overlap Detected",
                volatility_impact=12,
                market_value="USD 45,000",
                performance="+1.8%",
            ),
        ],
    )


def get_command_center_briefing() -> CommandCenterResponse:
    return CommandCenterResponse(
        headlines=[
            "RBI raises repo rate by 25bps",
            "Tesla quarterly earnings beat consensus",
            "Crude inventory surprise pressures transport names",
        ],
        signals=[
            CommandSignal(
                priority="high",
                title="Taiwan Semiconductor Recovery Spike",
                asset="TATA MOTORS",
                target="+5.0% TARGET",
                reasoning="Input cost relief may improve EV margins over the next quarter.",
                action="rebalance_portfolio_now",
            ),
            CommandSignal(
                priority="medium",
                title="European Green Deal Expansion",
                asset="SIEMENS ENERGY",
                target="+3.2% TARGET",
                reasoning="Fresh subsidies could pull forward contract wins and revenue visibility.",
                action="analyze_exposure",
            ),
        ],
        execution_summary={
            "goal_health": "94%",
            "hedge_slippage": "0.12%",
            "execution_fee": "USD 0.00 (Zenith Tier)",
        },
    )


def _minutes_ago_iso(minutes: int) -> str:
    return (datetime.now(tz=UTC) - timedelta(minutes=minutes)).isoformat()
