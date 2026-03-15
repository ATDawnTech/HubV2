from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""

    database_url: str = "postgresql+psycopg2://adthub_admin:localpassword@localhost:5434/adthub_local"
    test_database_url: str = "postgresql+psycopg2://adthub_admin:localpassword@localhost:5434/adthub_test"
    debug: bool = False
    environment: str = "dev"
    jwt_secret: str  # Required — no default. Set via environment variable or .env file.
    # When True, all permission checks are skipped. Local development only.
    # Never set this in staging or production.
    skip_permission_checks: bool = False
    # Comma-separated list of allowed CORS origins. Set via environment variable.
    # Example: "http://localhost:5173,https://adthub.atdawntech.com"
    allowed_origins: str = "http://localhost:5173"
    log_level: str = "INFO"

    model_config = {"env_file": ".env", "extra": "ignore"}

    def get_allowed_origins(self) -> list[str]:
        """Parse allowed_origins into a list, stripping whitespace."""
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


settings = Settings()
