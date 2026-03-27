from typing import Literal

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: Literal["ok"]
    service: str
    environment: str


class AnalyzeRequest(BaseModel):
    query: str = Field(min_length=1)
    symbols: list[str] = Field(default_factory=list)
    portfolio: dict[str, float] = Field(default_factory=dict)
    context: dict[str, object] = Field(default_factory=dict)


class AnalyzeResponse(BaseModel):
    status: Literal["accepted", "completed"]
    workflow: str
    webhook_url: str
    result: dict[str, object]


class AlertsNewsResponse(BaseModel):
    workflow: str
    generated_at: str
    focus_alert: str | None = None
    summary: str
    highlights: list[str]
    actions: list[str]
    raw_result: dict[str, object]


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
    details_path: str | None = None
    notes: list[str]


class BatchUploadPortfolioResponse(BaseModel):
    accepted: bool
    files_processed: int
    filenames: list[str]
    holdings_detected: int
    symbols: list[str]
    persistence_path: str
    details_path: str | None = None
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


class StrategyWhatIfRequest(BaseModel):
    question: str = Field(min_length=1)
    monthly_surplus: float = Field(gt=0)
    risk_mode: Literal["conservative", "balanced", "aggressive"] = "balanced"
    expense: float = Field(default=0, ge=0)
    pause_months: int = Field(default=0, ge=0, le=24)
    goal_name: str = Field(min_length=1)
    goal_target_amount: float = Field(default=0, ge=0)
    goal_target_year: int = Field(ge=2024)


class StrategyWhatIfResponse(BaseModel):
    answer: str
    summary: str
    delay_months: int
    monthly_boost_suggestion: float
    projected_goal_month: str
    confidence_note: str


class Recommendation(BaseModel):
    symbol: str
    category: str
    last_price: float
    percent_change: float
    last_updated: str
    thesis: str
    action: str
    why_recommended_now: str | None = None
    why_invest: str | None = None
    ai_summary: str | None = None
    why_ai_likes_it: list[str] = Field(default_factory=list)
    goal_name: str | None = None
    months_accelerated: int = 0
    recommended_investment: str | None = None
    estimated_brokerage: str | None = None
    estimated_exit_fee: str | None = None
    net_goal_impact: str | None = None
    risk_flag: str | None = None


class MarketEngineResponse(BaseModel):
    sentiment: str
    summary: str
    why_ai_is_used: list[str] = Field(default_factory=list)
    recommendations: list[Recommendation]
    recommended_etfs: list[Recommendation] = Field(default_factory=list)
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
    average_buy_price: str | None = None
    current_price: str | None = None
    break_even_price: str | None = None
    unrealized_profit: str | None = None
    estimated_brokerage: str | None = None
    safe_to_sell: bool = False
    sell_signal: str = "No data available"


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


class RebalancerRatio(BaseModel):
    name: str
    value: str
    meaning: str
    impact: str
    suggested_action: str


class RebalancerMove(BaseModel):
    title: str
    why: str
    expected_effect: str


class RebalancerResponse(BaseModel):
    summary: str
    current_mix: dict[str, int]
    target_mix: dict[str, int]
    ratios: list[RebalancerRatio]
    suggested_moves: list[RebalancerMove]


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
