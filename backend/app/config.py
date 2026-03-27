from functools import lru_cache
from typing import Annotated

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = Field(default="Nirvesta API", alias="NIRVESTA_APP_NAME")
    env: str = Field(default="local", alias="NIRVESTA_ENV")
    timezone: str = Field(default="Asia/Kolkata", alias="NIRVESTA_TIMEZONE")
    api_prefix: str = Field(default="/api/v1", alias="NIRVESTA_API_PREFIX")
    analyze_api_path: str = Field(default="/api/analyze", alias="NIRVESTA_ANALYZE_API_PATH")
    allowed_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["http://localhost:5173", "http://127.0.0.1:5173"],
        alias="NIRVESTA_ALLOWED_ORIGINS",
    )
    mcp_transport: str = Field(default="stdio", alias="NIRVESTA_MCP_TRANSPORT")
    nse_base_url: str = Field(default="https://www.nseindia.com/api", alias="NIRVESTA_NSE_BASE_URL")
    nse_referer: str = Field(default="https://www.nseindia.com/", alias="NIRVESTA_NSE_REFERER")
    market_symbols: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: [
            "INFY",
            "HDFCBANK",
            "RELIANCE",
            "ITC",
            "SBIN",
            "NIFTYBEES",
            "GOLDBEES",
            "MID150BEES",
        ],
        alias="NIRVESTA_MARKET_SYMBOLS",
    )
    portfolio_holdings: Annotated[dict[str, float], NoDecode] = Field(
        default_factory=dict,
        alias="NIRVESTA_PORTFOLIO_HOLDINGS",
    )
    market_cache_ttl_seconds: int = Field(default=60, alias="NIRVESTA_MARKET_CACHE_TTL_SECONDS")
    market_refresh_interval_seconds: int = Field(default=3600, alias="NIRVESTA_MARKET_REFRESH_INTERVAL_SECONDS")
    estimated_brokerage_rate: float = Field(default=0.003, alias="NIRVESTA_ESTIMATED_BROKERAGE_RATE")
    estimated_equity_exit_fee_rate: float = Field(default=0.0015, alias="NIRVESTA_ESTIMATED_EQUITY_EXIT_FEE_RATE")
    estimated_etf_exit_fee_rate: float = Field(default=0.0, alias="NIRVESTA_ESTIMATED_ETF_EXIT_FEE_RATE")
    redis_url: str = Field(default="redis://localhost:6379/0", alias="NIRVESTA_REDIS_URL")
    celery_broker_url: str | None = Field(default=None, alias="NIRVESTA_CELERY_BROKER_URL")
    celery_result_backend: str | None = Field(default=None, alias="NIRVESTA_CELERY_RESULT_BACKEND")
    use_celery_scheduler: bool = Field(default=False, alias="NIRVESTA_USE_CELERY_SCHEDULER")

    @property
    def resolved_celery_broker_url(self) -> str:
        return self.celery_broker_url or self.redis_url

    @property
    def resolved_celery_result_backend(self) -> str:
        return self.celery_result_backend or self.redis_url
    n8n_master_flow_webhook_url: str | None = Field(default=None, alias="NIRVESTA_N8N_MASTER_FLOW_WEBHOOK_URL")
    n8n_request_timeout_seconds: int = Field(default=45, alias="NIRVESTA_N8N_REQUEST_TIMEOUT_SECONDS")
    groq_api_key: str | None = Field(default=None, alias="NIRVESTA_GROQ_API_KEY")
    groq_base_url: str = Field(default="https://api.groq.com/openai/v1", alias="NIRVESTA_GROQ_BASE_URL")
    groq_model: str = Field(default="llama-3.3-70b-versatile", alias="NIRVESTA_GROQ_MODEL")
    recommendation_monthly_contribution: float = Field(default=4500.0, alias="NIRVESTA_RECOMMENDATION_MONTHLY_CONTRIBUTION")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def parse_allowed_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @field_validator("market_symbols", mode="before")
    @classmethod
    def parse_market_symbols(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [symbol.strip().upper() for symbol in value.split(",") if symbol.strip()]
        return [symbol.upper() for symbol in value]

    @field_validator("portfolio_holdings", mode="before")
    @classmethod
    def parse_portfolio_holdings(cls, value: str | dict[str, float]) -> dict[str, float]:
        if isinstance(value, str):
            positions: dict[str, float] = {}
            for item in value.split(","):
                if ":" not in item:
                    continue
                symbol, quantity = item.split(":", 1)
                symbol = symbol.strip().upper()
                quantity = quantity.strip()
                if not symbol or not quantity:
                    continue
                positions[symbol] = float(quantity)
            return positions
        return {symbol.upper(): float(quantity) for symbol, quantity in value.items()}


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
