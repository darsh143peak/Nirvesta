from fastapi import APIRouter, File, UploadFile

from .config import get_settings
from .models import (
    AuditorResponse,
    CommandCenterResponse,
    ConciergeMessageRequest,
    ConciergeMessageResponse,
    ConnectSessionRequest,
    ConnectSessionResponse,
    HealthResponse,
    MarketEngineResponse,
    OverviewResponse,
    SentinelResponse,
    StrategySimulationRequest,
    StrategySimulationResponse,
    UploadPortfolioResponse,
)
from .services import (
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

router = APIRouter()
settings = get_settings()


@router.get("/health", response_model=HealthResponse)
def healthcheck() -> HealthResponse:
    return HealthResponse(status="ok", service="nirvesta-api", environment=settings.env)


@router.get("/overview", response_model=OverviewResponse)
def overview() -> OverviewResponse:
    return get_overview()


@router.post("/connect/sessions", response_model=ConnectSessionResponse)
def connect_session(payload: ConnectSessionRequest) -> ConnectSessionResponse:
    return create_connect_session(payload)


@router.post("/connect/uploads", response_model=UploadPortfolioResponse)
async def upload_portfolio(file: UploadFile = File(...)) -> UploadPortfolioResponse:
    return analyze_uploaded_portfolio(file.filename or "portfolio.csv", file.file)


@router.post("/concierge/respond", response_model=ConciergeMessageResponse)
def concierge_respond(payload: ConciergeMessageRequest) -> ConciergeMessageResponse:
    return respond_to_concierge(payload)


@router.post("/strategy/simulate", response_model=StrategySimulationResponse)
def strategy_simulate(payload: StrategySimulationRequest) -> StrategySimulationResponse:
    return simulate_strategy(payload)


@router.get("/market-engine/recommendations", response_model=MarketEngineResponse)
def market_recommendations() -> MarketEngineResponse:
    return get_market_recommendations()


@router.get("/sentinel/alerts", response_model=SentinelResponse)
def sentinel_alerts() -> SentinelResponse:
    return get_sentinel_alerts()


@router.get("/auditor/report", response_model=AuditorResponse)
def auditor_report() -> AuditorResponse:
    return get_auditor_report()


@router.get("/command-center/briefing", response_model=CommandCenterResponse)
def command_center_briefing() -> CommandCenterResponse:
    return get_command_center_briefing()
