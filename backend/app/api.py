from fastapi import APIRouter, File, HTTPException, Query, UploadFile

from .config import get_settings
from .models import (
    AnalyzeRequest,
    AnalyzeResponse,
    AlertsNewsResponse,
    AuditorResponse,
    BatchUploadPortfolioResponse,
    CommandCenterResponse,
    ConciergeMessageRequest,
    ConciergeMessageResponse,
    ConnectSessionRequest,
    ConnectSessionResponse,
    HealthResponse,
    MarketIndicesResponse,
    MarketEngineResponse,
    MarketQuoteResponse,
    MarketSnapshotResponse,
    MarketStatusResponse,
    OverviewResponse,
    SentinelResponse,
    StrategySimulationRequest,
    StrategySimulationResponse,
    UploadPortfolioResponse,
)
from .services import (
    analyze_with_master_flow,
    analyze_uploaded_portfolio,
    analyze_uploaded_portfolios,
    create_connect_session,
    get_alerts_news_brief,
    get_auditor_report,
    get_command_center_briefing,
    get_market_indices,
    get_market_quotes,
    get_market_recommendations,
    get_market_snapshot,
    get_market_status,
    get_overview,
    get_sentinel_alerts,
    respond_to_concierge,
    simulate_strategy,
)

router = APIRouter()
public_router = APIRouter()
settings = get_settings()


@router.get("/health", response_model=HealthResponse)
def healthcheck() -> HealthResponse:
    return HealthResponse(status="ok", service="nirvesta-api", environment=settings.env)


@public_router.post("/api/analyze", response_model=AnalyzeResponse)
def analyze(payload: AnalyzeRequest) -> AnalyzeResponse:
    try:
        return analyze_with_master_flow(payload)
    except ValueError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except OSError as exc:
        raise HTTPException(status_code=502, detail=f"Unable to reach n8n master_flow webhook: {exc}") from exc


@router.get("/overview", response_model=OverviewResponse)
def overview() -> OverviewResponse:
    return get_overview()


@router.get("/market/quotes", response_model=MarketQuoteResponse)
def market_quotes(symbols: str | None = Query(default=None, description="Comma-separated NSE symbols")) -> MarketQuoteResponse:
    parsed_symbols = [symbol.strip().upper() for symbol in symbols.split(",") if symbol.strip()] if symbols else None
    return get_market_quotes(parsed_symbols)


@router.get("/market/indices", response_model=MarketIndicesResponse)
def market_indices(index_names: str | None = Query(default=None, description="Comma-separated NSE index names")) -> MarketIndicesResponse:
    parsed_index_names = [index_name.strip() for index_name in index_names.split(",") if index_name.strip()] if index_names else None
    return get_market_indices(parsed_index_names)


@router.get("/market/status", response_model=MarketStatusResponse)
def market_status() -> MarketStatusResponse:
    return get_market_status()


@router.get("/market/snapshot", response_model=MarketSnapshotResponse)
def market_snapshot() -> MarketSnapshotResponse:
    return get_market_snapshot()


@router.post("/connect/sessions", response_model=ConnectSessionResponse)
def connect_session(payload: ConnectSessionRequest) -> ConnectSessionResponse:
    return create_connect_session(payload)


@router.post("/connect/uploads", response_model=UploadPortfolioResponse)
async def upload_portfolio(file: UploadFile = File(...)) -> UploadPortfolioResponse:
    try:
        return analyze_uploaded_portfolio(file.filename or "portfolio.csv", file.file)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/connect/uploads/batch", response_model=BatchUploadPortfolioResponse)
async def upload_portfolios(files: list[UploadFile] = File(...)) -> BatchUploadPortfolioResponse:
    try:
        return analyze_uploaded_portfolios([(file.filename or "portfolio.csv", file.file) for file in files])
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


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


@router.get("/alerts/news", response_model=AlertsNewsResponse)
def alerts_news(focus_alert: str | None = Query(default=None, description="Optional alert headline to focus the AI briefing")) -> AlertsNewsResponse:
    return get_alerts_news_brief(focus_alert)


@router.get("/auditor/report", response_model=AuditorResponse)
def auditor_report() -> AuditorResponse:
    return get_auditor_report()


@router.get("/command-center/briefing", response_model=CommandCenterResponse)
def command_center_briefing() -> CommandCenterResponse:
    return get_command_center_briefing()
