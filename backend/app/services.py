from __future__ import annotations

import csv
import logging
import json
from dataclasses import dataclass
from datetime import UTC, datetime
from io import StringIO
from pathlib import Path
from time import time
from typing import Any, BinaryIO
from urllib.parse import quote
from urllib.request import Request, urlopen
from uuid import uuid4

from .config import get_settings
from .models import (
    AlertItem,
    AuditHolding,
    AuditRecommendation,
    AuditorResponse,
    BatchUploadPortfolioResponse,
    CommandCenterResponse,
    CommandSignal,
    ConciergeMessageRequest,
    ConciergeMessageResponse,
    ConciergeOption,
    ConnectSessionRequest,
    ConnectSessionResponse,
    IndexSnapshot,
    MarketEngineResponse,
    MarketIndicesResponse,
    MarketQuoteResponse,
    MarketSnapshotResponse,
    MarketStatusItem,
    MarketStatusResponse,
    OverviewResponse,
    OverviewStat,
    QuoteSnapshot,
    Recommendation,
    SentinelResponse,
    StrategyMilestone,
    StrategySimulationRequest,
    StrategySimulationResponse,
    UploadPortfolioResponse,
)

settings = get_settings()
_CACHE: dict[str, tuple[float, Any]] = {}
_NSE_SOURCE = "NSE India public market endpoints"
_DATA_DIR = Path(__file__).resolve().parent.parent / "data"
_PORTFOLIO_FILE = _DATA_DIR / "portfolio_holdings.json"
_MARKET_SNAPSHOT_FILE = _DATA_DIR / "market_snapshot.json"
logger = logging.getLogger(__name__)


@dataclass
class PortfolioPosition:
    symbol: str
    quantity: float
    quote: QuoteSnapshot

    @property
    def market_value(self) -> float:
        return self.quantity * self.quote.last_price

    @property
    def day_change_value(self) -> float:
        return self.quantity * self.quote.change

    @property
    def volatility_proxy(self) -> float:
        if not self.quote.year_high or not self.quote.year_low or not self.quote.last_price:
            return 0.0
        return ((self.quote.year_high - self.quote.year_low) / self.quote.last_price) * 100


