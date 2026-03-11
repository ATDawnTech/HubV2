import pytest
from unittest.mock import MagicMock
from sqlalchemy.orm import Session


@pytest.fixture
def mock_session() -> MagicMock:
    """Mock SQLAlchemy session for unit tests."""
    return MagicMock(spec=Session)
