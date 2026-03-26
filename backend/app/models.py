from typing import Literal

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: Literal["ok"]
    service: str
    environment: str


class OverviewStat(BaseModel):
    label: str
    value: str
    tone: Literal["neutral", "positive", "warning", "negative"]


class OverviewResponse(BaseModel):
    total_portfolio_value: str
    monthly_surplus: str
    risk_profile: str
    stats: list[OverviewStat]


class ConnectSessionRequest(BaseModel):
    broker: Literal["zerodha", "upstox", "groww"]
    redirect_url: str | None = None


class ConnectSessionResponse(BaseModel):
    broker: str
    authorization_url: str
    expires_in_seconds: int
    state_token: str


class UploadPortfolioResponse(BaseModel):
    filename: str
    accepted: bool
    detected_format: str
    holdings_detected: int
    symbols: list[str]
    persistence_path: str
    notes: list[str]


class BatchUploadPortfolioResponse(BaseModel):
    accepted: bool
    files_processed: int
    filenames: list[str]
    holdings_detected: int
    symbols: list[str]
    persistence_path: str
    notes: list[str]


class ConciergeMessageRequest(BaseModel):
    message: str = Field(min_length=1)
    profile_name: str = "Guest Investor"


class ConciergeOption(BaseModel):
    title: str
    subtitle: str


class ConciergeMessageResponse(BaseModel):
    persona: str
    profile_maturity_percent: int
    reply: str
    next_prompt: str
    suggestions: list[ConciergeOption]


class LifeEventSimulation(BaseModel):
    label: str
    amount: float = Field(ge=0)
    sip_pause_months: int = Field(default=0, ge=0, le=24)


class StrategySimulationRequest(BaseModel):
    monthly_surplus: float = Field(gt=0)
    risk_mode: Literal["conservative", "balanced", "aggressive"] = "balanced"
    event: LifeEventSimulation | None = None


class StrategyMilestone(BaseModel):
    title: str
    target_year: int
    target_amount: str
    status: str


class StrategySimulationResponse(BaseModel):
    recommended_split: dict[str, float]
    projected_retirement_age: int
    wealth_at_fifty: str
    risk_sensitivity: str
    milestones: list[StrategyMilestone]
    summary: str


class Recommendation(BaseModel):
    symbol: str
    category: str
    last_price: float
    percent_change: float
    last_updated: str
    thesis: str
    action: str


class MarketEngineResponse(BaseModel):
    sentiment: str
    recommendations: list[Recommendation]
    projected_acceleration: list[OverviewStat]


class AlertItem(BaseModel):
    timestamp_utc: str
    headline: str
    impact: str
    severity: Literal["low", "medium", "high", "critical"]
    action: str


class SentinelResponse(BaseModel):
    vulnerability_score: int
    aggregate_impact: str
    auto_mitigation_ready: bool
    alerts: list[AlertItem]


class AuditHolding(BaseModel):
    symbol: str
    name: str
    badge: str
    volatility_impact: int
    market_value: str
    performance: str


class AuditRecommendation(BaseModel):
    current_holding: str
    suggested_holding: str
    expected_benefit: str
    reason: str


class AuditorResponse(BaseModel):
    diversification_score: int
    annualized_risk_trend: list[int]
    recommendation: AuditRecommendation
    holdings: list[AuditHolding]


class CommandSignal(BaseModel):
    priority: str
    title: str
    asset: str
    target: str
    reasoning: str
    action: str


class CommandCenterResponse(BaseModel):
    headlines: list[str]
    signals: list[CommandSignal]
    execution_summary: dict[str, str]


class QuoteSnapshot(BaseModel):
    symbol: str
    company_name: str
    industry: str | None = None
    last_price: float
    change: float
    percent_change: float
    previous_close: float
    open_price: float | None = None
    day_high: float | None = None
    day_low: float | None = None
    year_high: float | None = None
    year_low: float | None = None
    last_updated: str
    source: str


class MarketQuoteResponse(BaseModel):
    source: str
    as_of: str
    quotes: list[QuoteSnapshot]


class MarketSnapshotResponse(BaseModel):
    source: str
    generated_at: str
    tracked_symbols: list[str]
    quotes: list[QuoteSnapshot]
    refresh_interval_seconds: int


class IndexSnapshot(BaseModel):
    index: str
    last: float
    change: float
    percent_change: float
    advances: int | None = None
    declines: int | None = None
    previous_day: str | None = None
    source: str


class MarketIndicesResponse(BaseModel):
    source: str
    as_of: str
    indices: list[IndexSnapshot]


class MarketStatusItem(BaseModel):
    market: str
    status: str
    trade_date: str
    index: str | None = None
    last: float | None = None
    variation: float | None = None
    percent_change: float | None = None
    message: str


class MarketStatusResponse(BaseModel):
    source: str
    market_state: list[MarketStatusItem]
