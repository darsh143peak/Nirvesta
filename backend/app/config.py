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


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
