import pytest
from unittest.mock import MagicMock
from src.adthub.db.repositories.employee_repository import EmployeeRepository
from src.adthub.exceptions import ResourceNotFoundError
from tests.factories.employee_factory import EmployeeFactory, ArchivedEmployeeFactory


def _mock_query_chain(mock_session, return_value):
    """Set up mock_session.query().filter().first() chain to return a value."""
    mock_session.query.return_value.filter.return_value.first.return_value = return_value
    return mock_session


@pytest.mark.unit
def test_find_by_id_returns_employee_when_session_returns_one(mock_session) -> None:
    """EmployeeRepository.find_by_id returns the employee returned by the query."""
    expected = EmployeeFactory()
    _mock_query_chain(mock_session, expected)

    repo = EmployeeRepository(mock_session)
    result = repo.find_by_id(expected.id)

    assert result == expected


@pytest.mark.unit
def test_find_by_id_returns_none_when_session_returns_none(mock_session) -> None:
    """EmployeeRepository.find_by_id returns None when query returns nothing."""
    _mock_query_chain(mock_session, None)

    repo = EmployeeRepository(mock_session)
    result = repo.find_by_id("emp_missing")

    assert result is None


@pytest.mark.unit
def test_save_calls_session_add_and_flush(mock_session) -> None:
    """EmployeeRepository.save calls session.add and session.flush."""
    employee = EmployeeFactory()

    repo = EmployeeRepository(mock_session)
    result = repo.save(employee)

    mock_session.add.assert_called_once_with(employee)
    mock_session.flush.assert_called_once()
    assert result == employee


@pytest.mark.unit
def test_soft_delete_sets_deleted_at_on_entity(mock_session) -> None:
    """EmployeeRepository.soft_delete sets deleted_at and flushes."""
    employee = EmployeeFactory()
    assert employee.deleted_at is None

    repo = EmployeeRepository(mock_session)
    repo.find_by_id = MagicMock(return_value=employee)

    repo.soft_delete(employee.id)

    assert employee.deleted_at is not None
    mock_session.flush.assert_called_once()


@pytest.mark.unit
def test_soft_delete_raises_error_when_employee_not_found(mock_session) -> None:
    """EmployeeRepository.soft_delete raises ResourceNotFoundError for missing ID."""
    repo = EmployeeRepository(mock_session)
    repo.find_by_id = MagicMock(return_value=None)

    with pytest.raises(ResourceNotFoundError):
        repo.soft_delete("emp_doesnotexist")


@pytest.mark.unit
def test_find_by_email_returns_none_when_session_returns_none(mock_session) -> None:
    """EmployeeRepository.find_by_email returns None when no match found."""
    _mock_query_chain(mock_session, None)

    repo = EmployeeRepository(mock_session)
    result = repo.find_by_email("nobody@example.com")

    assert result is None


@pytest.mark.unit
def test_find_by_email_returns_employee_when_session_returns_one(mock_session) -> None:
    """EmployeeRepository.find_by_email returns the matched employee."""
    employee = EmployeeFactory(work_email="alice@example.com")
    _mock_query_chain(mock_session, employee)

    repo = EmployeeRepository(mock_session)
    result = repo.find_by_email("alice@example.com")

    assert result == employee


@pytest.mark.unit
def test_find_all_returns_list_from_session(mock_session) -> None:
    """EmployeeRepository.find_all returns the list returned by the query."""
    employees = [EmployeeFactory(), EmployeeFactory()]
    # find_all uses: query().filter().order_by().limit().all()
    (mock_session.query.return_value
     .filter.return_value
     .order_by.return_value
     .limit.return_value
     .all.return_value) = employees

    repo = EmployeeRepository(mock_session)
    results = repo.find_all(limit=20)

    assert results == employees


@pytest.mark.unit
def test_find_all_returns_empty_list_when_no_results(mock_session) -> None:
    """EmployeeRepository.find_all returns empty list when query returns none."""
    (mock_session.query.return_value
     .filter.return_value
     .order_by.return_value
     .limit.return_value
     .all.return_value) = []

    repo = EmployeeRepository(mock_session)
    results = repo.find_all()

    assert results == []
