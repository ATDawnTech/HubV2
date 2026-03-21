import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from src.adthub.config import settings
from src.adthub.db.models import Base  # noqa: F401 — registers all models


@pytest.fixture(scope="session")
def db_engine():
    engine = create_engine(settings.test_database_url)
    Base.metadata.create_all(engine)
    yield engine


@pytest.fixture(scope="function")
def db_session(db_engine):
    connection = db_engine.connect()
    transaction = connection.begin()
    session = sessionmaker(bind=connection)()
    yield session
    session.close()
    transaction.rollback()
    connection.close()
