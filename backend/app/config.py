from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = Field(default="Nirvesta API", alias="NIRVESTA_APP_NAME")
    env: str = Field(default="local", alias="NIRVESTA_ENV")
    api_prefix: str = Field(default="/api/v1", alias="NIRVESTA_API_PREFIX")
    allowed_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:5173", "http://127.0.0.1:5173"],
        alias="NIRVESTA_ALLOWED_ORIGINS",
    )
    mcp_transport: str = Field(default="stdio", alias="NIRVESTA_MCP_TRANSPORT")
    nse_base_url: str = Field(default="https://www.nseindia.com/api", alias="NIRVESTA_NSE_BASE_URL")
    nse_referer: str = Field(default="https://www.nseindia.com/", alias="NIRVESTA_NSE_REFERER")
    market_symbols: list[str] = Field(
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
    portfolio_holdings: dict[str, float] = Field(
        default_factory=lambda: {
            "INFY": 12,
            "HDFCBANK": 18,
            "RELIANCE": 8,
            "ITC": 150,
            "SBIN": 25,
            "NIFTYBEES": 80,
            "GOLDBEES": 60,
        },
        alias="NIRVESTA_PORTFOLIO_HOLDINGS",
    )
    market_cache_ttl_seconds: int = Field(default=60, alias="NIRVESTA_MARKET_CACHE_TTL_SECONDS")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
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
