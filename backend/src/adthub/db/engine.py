from collections.abc import Generator
from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from ..config import settings

_db_url = settings.database_url

if _db_url:
    engine = create_engine(
        _db_url,
        pool_size=10,
        max_overflow=20,
        pool_timeout=30,
        pool_recycle=1800,
        pool_pre_ping=True,
        echo=settings.debug,
    )
else:
    # No DATABASE_URL set — fall back to an in-memory SQLite engine so that
    # module imports succeed during unit-test collection without a real DB.
    # Any code that actually executes a query against this engine will fail
    # immediately, making misconfiguration obvious.
    engine = create_engine("sqlite:///:memory:", echo=settings.debug)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@contextmanager
def get_db_session() -> Generator[Session, None, None]:
    """Provide a transactional database session. Commits on success, rolls back on exception."""
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
