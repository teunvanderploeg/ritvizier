from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file="backend/.env", extra="ignore")
    database_url: str | None = None
    cache_ttl_seconds: int = 21600
    cors_origins: str = "http://localhost:3000"
    rate_limit_per_minute: int = 30


settings = Settings()
