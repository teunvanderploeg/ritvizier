from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(".env", "backend/.env"), extra="ignore")
    database_url: str | None = None
    cache_ttl_seconds: int = 21600
    cors_origins: str = "http://localhost:3000"
    rate_limit_per_minute: int = 30
    rdw_app_token: SecretStr | None = None
    rdw_timeout_seconds: float = Field(default=8, gt=0, le=20)
    apk_notice_days: int = Field(default=60, ge=1, le=365)
    apk_urgent_days: int = Field(default=30, ge=0, le=365)
    recent_registration_days: int = Field(default=30, ge=1, le=365)


settings = Settings()
