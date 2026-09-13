from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str  # postgresql+asyncpg://... (Supabase Postgres)
    secret_key: str
    access_token_expire_minutes: int = 60
    redis_url: str = "redis://localhost:6379"
    whatsapp_token: str = ""
    whatsapp_phone_id: str = ""
    whatsapp_verify_token: str = ""
    environment: str = "development"
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    app_url: str = "http://localhost:5173"
    db_pool_size: int = 5
    db_max_overflow: int = 5

    @field_validator("secret_key")
    @classmethod
    def _validar_longitud_secret_key(cls, v: str) -> str:
        if len(v) < 32:
            raise ValueError("secret_key debe tener al menos 32 caracteres (ej.: `openssl rand -hex 32`)")
        return v


settings = Settings()
