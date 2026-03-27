from __future__ import annotations

import csv
import logging
import json
import re
from dataclasses import dataclass
from datetime import UTC, datetime
from io import StringIO
from math import ceil, log
from pathlib import Path
from time import time
from typing import Any, BinaryIO
from urllib.parse import quote
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from uuid import uuid4

from .config import get_settings
from .models import (
    AlertItem,
    AnalyzeRequest,
    AnalyzeResponse,
    AlertsNewsResponse,
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
    RebalancerMove,
    RebalancerRatio,
    RebalancerResponse,
    SentinelResponse,
    StrategyMilestone,
    StrategySimulationRequest,
    StrategySimulationResponse,
    StrategyWhatIfRequest,
    StrategyWhatIfResponse,
    UploadPortfolioResponse,
)

settings = get_settings()
_CACHE: dict[str, tuple[float, Any]] = {}
_NSE_SOURCE = "NSE India public market endpoints"
_DATA_DIR = Path(__file__).resolve().parent.parent / "data"
_PORTFOLIO_FILE = _DATA_DIR / "portfolio_holdings.json"
_PORTFOLIO_DETAILS_FILE = _DATA_DIR / "portfolio_details.json"
_MARKET_SNAPSHOT_FILE = _DATA_DIR / "market_snapshot.json"
logger = logging.getLogger(__name__)


@dataclass
class PortfolioPosition:
    symbol: str
    quantity: float
    quote: QuoteSnapshot
    average_buy_price: float | None = None
    broker: str | None = None

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

    @property
    def invested_value(self) -> float | None:
        if self.average_buy_price is None:
            return None
        return self.quantity * self.average_buy_price

    @property
    def estimated_brokerage(self) -> float | None:
        invested_value = self.invested_value
        if invested_value is None:
            return None
        sell_value = self.market_value
        turnover = invested_value + sell_value
        return turnover * settings.estimated_brokerage_rate

    @property
    def unrealized_profit(self) -> float | None:
        invested_value = self.invested_value
        if invested_value is None:
            return None
        return self.market_value - invested_value

    @property
    def break_even_price(self) -> float | None:
        if self.average_buy_price is None:
            return None
        return self.average_buy_price * (1 + settings.estimated_brokerage_rate)

    @property
    def safe_to_sell(self) -> bool:
        if self.unrealized_profit is None or self.estimated_brokerage is None:
            return False
        return self.unrealized_profit > self.estimated_brokerage


@dataclass
class PortfolioUploadRecord:
    symbol: str
    quantity: float
    average_price: float | None = None
    company_name: str | None = None
    broker: str | None = None


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


def analyze_with_master_flow(payload: AnalyzeRequest) -> AnalyzeResponse:
    webhook_url = settings.n8n_master_flow_webhook_url
    if not webhook_url:
        raise ValueError("NIRVESTA_N8N_MASTER_FLOW_WEBHOOK_URL is not configured.")

    normalized_portfolio = {
        symbol.strip().upper(): float(quantity)
        for symbol, quantity in payload.portfolio.items()
        if symbol.strip()
    } or _load_portfolio_holdings()
    normalized_symbols = [symbol.strip().upper() for symbol in payload.symbols if symbol.strip()] or sorted(normalized_portfolio.keys())
    request_payload = {
        "query": payload.query,
        "symbols": normalized_symbols,
        "portfolio": normalized_portfolio,
        "context": payload.context,
        "requested_at": _iso_now(),
    }
    response_payload = _post_json(webhook_url, request_payload)

    return AnalyzeResponse(
        status="completed",
        workflow="master_flow",
        webhook_url=webhook_url,
        result=response_payload if isinstance(response_payload, dict) else {"data": response_payload},
    )


