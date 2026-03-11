from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg2://adthub_admin:localpassword@localhost:5434/adthub_local"
    test_database_url: str = "postgresql+psycopg2://adthub_admin:localpassword@localhost:5434/adthub_test"
    debug: bool = False

    model_config = {"env_file": ".env"}


settings = Settings()