def get_overview() -> OverviewResponse:
    positions = _get_portfolio_positions()
    if not positions:
        return OverviewResponse(
            total_portfolio_value="No data available",
            monthly_surplus="No data available",
            risk_profile="No data available",
            stats=[
                OverviewStat(label="Day P&L", value="No data available", tone="neutral"),
                OverviewStat(label="NIFTY 50", value="No data available", tone="neutral"),
                OverviewStat(label="Market State", value="No data available", tone="neutral"),
                OverviewStat(label="Watch Alerts", value="No data available", tone="neutral"),
            ],
        )

    total_value = sum(position.market_value for position in positions)
    total_day_change = sum(position.day_change_value for position in positions)
    market_status = get_market_status()
    breadth = _get_index_by_name("NIFTY 50")
    down_alerts = sum(1 for position in positions if position.quote.percent_change <= -1.5)

    largest_weight = max((position.market_value / total_value for position in positions), default=0)
    if largest_weight > 0.3:
        risk_profile = "Moderately Concentrated NSE Basket"
    elif largest_weight > 0.2:
        risk_profile = "Balanced Growth Basket"
    else:
        risk_profile = "Diversified NSE Basket"

    capital_market = next((item for item in market_status.market_state if item.market == "Capital Market"), None)
    market_label = capital_market.status if capital_market else "Unknown"

    return OverviewResponse(
        total_portfolio_value=_format_inr(total_value),
        monthly_surplus="INR 4,500",
        risk_profile=risk_profile,
        stats=[
            OverviewStat(
                label="Day P&L",
                value=f"{total_day_change:+,.2f} INR",
                tone="positive" if total_day_change >= 0 else "negative",
            ),
            OverviewStat(
                label="NIFTY 50",
                value=f"{breadth.last:,.2f} ({breadth.percent_change:+.2f}%)",
                tone="positive" if breadth.percent_change >= 0 else "negative",
            ),
            OverviewStat(
                label="Market State",
                value=market_label,
                tone="warning" if market_label.lower() != "open" else "neutral",
            ),
            OverviewStat(
                label="Watch Alerts",
                value=f"{down_alerts} movers below -1.5%",
                tone="warning" if down_alerts else "neutral",
            ),
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
    if detected_format == "pdf":
        return UploadPortfolioResponse(
            filename=filename,
            accepted=False,
            detected_format=detected_format,
            holdings_detected=0,
            symbols=[],
            persistence_path=str(_PORTFOLIO_FILE),
            notes=[
                "PDF upload is accepted by the endpoint, but automatic holdings replacement currently supports CSV text only.",
                "Use the sample CSV format in backend/data/mock_portfolio_upload.csv to replace the live basket.",
            ],
        )

    decoded = raw.decode("utf-8-sig", errors="ignore")
    holdings = _parse_portfolio_csv(decoded)
    _save_uploaded_holdings(holdings)
    _CACHE.clear()

    return UploadPortfolioResponse(
        filename=filename,
        accepted=bool(holdings),
        detected_format=detected_format,
        holdings_detected=len(holdings),
        symbols=sorted(holdings.keys()),
        persistence_path=str(_PORTFOLIO_FILE),
        notes=[
            "Uploaded CSV holdings have replaced the default configured basket.",
            "All portfolio-derived endpoints now read from the persisted holdings file until you upload a new CSV.",
        ],
    )


def analyze_uploaded_portfolios(files: list[tuple[str, BinaryIO]]) -> BatchUploadPortfolioResponse:
    merged_holdings: dict[str, float] = {}
    filenames: list[str] = []

    for filename, file_obj in files:
        raw = file_obj.read()
        lowered_name = filename.lower()
        if lowered_name.endswith(".pdf"):
            raise ValueError("Batch replacement currently supports CSV files only.")

        decoded = raw.decode("utf-8-sig", errors="ignore")
        holdings = _parse_portfolio_csv(decoded)
        filenames.append(filename)
        for symbol, quantity in holdings.items():
            merged_holdings[symbol] = merged_holdings.get(symbol, 0.0) + quantity

    _save_uploaded_holdings(merged_holdings)
    _CACHE.clear()

    return BatchUploadPortfolioResponse(
        accepted=bool(merged_holdings),
        files_processed=len(filenames),
        filenames=filenames,
        holdings_detected=len(merged_holdings),
        symbols=sorted(merged_holdings.keys()),
        persistence_path=str(_PORTFOLIO_FILE),
        notes=[
            "Uploaded CSV files were merged by symbol and now replace the active portfolio basket.",
            "If the same symbol appeared in multiple files, quantities were summed before persistence.",
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
    breadth = _get_index_by_name("NIFTY 50")
    bullish_market = breadth.percent_change >= 0

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
    wealth_multiplier = 2500 if payload.risk_mode == "aggressive" else 1900
    wealth_value = payload.monthly_surplus * wealth_multiplier
    if not bullish_market:
        wealth_value *= 0.95

    summary = (
        f"Using a {payload.risk_mode} plan against a NIFTY 50 move of {breadth.percent_change:+.2f}%, "
        "the engine allocates your surplus across four sleeves."
    )

    if payload.event:
        retirement_age += 1 if payload.event.amount > 1_000_000 else 0
        wealth_value -= payload.event.amount * 0.15
        summary += (
            f" The event '{payload.event.label}' temporarily slows milestone velocity because it absorbs "
            f"{payload.event.amount:,.0f} of deployable capital."
        )

    return StrategySimulationResponse(
        recommended_split=base_split,
        projected_retirement_age=retirement_age,
        wealth_at_fifty=_format_inr(max(wealth_value, 0)),
        risk_sensitivity="Medium-High" if payload.risk_mode != "conservative" else "Moderate",
        milestones=[
            StrategyMilestone(title="Marriage Fund", target_year=2026, target_amount="INR 45,00,000", status="on_track"),
            StrategyMilestone(title="Coastal Residence", target_year=2030, target_amount="INR 2,80,00,000", status="building"),
            StrategyMilestone(title="Freedom Ledger", target_year=2045, target_amount="INR 42,00,00,000", status="seeded"),
        ],
        summary=summary,
    )


def get_market_recommendations() -> MarketEngineResponse:
    tracked_quotes = get_market_quotes().quotes
    indices = get_market_indices(["NIFTY 50", "NIFTY BANK", "NIFTY IT"]).indices
    nifty = next(index for index in indices if index.index == "NIFTY 50")
    if not tracked_quotes:
        return MarketEngineResponse(sentiment="No data available", recommendations=[], projected_acceleration=[])

    top_candidates = sorted(tracked_quotes, key=lambda item: item.percent_change, reverse=True)[: min(3, len(tracked_quotes))]

    return MarketEngineResponse(
        sentiment=f"NIFTY 50 {nifty.percent_change:+.2f}%",
        recommendations=[
            _quote_to_recommendation(quote, _category_for_quote(quote), "review_position")
            for quote in top_candidates
        ],
        projected_acceleration=[
            OverviewStat(
                label=index.index,
                value=f"{index.percent_change:+.2f}%",
                tone="positive" if index.percent_change >= 0 else "negative",
            )
            for index in indices
        ],
    )


def get_sentinel_alerts() -> SentinelResponse:
    positions = sorted(_get_portfolio_positions(), key=lambda position: position.quote.percent_change)
    if not positions:
        return SentinelResponse(
            vulnerability_score=0,
            aggregate_impact="No data available",
            auto_mitigation_ready=False,
            alerts=[],
        )

    total_value = sum(position.market_value for position in positions) or 1
    aggregate_percent = (sum(position.day_change_value for position in positions) / total_value) * 100
    largest_weight = max((position.market_value / total_value for position in positions), default=0)
    worst_move = abs(positions[0].quote.percent_change) if positions else 0
    vulnerability_score = min(99, round((largest_weight * 55) + worst_move * 6))

    alerts = [
        AlertItem(
            timestamp_utc=position.quote.last_updated,
            headline=(
                f"{position.quote.company_name} ({position.symbol}) moved "
                f"{position.quote.percent_change:+.2f}% and now sits at INR {position.quote.last_price:,.2f}."
            ),
            impact=f"{position.quote.percent_change:+.2f}%",
            severity=_severity_from_percent(position.quote.percent_change),
            action="rebalance_now" if position.quote.percent_change < -1 else "monitor",
        )
        for position in positions[:3]
    ]

    return SentinelResponse(
        vulnerability_score=vulnerability_score,
        aggregate_impact=f"{aggregate_percent:+.2f}% ({_format_inr(sum(position.day_change_value for position in positions))})",
        auto_mitigation_ready=True,
        alerts=alerts,
    )


def get_auditor_report() -> AuditorResponse:
    positions = sorted(_get_portfolio_positions(), key=lambda position: position.market_value, reverse=True)
    if not positions:
        return AuditorResponse(
            diversification_score=0,
            annualized_risk_trend=[],
            recommendation=AuditRecommendation(
                current_holding="No data available",
                suggested_holding="No data available",
                expected_benefit="No data available",
                reason="Upload a portfolio CSV to generate live audit recommendations.",
            ),
            holdings=[],
        )

    total_value = sum(position.market_value for position in positions) or 1
    weights = [position.market_value / total_value for position in positions]
    concentration = sum(weight * weight for weight in weights)
    diversification_score = max(1, min(100, round((1 - concentration) * 130)))

    most_volatile = max(positions, key=lambda position: position.volatility_proxy)
    holdings = [
        AuditHolding(
            symbol=position.symbol,
            name=position.quote.company_name,
            badge=_audit_badge(position),
            volatility_impact=min(99, round(position.volatility_proxy)),
            market_value=_format_inr(position.market_value),
            performance=f"{position.quote.percent_change:+.2f}%",
        )
        for position in positions[:6]
    ]

    return AuditorResponse(
        diversification_score=diversification_score,
        annualized_risk_trend=[min(100, round(position.volatility_proxy)) for position in positions[:6]],
        recommendation=AuditRecommendation(
            current_holding=most_volatile.symbol,
            suggested_holding="NIFTYBEES" if most_volatile.symbol != "NIFTYBEES" else "GOLDBEES",
            expected_benefit="Lower concentration and smoother benchmark-like participation",
            reason=(
                f"{most_volatile.symbol} currently shows the widest 52-week price band in your configured basket, "
                "so trimming it reduces concentration risk without exiting the market."
            ),
        ),
        holdings=holdings,
    )


def get_command_center_briefing() -> CommandCenterResponse:
    indices = get_market_indices(["NIFTY 50", "NIFTY BANK", "NIFTY IT", "NIFTY AUTO"]).indices
    positions = sorted(_get_portfolio_positions(), key=lambda position: position.quote.percent_change)
    if not positions:
        return CommandCenterResponse(
            headlines=[f"{index.index} {index.percent_change:+.2f}% at {index.last:,.2f}" for index in indices[:3]],
            signals=[],
            execution_summary={
                "market_status": get_market_status().market_state[0].status if get_market_status().market_state else "No data available",
                "watchlist_leader": "No data available",
                "watchlist_laggard": "No data available",
            },
        )

    best = max(positions, key=lambda position: position.quote.percent_change)
    worst = min(positions, key=lambda position: position.quote.percent_change)

    return CommandCenterResponse(
        headlines=[
            f"{index.index} {index.percent_change:+.2f}% at {index.last:,.2f}" for index in indices[:3]
        ],
        signals=[
            CommandSignal(
                priority="high" if worst.quote.percent_change < -1 else "medium",
                title=f"{worst.symbol} is the weakest holding today",
                asset=worst.symbol,
                target="Reduce concentration risk",
                reasoning=(
                    f"{worst.quote.company_name} is down {worst.quote.percent_change:+.2f}% versus the basket, "
                    "which makes it the clearest rebalance candidate."
                ),
                action="rebalance_portfolio_now",
            ),
            CommandSignal(
                priority="medium",
                title=f"{best.symbol} is leading your watchlist",
                asset=best.symbol,
                target="Review profit-lock or SIP continuation",
                reasoning=(
                    f"{best.quote.company_name} is trading at INR {best.quote.last_price:,.2f}, "
                    f"up {best.quote.percent_change:+.2f}% on the day."
                ),
                action="analyze_exposure",
            ),
        ],
        execution_summary={
            "market_status": get_market_status().market_state[0].status,
            "watchlist_leader": f"{best.symbol} {best.quote.percent_change:+.2f}%",
            "watchlist_laggard": f"{worst.symbol} {worst.quote.percent_change:+.2f}%",
        },
    )


def get_market_quotes(symbols: list[str] | None = None) -> MarketQuoteResponse:
    requested_symbols = symbols or get_tracked_symbols()
    quotes = [get_market_quote(symbol) for symbol in requested_symbols]
    as_of = max((quote.last_updated for quote in quotes), default=_iso_now())
    return MarketQuoteResponse(source=_NSE_SOURCE, as_of=as_of, quotes=quotes)


def get_market_snapshot() -> MarketSnapshotResponse:
    snapshot = _load_market_snapshot()
    if snapshot is not None:
        return snapshot
    return refresh_market_snapshot()


def refresh_market_snapshot(symbols: list[str] | None = None) -> MarketSnapshotResponse:
    tracked_symbols = symbols or get_tracked_symbols()
    quotes = [get_market_quote(symbol) for symbol in tracked_symbols]
    snapshot = MarketSnapshotResponse(
        source=_NSE_SOURCE,
        generated_at=_iso_now(),
        tracked_symbols=tracked_symbols,
        quotes=quotes,
        refresh_interval_seconds=settings.market_refresh_interval_seconds,
    )
    _save_market_snapshot(snapshot)
    logger.info("Refreshed tracked market snapshot for %s symbols", len(tracked_symbols))
    return snapshot


def get_tracked_symbols() -> list[str]:
    symbols = set(settings.market_symbols)
    symbols.update(_load_portfolio_holdings().keys())
    return sorted(symbols)


def get_market_quote(symbol: str) -> QuoteSnapshot:
    normalized_symbol = symbol.strip().upper()
    cache_key = f"quote:{normalized_symbol}"
    cached = _get_cached(cache_key)
    if cached is not None:
        return cached

    payload = _fetch_json(f"{settings.nse_base_url}/quote-equity?symbol={quote(normalized_symbol)}", cache_key)
    quote_snapshot = QuoteSnapshot(
        symbol=normalized_symbol,
        company_name=payload["info"]["companyName"],
        industry=payload["info"].get("industry"),
        last_price=float(payload["priceInfo"]["lastPrice"]),
        change=float(payload["priceInfo"]["change"]),
        percent_change=float(payload["priceInfo"]["pChange"]),
        previous_close=float(payload["priceInfo"]["previousClose"]),
        open_price=_maybe_float(payload["priceInfo"].get("open")),
        day_high=_maybe_float(payload["priceInfo"].get("intraDayHighLow", {}).get("max")),
        day_low=_maybe_float(payload["priceInfo"].get("intraDayHighLow", {}).get("min")),
        year_high=_maybe_float(payload["priceInfo"].get("weekHighLow", {}).get("max")),
        year_low=_maybe_float(payload["priceInfo"].get("weekHighLow", {}).get("min")),
        last_updated=payload.get("metadata", {}).get("lastUpdateTime", _iso_now()),
        source=_NSE_SOURCE,
    )
    _set_cached(cache_key, quote_snapshot)
    return quote_snapshot


def get_market_indices(index_names: list[str] | None = None) -> MarketIndicesResponse:
    cache_key = "indices:all"
    payload = _get_cached(cache_key)
    if payload is None:
        payload = _fetch_json(f"{settings.nse_base_url}/allIndices", cache_key)
        _set_cached(cache_key, payload)

    index_rows = payload["data"]
    if index_names:
        wanted = {name.upper() for name in index_names}
        index_rows = [row for row in index_rows if row["index"].upper() in wanted]

    indices = [
        IndexSnapshot(
            index=row["index"],
            last=float(row["last"]),
            change=float(row["variation"]),
            percent_change=float(row["percentChange"]),
            advances=_maybe_int(row.get("advances")),
            declines=_maybe_int(row.get("declines")),
            previous_day=row.get("previousDay"),
            source=_NSE_SOURCE,
        )
        for row in index_rows
    ]
    return MarketIndicesResponse(source=_NSE_SOURCE, as_of=payload.get("timestamp", _iso_now()), indices=indices)


def get_market_status() -> MarketStatusResponse:
    cache_key = "market-status"
    payload = _get_cached(cache_key)
    if payload is None:
        payload = _fetch_json(f"{settings.nse_base_url}/marketStatus", cache_key)
        _set_cached(cache_key, payload)

    return MarketStatusResponse(
        source=_NSE_SOURCE,
        market_state=[
            MarketStatusItem(
                market=row["market"],
                status=row["marketStatus"],
                trade_date=row["tradeDate"],
                index=row.get("index") or None,
                last=_maybe_float(row.get("last")),
                variation=_maybe_float(row.get("variation")),
                percent_change=_maybe_float(row.get("percentChange")),
                message=row.get("marketStatusMessage", ""),
            )
            for row in payload.get("marketState", [])
        ],
    )


def _get_portfolio_positions() -> list[PortfolioPosition]:
    positions: list[PortfolioPosition] = []
    for symbol, quantity in _load_portfolio_holdings().items():
        positions.append(PortfolioPosition(symbol=symbol, quantity=quantity, quote=get_market_quote(symbol)))
    return positions


def _load_portfolio_holdings() -> dict[str, float]:
    if _PORTFOLIO_FILE.exists():
        payload = json.loads(_PORTFOLIO_FILE.read_text(encoding="utf-8"))
        return {symbol.upper(): float(quantity) for symbol, quantity in payload.items()}
    return settings.portfolio_holdings


def _load_market_snapshot() -> MarketSnapshotResponse | None:
    if not _MARKET_SNAPSHOT_FILE.exists():
        return None
    payload = json.loads(_MARKET_SNAPSHOT_FILE.read_text(encoding="utf-8"))
    return MarketSnapshotResponse.model_validate(payload)


def _save_market_snapshot(snapshot: MarketSnapshotResponse) -> None:
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    _MARKET_SNAPSHOT_FILE.write_text(snapshot.model_dump_json(indent=2), encoding="utf-8")


def _save_uploaded_holdings(holdings: dict[str, float]) -> None:
    if not holdings:
        raise ValueError("No valid holdings were found in the uploaded CSV.")
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    _PORTFOLIO_FILE.write_text(json.dumps(holdings, indent=2, sort_keys=True), encoding="utf-8")


def _parse_portfolio_csv(content: str) -> dict[str, float]:
    reader = csv.DictReader(StringIO(content))
    if not reader.fieldnames:
        raise ValueError("CSV is missing a header row.")

    field_map = {field.strip().lower(): field for field in reader.fieldnames if field}
    symbol_field = next((field_map[name] for name in ("symbol", "ticker", "security", "instrument") if name in field_map), None)
    quantity_field = next((field_map[name] for name in ("quantity", "qty", "units", "shares") if name in field_map), None)

    if not symbol_field or not quantity_field:
        raise ValueError("CSV must include symbol and quantity columns.")

    holdings: dict[str, float] = {}
    for row in reader:
        raw_symbol = (row.get(symbol_field) or "").strip().upper()
        raw_quantity = (row.get(quantity_field) or "").strip()
        if not raw_symbol or not raw_quantity:
            continue
        quantity = float(raw_quantity.replace(",", ""))
        if quantity <= 0:
            continue
        holdings[raw_symbol] = holdings.get(raw_symbol, 0.0) + quantity

    if not holdings:
        raise ValueError("CSV did not contain any valid positive-quantity holdings.")
    return holdings


def _quote_to_recommendation(quote: QuoteSnapshot, category: str, action: str) -> Recommendation:
    return Recommendation(
        symbol=quote.symbol,
        category=category,
        last_price=quote.last_price,
        percent_change=quote.percent_change,
        last_updated=quote.last_updated,
        thesis=(
            f"{quote.company_name} is trading at INR {quote.last_price:,.2f} "
            f"with a day move of {quote.percent_change:+.2f}%."
        ),
        action=action,
    )


def _category_for_quote(quote: QuoteSnapshot) -> str:
    name = quote.company_name.upper()
    if "ETF" in name or "BEES" in quote.symbol:
        return "ETF"
    if quote.industry:
        return quote.industry
    return "Equity"


def _get_index_by_name(name: str) -> IndexSnapshot:
    indices = get_market_indices([name]).indices
    if not indices:
        raise RuntimeError(f"Index '{name}' was not returned by NSE")
    return indices[0]


def _severity_from_percent(percent_change: float) -> str:
    if percent_change <= -3:
        return "critical"
    if percent_change <= -1.5:
        return "high"
    if percent_change < 0:
        return "medium"
    return "low"


def _audit_badge(position: PortfolioPosition) -> str:
    if position.volatility_proxy >= 35:
        return "High Range"
    if position.quote.percent_change >= 1:
        return "Momentum Leader"
    return "Core Holding"


def _fetch_json(url: str, cache_key: str) -> Any:
    request = Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0",
            "Accept": "application/json",
            "Referer": settings.nse_referer,
        },
    )
    with urlopen(request, timeout=20) as response:
        payload = json.loads(response.read().decode("utf-8"))
    _set_cached(cache_key, payload)
    return payload


def _get_cached(key: str) -> Any | None:
    entry = _CACHE.get(key)
    if not entry:
        return None
    expires_at, value = entry
    if expires_at < time():
        _CACHE.pop(key, None)
        return None
    return value


def _set_cached(key: str, value: Any) -> None:
    _CACHE[key] = (time() + settings.market_cache_ttl_seconds, value)


def _maybe_float(value: Any) -> float | None:
    if value in (None, "", "-"):
        return None
    return float(value)


def _maybe_int(value: Any) -> int | None:
    if value in (None, "", "-"):
        return None
    return int(value)


def _format_inr(value: float) -> str:
    return f"INR {value:,.2f}"


def _iso_now() -> str:
    return datetime.now(tz=UTC).isoformat()