def get_alerts_news_brief(focus_alert: str | None = None) -> AlertsNewsResponse:
    sentinel = get_sentinel_alerts()
    symbols = list(_load_portfolio_holdings().keys())
    default_focus = sentinel.alerts[0].headline if sentinel.alerts else None
    selected_focus = focus_alert or default_focus

    fallback_highlights = [alert.headline for alert in sentinel.alerts[:3]]
    fallback_actions = [alert.action.replace("_", " ").title() for alert in sentinel.alerts[:3] if alert.action]
    fallback_summary = (
        f"Nirvesta Sentinel is monitoring {len(sentinel.alerts)} live alert(s) with aggregate impact "
        f"{sentinel.aggregate_impact} and vulnerability score {sentinel.vulnerability_score}."
    )

    if not settings.n8n_master_flow_webhook_url:
        return AlertsNewsResponse(
            workflow="local_fallback",
            generated_at=_iso_now(),
            focus_alert=selected_focus,
            summary=fallback_summary,
            highlights=fallback_highlights,
            actions=fallback_actions,
            raw_result={},
        )

    query = (
        "Review the live portfolio alerts and produce a concise risk-news briefing with a summary, "
        "3 highlights, and 3 action items."
    )
    if selected_focus:
        query += f" Focus especially on this alert: {selected_focus}"

    try:
        analysis = analyze_with_master_flow(
            AnalyzeRequest(
                query=query,
                symbols=symbols,
                portfolio=_load_portfolio_holdings(),
                context={
                    "focus_alert": selected_focus,
                    "sentinel_alerts": [alert.model_dump() for alert in sentinel.alerts[:5]],
                    "aggregate_impact": sentinel.aggregate_impact,
                    "vulnerability_score": sentinel.vulnerability_score,
                },
            )
        )
        raw_result = analysis.result
        summary = _extract_summary(raw_result) or fallback_summary
        highlights = _extract_lines(raw_result, ("highlights", "headline", "headlines", "signals"), 3) or fallback_highlights
        actions = _extract_lines(raw_result, ("action", "actions", "action_plan", "risk_controls"), 3) or fallback_actions
        return AlertsNewsResponse(
            workflow=analysis.workflow,
            generated_at=_iso_now(),
            focus_alert=selected_focus,
            summary=summary,
            highlights=highlights,
            actions=actions,
            raw_result=raw_result,
        )
    except OSError:
        return AlertsNewsResponse(
            workflow="local_fallback",
            generated_at=_iso_now(),
            focus_alert=selected_focus,
            summary=fallback_summary,
            highlights=fallback_highlights,
            actions=fallback_actions,
            raw_result={},
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
    records = _parse_portfolio_csv(decoded)
    holdings = _records_to_holdings(records)
    _save_uploaded_holdings(holdings)
    _save_uploaded_details(records)
    _CACHE.clear()

    return UploadPortfolioResponse(
        filename=filename,
        accepted=bool(holdings),
        detected_format=detected_format,
        holdings_detected=len(holdings),
        symbols=sorted(holdings.keys()),
        persistence_path=str(_PORTFOLIO_FILE),
        details_path=str(_PORTFOLIO_DETAILS_FILE),
        notes=[
            "Uploaded CSV holdings have replaced the default configured basket.",
            "All portfolio-derived endpoints now read from the persisted holdings file until you upload a new CSV.",
            "If average_price is present in the CSV, the audit engine can now calculate brokerage-aware sell safety.",
        ],
    )


def analyze_uploaded_portfolios(files: list[tuple[str, BinaryIO]]) -> BatchUploadPortfolioResponse:
    merged_records: list[PortfolioUploadRecord] = []
    filenames: list[str] = []

    for filename, file_obj in files:
        raw = file_obj.read()
        lowered_name = filename.lower()
        if lowered_name.endswith(".pdf"):
            raise ValueError("Batch replacement currently supports CSV files only.")

        decoded = raw.decode("utf-8-sig", errors="ignore")
        records = _parse_portfolio_csv(decoded)
        filenames.append(filename)
        merged_records.extend(records)

    merged_records = _merge_portfolio_records(merged_records)
    merged_holdings = _records_to_holdings(merged_records)

    _save_uploaded_holdings(merged_holdings)
    _save_uploaded_details(merged_records)
    _CACHE.clear()

    return BatchUploadPortfolioResponse(
        accepted=bool(merged_holdings),
        files_processed=len(filenames),
        filenames=filenames,
        holdings_detected=len(merged_holdings),
        symbols=sorted(merged_holdings.keys()),
        persistence_path=str(_PORTFOLIO_FILE),
        details_path=str(_PORTFOLIO_DETAILS_FILE),
        notes=[
            "Uploaded CSV files were merged by symbol and now replace the active portfolio basket.",
            "If the same symbol appeared in multiple files, quantities were summed before persistence.",
            "Average buy prices are merged as weighted averages when available, enabling brokerage-aware sell checks.",
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


def answer_strategy_what_if(payload: StrategyWhatIfRequest) -> StrategyWhatIfResponse:
    strategy = simulate_strategy(
        StrategySimulationRequest(
            monthly_surplus=payload.monthly_surplus,
            risk_mode=payload.risk_mode,
            event={
                "label": "Lifestyle Spend",
                "amount": payload.expense,
                "sip_pause_months": payload.pause_months,
            }
            if payload.expense > 0 or payload.pause_months > 0
            else None,
        )
    )

    detected_amount = _parse_financial_amount(payload.question) or payload.expense
    question_lower = payload.question.lower()
    monthly_boost = max(1000.0, round(payload.monthly_surplus * 0.2 / 500) * 500)
    delay_months = _calculate_delay_months(payload.monthly_surplus, detected_amount, payload.pause_months, payload.goal_target_amount)
    projected_date = _calculate_projected_date(
        target_amount=payload.goal_target_amount,
        base_year=payload.goal_target_year,
        monthly_surplus=payload.monthly_surplus,
        expense=detected_amount,
        pause_months=payload.pause_months,
    )
    projected_goal_month = _format_month_year(projected_date)

    fallback_answer = _build_strategy_what_if_fallback(
        question_lower=question_lower,
        goal_name=payload.goal_name,
        monthly_boost=monthly_boost,
        delay_months=delay_months,
        detected_amount=detected_amount,
        projected_goal_month=projected_goal_month,
        strategy=strategy,
    )

    prompt = (
        "You are a helpful wealth planning assistant. Answer the user's what-if question in 2 short paragraphs max. "
        "Be concrete and numerical. Do not use markdown bullets.\n\n"
        + json.dumps(
            {
                "question": payload.question,
                "goal_name": payload.goal_name,
                "goal_target_amount": payload.goal_target_amount,
                "goal_target_year": payload.goal_target_year,
                "monthly_surplus": payload.monthly_surplus,
                "risk_mode": payload.risk_mode,
                "expense": payload.expense,
                "pause_months": payload.pause_months,
                "delay_months": delay_months,
                "monthly_boost_suggestion": monthly_boost,
                "projected_goal_month": projected_goal_month,
                "strategy_summary": strategy.summary,
                "wealth_at_fifty": strategy.wealth_at_fifty,
                "projected_retirement_age": strategy.projected_retirement_age,
            },
            ensure_ascii=True,
        )
    )
    answer = _groq_text(prompt) or fallback_answer
    summary = (
        f"{payload.goal_name} is modeled around {projected_goal_month}. "
        f"Current what-if impact: about {max(delay_months, 0)} month(s) of delay unless you add roughly {_format_inr(monthly_boost)}."
    )
    confidence_note = (
        "This estimate is guidance based on your current contribution, target amount, and modeled market assumptions. "
        "Use it as a planning scenario, not a guaranteed return."
    )

    return StrategyWhatIfResponse(
        answer=answer,
        summary=summary,
        delay_months=delay_months,
        monthly_boost_suggestion=monthly_boost,
        projected_goal_month=projected_goal_month,
        confidence_note=confidence_note,
    )


def get_market_recommendations() -> MarketEngineResponse:
    tracked_quotes = get_market_quotes().quotes
    indices = get_market_indices(["NIFTY 50", "NIFTY BANK", "NIFTY IT"]).indices
    nifty = next(index for index in indices if index.index == "NIFTY 50")
    if not tracked_quotes:
        return MarketEngineResponse(
            sentiment="No data available",
            summary="No recommendations available because tracked market data could not be loaded.",
            why_ai_is_used=[],
            recommendations=[],
            recommended_etfs=[],
            projected_acceleration=[],
        )

    positions = {position.symbol: position for position in _get_portfolio_positions()}
    total_value = sum(position.market_value for position in positions.values()) or 0
    top_candidates = sorted(
        tracked_quotes,
        key=lambda item: _recommendation_score(item, positions.get(item.symbol)),
        reverse=True,
    )[: min(3, len(tracked_quotes))]

    recommendations = [_build_recommendation(quote, positions.get(quote.symbol), total_value) for quote in top_candidates]
    recommended_etfs = [
        _build_recommendation(quote, positions.get(quote.symbol), total_value)
        for quote in tracked_quotes
        if _category_for_quote(quote) == "ETF"
    ]
    recommended_etfs = sorted(
        recommended_etfs,
        key=lambda item: (item.months_accelerated, item.percent_change),
        reverse=True,
    )[:3]
    ai_summary = _summarize_market_recommendations(recommendations, nifty)
    why_ai_is_used = [
        "AI compresses live market, portfolio, and goal-fit signals into a short rationale.",
        "Deterministic math still drives brokerage, exit-fee, and month-acceleration estimates.",
        "Each recommendation explains why it fits now instead of only showing raw price momentum.",
    ]

    return MarketEngineResponse(
        sentiment=f"NIFTY 50 {nifty.percent_change:+.2f}%",
        summary=ai_summary,
        why_ai_is_used=why_ai_is_used,
        recommendations=recommendations,
        recommended_etfs=recommended_etfs,
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
            average_buy_price=_format_optional_inr(position.average_buy_price),
            current_price=_format_optional_inr(position.quote.last_price),
            break_even_price=_format_optional_inr(position.break_even_price),
            unrealized_profit=_format_optional_signed_inr(position.unrealized_profit),
            estimated_brokerage=_format_optional_inr(position.estimated_brokerage),
            safe_to_sell=position.safe_to_sell,
            sell_signal=_sell_signal(position),
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


def get_portfolio_rebalancer() -> RebalancerResponse:
    positions = _get_portfolio_positions()
    if not positions:
        return RebalancerResponse(
            summary="No portfolio data is available yet, so rebalancing ratios cannot be computed.",
            current_mix={"equity": 0, "debt": 0, "gold": 0, "international": 0},
            target_mix={"equity": 55, "debt": 20, "gold": 10, "international": 15},
            ratios=[],
            suggested_moves=[],
        )

    total_value = sum(position.market_value for position in positions) or 1
    concentration_ratio = round((max(position.market_value for position in positions) / total_value) * 100)
    etf_value = sum(position.market_value for position in positions if "BEES" in position.symbol or "ETF" in position.quote.company_name.upper())
    gold_value = sum(position.market_value for position in positions if "GOLD" in position.symbol or "GOLD" in position.quote.company_name.upper())
    average_volatility = round(sum(position.volatility_proxy for position in positions) / len(positions))
    liquid_value = sum(position.market_value for position in positions if "BEES" in position.symbol or position.safe_to_sell)
    current_mix = _current_allocation_mix(positions, total_value)
    target_mix = {"equity": 55, "debt": 20, "gold": 10, "international": 15}
    drift_equity = current_mix["equity"] - target_mix["equity"]
    goal_alignment = max(20, 100 - abs(drift_equity) - max(0, concentration_ratio - 25))

    ratios = [
        RebalancerRatio(
            name="Concentration Ratio",
            value=f"{concentration_ratio}%",
            meaning="Shows how much of the portfolio sits in the single largest holding.",
            impact="Higher concentration increases the chance that one position dominates portfolio outcomes.",
            suggested_action="Trim oversized positions if this goes beyond 25-30%.",
        ),
        RebalancerRatio(
            name="Equity vs Stability",
            value=f"{current_mix['equity']}% growth / {100 - current_mix['equity']}% stabilizers",
            meaning="Compares growth assets against defensive sleeves like gold or other stabilizers.",
            impact="Too much growth raises drawdown risk, while too little slows wealth milestones.",
            suggested_action="Use the target mix as the rebalance anchor when drift exceeds 8-10%.",
        ),
        RebalancerRatio(
            name="ETF Diversification",
            value=f"{round((etf_value / total_value) * 100)}%",
            meaning="Shows how much of your portfolio is already in diversified ETF wrappers.",
            impact="Higher ETF share usually lowers single-stock risk and improves consistency.",
            suggested_action="Increase ETF allocation when concentration and volatility both rise.",
        ),
        RebalancerRatio(
            name="Gold / Hedge Sleeve",
            value=f"{round((gold_value / total_value) * 100)}%",
            meaning="Measures the size of your defensive hedge allocation.",
            impact="This helps cushion shocks, but too much can drag long-term compounding.",
            suggested_action="Keep gold near 8-12% unless you are intentionally de-risking.",
        ),
        RebalancerRatio(
            name="Volatility Load",
            value=f"{average_volatility}/100",
            meaning="A proxy for how turbulent your holdings are based on 52-week trading ranges.",
            impact="Higher volatility makes panic selling more likely and increases drawdown depth.",
            suggested_action="Offset high-volatility names with index ETFs or lower-beta holdings.",
        ),
        RebalancerRatio(
            name="Liquidity Ratio",
            value=f"{round((liquid_value / total_value) * 100)}%",
            meaning="Shows how much of the portfolio can be exited with relatively low friction.",
            impact="A healthier liquidity ratio improves emergency readiness and reduces forced-selling stress.",
            suggested_action="Maintain a liquid sleeve for near-term goals and unexpected needs.",
        ),
        RebalancerRatio(
            name="Goal Alignment Ratio",
            value=f"{goal_alignment}%",
            meaning="Estimates how closely your current allocation matches a balanced long-term target.",
            impact="Lower alignment means your portfolio may not be helping your key goals efficiently.",
            suggested_action="Use rebalance moves to shift capital toward the sleeves that support your next milestone.",
        ),
    ]

    suggested_moves = [
        RebalancerMove(
            title="Reduce the most concentrated sleeve",
            why="This lowers dependence on one stock or sector and improves diversification resilience.",
            expected_effect="Can reduce downside concentration risk and make portfolio outcomes smoother.",
        ),
        RebalancerMove(
            title="Redirect fresh SIPs into diversified ETFs",
            why="Fresh money is the least disruptive way to rebalance without triggering unnecessary exit costs.",
            expected_effect="Improves ETF ratio, lowers volatility load, and can move major goals closer with less friction.",
        ),
        RebalancerMove(
            title="Top up the hedge sleeve only if drift is severe",
            why="Gold or defensive sleeves should stabilize the portfolio, not dominate long-term growth.",
            expected_effect="Helps absorb shocks while preserving enough equity exposure for compounding.",
        ),
    ]

    summary = (
        f"Your portfolio is {concentration_ratio}% concentrated in its largest holding, with an estimated "
        f"{current_mix['equity']}% equity mix and {round((etf_value / total_value) * 100)}% ETF exposure. "
        "The best rebalance move is usually to redirect new contributions before selling."
    )

    return RebalancerResponse(
        summary=summary,
        current_mix=current_mix,
        target_mix=target_mix,
        ratios=ratios,
        suggested_moves=suggested_moves,
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
    detail_map = _load_portfolio_details()
    positions: list[PortfolioPosition] = []
    for symbol, quantity in _load_portfolio_holdings().items():
        detail = detail_map.get(symbol, {})
        positions.append(
            PortfolioPosition(
                symbol=symbol,
                quantity=quantity,
                quote=get_market_quote(symbol),
                average_buy_price=_maybe_float(detail.get("average_price")),
                broker=detail.get("broker"),
            )
        )
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


def _load_portfolio_details() -> dict[str, dict[str, Any]]:
    if not _PORTFOLIO_DETAILS_FILE.exists():
        return {}
    payload = json.loads(_PORTFOLIO_DETAILS_FILE.read_text(encoding="utf-8"))
    if not isinstance(payload, list):
        return {}
    return {
        str(item.get("symbol", "")).upper(): item
        for item in payload
        if isinstance(item, dict) and item.get("symbol")
    }


def _save_market_snapshot(snapshot: MarketSnapshotResponse) -> None:
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    _MARKET_SNAPSHOT_FILE.write_text(snapshot.model_dump_json(indent=2), encoding="utf-8")


def _save_uploaded_holdings(holdings: dict[str, float]) -> None:
    if not holdings:
        raise ValueError("No valid holdings were found in the uploaded CSV.")
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    _PORTFOLIO_FILE.write_text(json.dumps(holdings, indent=2, sort_keys=True), encoding="utf-8")


def _save_uploaded_details(records: list[PortfolioUploadRecord]) -> None:
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    payload = [
        {
            "symbol": record.symbol,
            "quantity": record.quantity,
            "average_price": record.average_price,
            "company_name": record.company_name,
            "broker": record.broker,
        }
        for record in records
    ]
    _PORTFOLIO_DETAILS_FILE.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _parse_portfolio_csv(content: str) -> list[PortfolioUploadRecord]:
    reader = csv.DictReader(StringIO(content))
    if not reader.fieldnames:
        raise ValueError("CSV is missing a header row.")

    field_map = {field.strip().lower(): field for field in reader.fieldnames if field}
    symbol_field = next((field_map[name] for name in ("symbol", "ticker", "security", "instrument") if name in field_map), None)
    quantity_field = next((field_map[name] for name in ("quantity", "qty", "units", "shares") if name in field_map), None)
    average_price_field = next((field_map[name] for name in ("average_price", "avg_price", "buy_price", "purchase_price") if name in field_map), None)
    company_name_field = next((field_map[name] for name in ("company_name", "name", "security_name") if name in field_map), None)
    broker_field = next((field_map[name] for name in ("broker", "broker_name") if name in field_map), None)

    if not symbol_field or not quantity_field:
        raise ValueError("CSV must include symbol and quantity columns.")

    records: list[PortfolioUploadRecord] = []
    for row in reader:
        raw_symbol = (row.get(symbol_field) or "").strip().upper()
        raw_quantity = (row.get(quantity_field) or "").strip()
        if not raw_symbol or not raw_quantity:
            continue
        quantity = float(raw_quantity.replace(",", ""))
        if quantity <= 0:
            continue
        average_price = None
        raw_average_price = (row.get(average_price_field) or "").strip() if average_price_field else ""
        if raw_average_price:
            average_price = float(raw_average_price.replace(",", ""))
        records.append(
            PortfolioUploadRecord(
                symbol=raw_symbol,
                quantity=quantity,
                average_price=average_price if average_price and average_price > 0 else None,
                company_name=(row.get(company_name_field) or "").strip() if company_name_field else None,
                broker=(row.get(broker_field) or "").strip() if broker_field else None,
            )
        )

    if not records:
        raise ValueError("CSV did not contain any valid positive-quantity holdings.")
    return _merge_portfolio_records(records)


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


def _build_recommendation(
    quote: QuoteSnapshot,
    position: PortfolioPosition | None,
    total_portfolio_value: float,
) -> Recommendation:
    category = _category_for_quote(quote)
    planned_investment = max(5000.0, total_portfolio_value * (0.06 if total_portfolio_value else 0.0))
    if category == "ETF":
        planned_investment = max(4000.0, total_portfolio_value * 0.05 if total_portfolio_value else 0.0)

    goal_name = _recommendation_goal_name(category, quote)
    annual_return = _assumed_annual_return(quote, category)
    months_accelerated = _estimate_goal_acceleration_months(goal_name, planned_investment, annual_return)
    exit_fee = planned_investment * _exit_fee_rate_for_category(category)
    brokerage = planned_investment * settings.estimated_brokerage_rate
    net_goal_impact = max(planned_investment - brokerage - exit_fee, 0)
    why_points = _recommendation_why_points(quote, category, months_accelerated, position)
    ai_summary = _summarize_recommendation(quote, why_points, goal_name, months_accelerated, brokerage, exit_fee)
    risk_flag = _risk_flag_for_quote(quote, position)

    recommendation = _quote_to_recommendation(quote, category, "review_position")
    recommendation.why_recommended_now = _why_recommended_now(quote, category, position, months_accelerated)
    recommendation.why_invest = why_points[0]
    recommendation.ai_summary = ai_summary
    recommendation.why_ai_likes_it = why_points
    recommendation.goal_name = goal_name
    recommendation.months_accelerated = months_accelerated
    recommendation.recommended_investment = _format_inr(planned_investment)
    recommendation.estimated_brokerage = _format_inr(brokerage)
    recommendation.estimated_exit_fee = _format_inr(exit_fee)
    recommendation.net_goal_impact = (
        f"{goal_name} could move closer by about {months_accelerated} month(s) after costs, based on a "
        f"{_format_inr(net_goal_impact)} deployable amount."
    )
    recommendation.risk_flag = risk_flag
    recommendation.action = "initiate_sip" if category == "ETF" else "build_position"
    recommendation.thesis = (
        f"{quote.company_name} at INR {quote.last_price:,.2f} is showing {quote.percent_change:+.2f}% momentum. "
        f"Modeled deployment: {_format_inr(planned_investment)}."
    )
    return recommendation


def _category_for_quote(quote: QuoteSnapshot) -> str:
    name = quote.company_name.upper()
    if "ETF" in name or "BEES" in quote.symbol:
        return "ETF"
    if quote.industry:
        return quote.industry
    return "Equity"


def _current_allocation_mix(positions: list[PortfolioPosition], total_value: float) -> dict[str, int]:
    buckets = {"equity": 0.0, "debt": 0.0, "gold": 0.0, "international": 0.0}
    for position in positions:
        label = f"{position.symbol} {position.quote.company_name}".upper()
        if "GOLD" in label:
            buckets["gold"] += position.market_value
        elif "NASDAQ" in label or "INTERNATIONAL" in label:
            buckets["international"] += position.market_value
        else:
            buckets["equity"] += position.market_value

    return {
        bucket: round((value / total_value) * 100) if total_value else 0
        for bucket, value in buckets.items()
    }


def _recommendation_score(quote: QuoteSnapshot, position: PortfolioPosition | None) -> float:
    momentum = quote.percent_change * 18
    stability_bonus = max(0.0, 22 - abs(quote.percent_change) * 4)
    diversification_bonus = 8.0 if position is None else max(0.0, 14 - position.volatility_proxy * 0.2)
    etf_bonus = 10.0 if _category_for_quote(quote) == "ETF" else 0.0
    return momentum + stability_bonus + diversification_bonus + etf_bonus


def _recommendation_goal_name(category: str, quote: QuoteSnapshot) -> str:
    if category == "ETF" and "GOLD" in quote.symbol:
        return "Emergency Buffer"
    if category == "ETF":
        return "Retirement Corpus"
    if quote.industry and "BANK" in quote.industry.upper():
        return "Home Down Payment"
    if quote.industry and "IT" in quote.industry.upper():
        return "Freedom Ledger"
    return "Wealth Growth"


def _assumed_annual_return(quote: QuoteSnapshot, category: str) -> float:
    base_return = 0.11 if category == "ETF" else 0.135
    momentum_adjustment = max(min(quote.percent_change / 100, 0.025), -0.02)
    return max(0.07, base_return + momentum_adjustment)


def _estimate_goal_acceleration_months(goal_name: str, additional_investment: float, annual_return: float) -> int:
    targets = {
        "Retirement Corpus": 4_200_000.0,
        "Home Down Payment": 2_800_000.0,
        "Emergency Buffer": 900_000.0,
        "Freedom Ledger": 5_000_000.0,
        "Wealth Growth": 3_200_000.0,
    }
    target_amount = targets.get(goal_name, 3_000_000.0)
    monthly_contribution = max(settings.recommendation_monthly_contribution, 1.0)
    monthly_return = annual_return / 12
    current_months = _months_to_goal(target_amount, monthly_contribution, monthly_return)
    improved_months = _months_to_goal(target_amount, monthly_contribution + (additional_investment / 12), monthly_return)
    return max(current_months - improved_months, 1)


def _months_to_goal(target_amount: float, monthly_contribution: float, monthly_return: float) -> int:
    if monthly_return <= 0:
        return ceil(target_amount / monthly_contribution)
    numerator = (target_amount * monthly_return) / monthly_contribution + 1
    if numerator <= 1:
        return 1
    return max(1, ceil(log(numerator) / log(1 + monthly_return)))


def _parse_financial_amount(text: str) -> float | None:
    for token in text.replace(",", "").split():
        normalized = token.lower()
        if normalized.endswith("lakh"):
            number = normalized.replace("lakh", "")
            if number:
                try:
                    return float(number) * 100000
                except ValueError:
                    continue
        if normalized.endswith("cr") or normalized.endswith("crore"):
            number = normalized.replace("crore", "").replace("cr", "")
            if number:
                try:
                    return float(number) * 10000000
                except ValueError:
                    continue
    match = re.search(r"(\d+(?:\.\d+)?)", text.replace(",", ""))
    if match:
        try:
            return float(match.group(1))
        except ValueError:
            return None
    return None


def _calculate_delay_months(monthly_surplus: float, expense: float, pause_months: int, target_amount: float) -> int:
    if expense <= 0 and pause_months <= 0:
        return 0
    effective_surplus = max(monthly_surplus, 1.0)
    expense_delay = expense > 0 and ceil((expense + target_amount * 0.1) / effective_surplus / 2) or 0
    return min(60, expense_delay + pause_months)


def _calculate_projected_date(
    *,
    target_amount: float,
    base_year: int,
    monthly_surplus: float,
    expense: float,
    pause_months: int,
) -> datetime:
    if monthly_surplus <= 0:
        return datetime(base_year, 1, 1, tzinfo=UTC)
    monthly_capacity = max(1000.0, monthly_surplus * 0.72)
    adjusted_target = max(0.0, target_amount + expense * 0.65)
    months_needed = ceil(adjusted_target / monthly_capacity) + pause_months
    projected = datetime.now(tz=UTC).replace(day=1)
    year = projected.year + ((projected.month - 1 + months_needed) // 12)
    month = ((projected.month - 1 + months_needed) % 12) + 1
    return projected.replace(year=year, month=month)


def _format_month_year(date: datetime) -> str:
    return date.strftime("%b %Y")


def _build_strategy_what_if_fallback(
    *,
    question_lower: str,
    goal_name: str,
    monthly_boost: float,
    delay_months: int,
    detected_amount: float,
    projected_goal_month: str,
    strategy: StrategySimulationResponse,
) -> str:
    if "pause" in question_lower or "stop sip" in question_lower:
        return (
            f"Pausing SIPs would likely push {goal_name} by about {max(delay_months, 1)} month(s), moving the target window "
            f"toward {projected_goal_month}. Keeping even a reduced SIP active is the cleanest way to protect the goal timeline."
        )
    if "increase sip" in question_lower or "raise my sip" in question_lower or "salary hike" in question_lower:
        return (
            f"Adding around {_format_inr(monthly_boost)} to your monthly SIP should help pull {goal_name} closer and strengthen your "
            f"long-term projection. Your current model still points to {strategy.wealth_at_fifty} by age 50."
        )
    if "spend" in question_lower or "expense" in question_lower:
        return (
            f"A spend of about {_format_inr(detected_amount)} would likely delay {goal_name} by roughly {max(delay_months, 1)} month(s), "
            f"unless you offset it with a higher SIP or a shorter pause."
        )
    return (
        f"At the current settings, {goal_name} is modeled around {projected_goal_month}. If you want to improve the timeline, "
        f"the cleanest lever is to add around {_format_inr(monthly_boost)} to your monthly contribution."
    )


def _exit_fee_rate_for_category(category: str) -> float:
    return settings.estimated_etf_exit_fee_rate if category == "ETF" else settings.estimated_equity_exit_fee_rate


def _recommendation_why_points(
    quote: QuoteSnapshot,
    category: str,
    months_accelerated: int,
    position: PortfolioPosition | None,
) -> list[str]:
    points = [
        f"It can bring your { _recommendation_goal_name(category, quote) } closer by about {months_accelerated} month(s) under current contribution assumptions.",
        f"Estimated entry-plus-exit friction stays controlled because {category.lower()} costs are modeled separately from alpha potential.",
    ]
    if position is None:
        points.insert(0, "It adds fresh diversification instead of increasing concentration in a current holding.")
    else:
        points.insert(0, f"It already exists in your basket, so averaging in can improve compounding efficiency without introducing a new risk bucket.")
    return points[:3]


def _risk_flag_for_quote(quote: QuoteSnapshot, position: PortfolioPosition | None) -> str:
    if position and position.volatility_proxy >= 35:
        return "High volatility sleeve"
    if abs(quote.percent_change) >= 2.5:
        return "Momentum is elevated today"
    return "Risk appears manageable"


def _why_recommended_now(
    quote: QuoteSnapshot,
    category: str,
    position: PortfolioPosition | None,
    months_accelerated: int,
) -> str:
    if category == "ETF":
        if position is None:
            return (
                f"Recommended now because the ETF adds instant diversification and can bring a target goal closer by about "
                f"{months_accelerated} month(s) with lower modeled exit friction."
            )
        return (
            f"Recommended now because systematic buying into this ETF can smooth volatility in an existing sleeve and still "
            f"save about {months_accelerated} month(s) on the goal timeline."
        )
    if quote.percent_change >= 1:
        return (
            f"Recommended now because momentum is constructive and the modeled contribution still advances the goal timeline by "
            f"{months_accelerated} month(s)."
        )
    return (
        f"Recommended now because the entry is relatively calmer while still improving goal velocity by about "
        f"{months_accelerated} month(s)."
    )


def _summarize_market_recommendations(recommendations: list[Recommendation], nifty: IndexSnapshot) -> str:
    fallback = (
        f"NIFTY 50 is {nifty.percent_change:+.2f}% today. The engine is prioritizing ideas that improve diversification, "
        "keep trading frictions visible, and move major goals closer."
    )
    if not recommendations:
        return fallback
    prompt = (
        "Summarize these investment recommendations in under 55 words. Mention goal acceleration, fees, and why AI is used. "
        "Return plain text only.\n\n"
        + json.dumps([recommendation.model_dump() for recommendation in recommendations], ensure_ascii=True)
    )
    return _groq_text(prompt) or fallback


def _summarize_recommendation(
    quote: QuoteSnapshot,
    why_points: list[str],
    goal_name: str,
    months_accelerated: int,
    brokerage: float,
    exit_fee: float,
) -> str:
    fallback = (
        f"{quote.symbol} supports {goal_name} and may save about {months_accelerated} month(s). "
        f"Estimated friction: {_format_inr(brokerage + exit_fee)}."
    )
    prompt = (
        "Write a crisp recommendation summary in under 35 words for a wealth app card. Mention goal acceleration, "
        "fees, and one reason to invest now. Plain text only.\n\n"
        + json.dumps(
            {
                "symbol": quote.symbol,
                "goal_name": goal_name,
                "months_accelerated": months_accelerated,
                "why_points": why_points,
                "brokerage": _format_inr(brokerage),
                "exit_fee": _format_inr(exit_fee),
            },
            ensure_ascii=True,
        )
    )
    return _groq_text(prompt) or fallback


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
    if position.safe_to_sell:
        return "Safe To Sell"
    if position.volatility_proxy >= 35:
        return "High Range"
    if position.quote.percent_change >= 1:
        return "Momentum Leader"
    return "Core Holding"


def _sell_signal(position: PortfolioPosition) -> str:
    if position.average_buy_price is None:
        return "No buy price data"
    if position.break_even_price is None or position.unrealized_profit is None or position.estimated_brokerage is None:
        return "No data available"
    if position.safe_to_sell:
        return (
            f"Safe to sell. Current price is above break-even by "
            f"{_format_inr(max(position.quote.last_price - position.break_even_price, 0) * position.quantity)}."
        )
    return (
        f"Hold for now. Profit after estimated brokerage is still below break-even by "
        f"{_format_inr(max(position.estimated_brokerage - max(position.unrealized_profit, 0), 0))}."
    )


def _records_to_holdings(records: list[PortfolioUploadRecord]) -> dict[str, float]:
    return {record.symbol: record.quantity for record in records}


def _merge_portfolio_records(records: list[PortfolioUploadRecord]) -> list[PortfolioUploadRecord]:
    merged: dict[str, PortfolioUploadRecord] = {}
    weighted_costs: dict[str, float] = {}
    weighted_quantities: dict[str, float] = {}

    for record in records:
        existing = merged.get(record.symbol)
        if existing is None:
            merged[record.symbol] = PortfolioUploadRecord(
                symbol=record.symbol,
                quantity=record.quantity,
                average_price=record.average_price,
                company_name=record.company_name,
                broker=record.broker,
            )
        else:
            existing.quantity += record.quantity
            if not existing.company_name and record.company_name:
                existing.company_name = record.company_name
            if not existing.broker and record.broker:
                existing.broker = record.broker

        if record.average_price is not None:
            weighted_costs[record.symbol] = weighted_costs.get(record.symbol, 0.0) + (record.average_price * record.quantity)
            weighted_quantities[record.symbol] = weighted_quantities.get(record.symbol, 0.0) + record.quantity

    for symbol, record in merged.items():
        if weighted_quantities.get(symbol):
            record.average_price = weighted_costs[symbol] / weighted_quantities[symbol]

    return sorted(merged.values(), key=lambda record: record.symbol)


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


def _post_json(url: str, payload: dict[str, Any]) -> Any:
    request = Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "User-Agent": "Mozilla/5.0",
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urlopen(request, timeout=settings.n8n_request_timeout_seconds) as response:
        raw = response.read().decode("utf-8")
    if not raw.strip():
        return {"message": "n8n master_flow returned an empty response."}
    return json.loads(raw)


def _groq_text(prompt: str) -> str | None:
    if not settings.groq_api_key:
        return None

    request = Request(
        f"{settings.groq_base_url.rstrip('/')}/chat/completions",
        data=json.dumps(
            {
                "model": settings.groq_model,
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a concise financial UX writer. Follow formatting instructions exactly and avoid markdown.",
                    },
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.2,
            }
        ).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {settings.groq_api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )
    try:
        with urlopen(request, timeout=20) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError):
        return None

    choices = payload.get("choices", [])
    if not choices:
        return None
    message = choices[0].get("message", {})
    content = message.get("content")
    if isinstance(content, str):
        return content.strip()
    return None


def _extract_summary(payload: Any) -> str | None:
    preferred_keys = (
        "executive_summary",
        "summary",
        "investment_thesis",
        "market_view",
        "decision",
        "result",
        "text",
        "output",
    )
    for key in preferred_keys:
        value = _find_first_value(payload, key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    flattened = _flatten_strings(payload)
    return flattened[0] if flattened else None


def _extract_lines(payload: Any, preferred_keys: tuple[str, ...], limit: int) -> list[str]:
    lines: list[str] = []
    for key in preferred_keys:
        values = _find_all_values(payload, key)
        for value in values:
            lines.extend(_value_to_lines(value))
    deduped: list[str] = []
    for line in lines:
        cleaned = line.strip()
        if cleaned and cleaned not in deduped:
            deduped.append(cleaned)
        if len(deduped) >= limit:
            break
    return deduped[:limit]


def _find_first_value(payload: Any, target_key: str) -> Any | None:
    if isinstance(payload, dict):
        for key, value in payload.items():
            if key == target_key:
                return value
            nested = _find_first_value(value, target_key)
            if nested is not None:
                return nested
    elif isinstance(payload, list):
        for item in payload:
            nested = _find_first_value(item, target_key)
            if nested is not None:
                return nested
    return None


def _find_all_values(payload: Any, target_key: str) -> list[Any]:
    matches: list[Any] = []
    if isinstance(payload, dict):
        for key, value in payload.items():
            if key == target_key:
                matches.append(value)
            matches.extend(_find_all_values(value, target_key))
    elif isinstance(payload, list):
        for item in payload:
            matches.extend(_find_all_values(item, target_key))
    return matches


def _flatten_strings(payload: Any) -> list[str]:
    if isinstance(payload, str):
        return [payload]
    if isinstance(payload, dict):
        values: list[str] = []
        for value in payload.values():
            values.extend(_flatten_strings(value))
        return values
    if isinstance(payload, list):
        values: list[str] = []
        for item in payload:
            values.extend(_flatten_strings(item))
        return values
    return []


def _value_to_lines(value: Any) -> list[str]:
    if isinstance(value, str):
        return [value]
    if isinstance(value, list):
        lines: list[str] = []
        for item in value:
            if isinstance(item, str):
                lines.append(item)
            elif isinstance(item, dict):
                lines.extend(_flatten_strings(item))
        return lines
    if isinstance(value, dict):
        return _flatten_strings(value)
    return []


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


def _format_optional_inr(value: float | None) -> str | None:
    if value is None:
        return None
    return _format_inr(value)


def _format_optional_signed_inr(value: float | None) -> str | None:
    if value is None:
        return None
    sign = "+" if value >= 0 else "-"
    return f"{sign}INR {abs(value):,.2f}"


def _iso_now() -> str:
    return datetime.now(tz=UTC).isoformat()
