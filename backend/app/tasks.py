from __future__ import annotations

import logging

from .celery_app import celery_app
from .services import get_tracked_symbols, refresh_market_snapshot

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.refresh_tracked_market_snapshot")
def refresh_tracked_market_snapshot() -> dict[str, object]:
    snapshot = refresh_market_snapshot()
    etf_quotes = [quote for quote in snapshot.quotes if "BEES" in quote.symbol or "ETF" in quote.company_name.upper()]
    logger.info(
        "Celery refresh completed for %s tracked symbols and %s ETF quotes",
        len(snapshot.tracked_symbols),
        len(etf_quotes),
    )
    return {
        "generated_at": snapshot.generated_at,
        "tracked_symbols": snapshot.tracked_symbols,
        "tracked_count": len(snapshot.tracked_symbols),
        "etf_symbols": [quote.symbol for quote in etf_quotes],
    }


@celery_app.task(name="app.tasks.refresh_selected_symbols")
def refresh_selected_symbols(symbols: list[str]) -> dict[str, object]:
    normalized_symbols = sorted({symbol.strip().upper() for symbol in symbols if symbol.strip()})
    if not normalized_symbols:
        normalized_symbols = get_tracked_symbols()
    snapshot = refresh_market_snapshot(normalized_symbols)
    return {
        "generated_at": snapshot.generated_at,
        "tracked_symbols": snapshot.tracked_symbols,
        "tracked_count": len(snapshot.tracked_symbols),
    }
