import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from src.adthub.config import settings
from src.adthub.db.models import Base  # noqa: F401 — registers all models


@pytest.fixture(scope="session")
def db_engine():
    """Create test database engine. Schema created once per session, dropped after."""
    engine = create_engine(settings.test_database_url)
    Base.metadata.create_all(engine)
    yield engine
    Base.metadata.drop_all(engine)


@pytest.fixture(scope="function")
def db_session(db_engine):
    """Provide a transactional session that rolls back after each test.

    Each test gets a clean database state without requiring a full reset.
    """
    connection = db_engine.connect()
    transaction = connection.begin()
    session = sessionmaker(bind=connection)()

    yield session

    session.close()
    transaction.rollback()
    connection.close()
