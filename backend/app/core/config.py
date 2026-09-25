from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Social Platform"
    database_url: str
    jwt_secret: str
    access_token_minutes: int = 15
    refresh_token_days: int = 14
    cookie_secure: bool = False  # set True in production (HTTPS)
    cors_origins: list[str] = ["http://localhost:3000"]


settings = Settings()