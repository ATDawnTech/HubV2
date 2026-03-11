import pytest
from unittest.mock import MagicMock
from src.adthub.db.repositories.project_repository import ProjectRepository
from src.adthub.exceptions import ResourceNotFoundError
from tests.factories.project_factory import ProjectFactory, ActiveProjectFactory


def _mock_query_chain(mock_session, return_value):
    """Set up mock_session.query().filter().first() chain to return a value."""
    mock_session.query.return_value.filter.return_value.first.return_value = return_value
    return mock_session


@pytest.mark.unit
def test_find_by_id_returns_project_when_session_returns_one(mock_session) -> None:
    """ProjectRepository.find_by_id returns the project returned by the query."""
    expected = ProjectFactory()
    _mock_query_chain(mock_session, expected)

    repo = ProjectRepository(mock_session)
    result = repo.find_by_id(expected.id)

    assert result == expected


@pytest.mark.unit
def test_find_by_id_returns_none_when_session_returns_none(mock_session) -> None:
    """ProjectRepository.find_by_id returns None when query returns nothing."""
    _mock_query_chain(mock_session, None)

    repo = ProjectRepository(mock_session)
    result = repo.find_by_id("proj_missing")

    assert result is None


@pytest.mark.unit
def test_save_calls_session_add_and_flush(mock_session) -> None:
    """ProjectRepository.save calls session.add and session.flush."""
    project = ProjectFactory()

    repo = ProjectRepository(mock_session)
    result = repo.save(project)

    mock_session.add.assert_called_once_with(project)
    mock_session.flush.assert_called_once()
    assert result == project


@pytest.mark.unit
def test_soft_delete_sets_deleted_at_on_entity(mock_session) -> None:
    """ProjectRepository.soft_delete sets deleted_at and flushes."""
    project = ProjectFactory()
    assert project.deleted_at is None

    repo = ProjectRepository(mock_session)
    repo.find_by_id = MagicMock(return_value=project)

    repo.soft_delete(project.id)

    assert project.deleted_at is not None
    mock_session.flush.assert_called_once()


@pytest.mark.unit
def test_soft_delete_raises_error_when_project_not_found(mock_session) -> None:
    """ProjectRepository.soft_delete raises ResourceNotFoundError for missing ID."""
    repo = ProjectRepository(mock_session)
    repo.find_by_id = MagicMock(return_value=None)

    with pytest.raises(ResourceNotFoundError):
        repo.soft_delete("proj_doesnotexist")


@pytest.mark.unit
def test_find_all_returns_list_from_session(mock_session) -> None:
    """ProjectRepository.find_all returns the list returned by the query."""
    projects = [ProjectFactory(), ProjectFactory()]
    (mock_session.query.return_value
     .filter.return_value
     .order_by.return_value
     .limit.return_value
     .all.return_value) = projects

    repo = ProjectRepository(mock_session)
    results = repo.find_all(limit=20)

    assert results == projects


@pytest.mark.unit
def test_find_by_status_queries_by_status(mock_session) -> None:
    """ProjectRepository.find_by_status calls session query chain and returns result."""
    projects = [ActiveProjectFactory(), ActiveProjectFactory()]
    (mock_session.query.return_value
     .filter.return_value
     .order_by.return_value
     .limit.return_value
     .all.return_value) = projects

    repo = ProjectRepository(mock_session)
    results = repo.find_by_status("active")

    assert results == projects
    mock_session.query.assert_called_once()


@pytest.mark.unit
def test_find_by_manager_queries_by_manager_id(mock_session) -> None:
    """ProjectRepository.find_by_manager calls session query chain and returns result."""
    manager_id = "emp_mgr123456"
    projects = [ProjectFactory(), ProjectFactory()]
    (mock_session.query.return_value
     .filter.return_value
     .order_by.return_value
     .limit.return_value
     .all.return_value) = projects

    repo = ProjectRepository(mock_session)
    results = repo.find_by_manager(manager_id)

    assert results == projects
    mock_session.query.assert_called_once()
