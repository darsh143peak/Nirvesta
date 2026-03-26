import asyncio
import logging
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import router
from .config import get_settings
from .services import refresh_market_snapshot

settings = get_settings()
logger = logging.getLogger(__name__)


async def _market_refresh_loop() -> None:
    while True:
        await asyncio.sleep(settings.market_refresh_interval_seconds)
        try:
            await asyncio.to_thread(refresh_market_snapshot)
        except Exception:  # pragma: no cover - defensive scheduler logging
            logger.exception("Hourly market refresh failed")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Prime the snapshot immediately, then keep it fresh on a cron-like hourly interval.
    initial_refresh = asyncio.create_task(asyncio.to_thread(refresh_market_snapshot))
    scheduler_task = asyncio.create_task(_market_refresh_loop())
    try:
        await initial_refresh
    except Exception:  # pragma: no cover - app should still boot if initial refresh fails
        logger.exception("Initial market refresh failed during startup")
    try:
        yield
    finally:
        scheduler_task.cancel()
        with suppress(asyncio.CancelledError):
            await scheduler_task

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="Backend APIs for the Nirvesta wealth planning interface.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix=settings.api_prefix)


@app.get("/")
def root() -> dict[str, str]:
    return {"name": settings.app_name, "docs": "/docs", "api_prefix": settings.api_prefix}
