from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""

    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""

    admin_secret_key: str = "change-me-in-production"

    frontend_url: str = "http://localhost:3000"
    environment: str = "development"

    exchange_rate_api_key: Optional[str] = None

    # Mosaic constants (unchanged from reference script)
    min_tiles: int = 2000
    neighbor_radius: int = 4
    top_k: int = 24

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
