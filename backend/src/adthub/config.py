from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""

    database_url: str = ""
    test_database_url: str = ""
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

    # Microsoft Entra SSO — required in all deployed environments.
    # Set via SSM-injected environment variables. For local dev, set in .env.
    azure_client_id: str = ""
    azure_tenant_id: str = ""
    azure_client_secret: str = ""
    # The backend callback URL registered in Entra. Must match exactly.
    azure_redirect_uri: str = "http://localhost:8000/v1/auth/callback"
    # The public URL of the frontend — used to build the post-auth redirect.
    frontend_url: str = "http://localhost:5173"
    # Entra group Object IDs — map to app roles on login.
    azure_sysadmin_group_id: str = ""
    azure_developer_group_id: str = ""
    azure_user_group_id: str = ""
    entra_sync_interval_hours: int = 4

    model_config = {"env_file": ".env", "extra": "ignore"}

    def get_allowed_origins(self) -> list[str]:
        """Parse allowed_origins into a list, stripping whitespace."""
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


settings = Settings()
