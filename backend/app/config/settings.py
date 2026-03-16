from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    debug: bool
    app_name: str
    google_client_id: str
    google_client_secret: str
    mail_username: str
    mail_password: str
    frontend_url: str
    
    # JWT configuration
    jwt_secret_key: str
    jwt_expiration_minutes: int = 60 * 24 * 7  # 7 days

    class Config:
        env_file = ".env"


settings = Settings()