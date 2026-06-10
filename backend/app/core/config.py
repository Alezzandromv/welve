from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    mongodb_url: str
    database_name: str = "welve"
    secret_key: str
    access_token_expire_minutes: int = 60
    redis_url: str = "redis://localhost:6379"
    whatsapp_token: str = ""
    whatsapp_phone_id: str = ""
    environment: str = "development"
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    app_url: str = "http://localhost:5173"


settings = Settings()
