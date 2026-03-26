from celery import Celery

from .config import get_settings

settings = get_settings()

celery_app = Celery(
    "nirvesta",
    broker=settings.resolved_celery_broker_url,
    backend=settings.resolved_celery_result_backend,
)

celery_app.conf.update(
    timezone=settings.timezone,
    enable_utc=False,
    beat_schedule={
        "refresh-tracked-market-snapshot-hourly": {
            "task": "app.tasks.refresh_tracked_market_snapshot",
            "schedule": settings.market_refresh_interval_seconds,
        },
    },
)

celery_app.autodiscover_tasks(["app"])
