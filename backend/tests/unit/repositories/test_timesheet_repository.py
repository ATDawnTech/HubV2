import pytest
from unittest.mock import MagicMock
from src.adthub.db.repositories.timesheet_repository import TimesheetRepository
from src.adthub.exceptions import ResourceNotFoundError
from tests.factories.timesheet_factory import TimesheetFactory, ApprovedTimesheetFactory


def _mock_query_chain(mock_session, return_value):
    """Set up mock_session.query().filter().first() chain to return a value."""
    mock_session.query.return_value.filter.return_value.first.return_value = return_value
    return mock_session


@pytest.mark.unit
def test_find_by_id_returns_timesheet_when_session_returns_one(mock_session) -> None:
    """TimesheetRepository.find_by_id returns the timesheet returned by the query."""
    expected = TimesheetFactory()
    _mock_query_chain(mock_session, expected)

    repo = TimesheetRepository(mock_session)
    result = repo.find_by_id(expected.id)

    assert result == expected


@pytest.mark.unit
def test_find_by_id_returns_none_when_session_returns_none(mock_session) -> None:
    """TimesheetRepository.find_by_id returns None when query returns nothing."""
    _mock_query_chain(mock_session, None)

    repo = TimesheetRepository(mock_session)
    result = repo.find_by_id("ts_missing")

    assert result is None


@pytest.mark.unit
def test_save_calls_session_add_and_flush(mock_session) -> None:
    """TimesheetRepository.save calls session.add and session.flush."""
    ts = TimesheetFactory()

    repo = TimesheetRepository(mock_session)
    result = repo.save(ts)

    mock_session.add.assert_called_once_with(ts)
    mock_session.flush.assert_called_once()
    assert result == ts


@pytest.mark.unit
def test_soft_delete_sets_deleted_at_on_entity(mock_session) -> None:
    """TimesheetRepository.soft_delete sets deleted_at and flushes."""
    ts = TimesheetFactory()
    assert ts.deleted_at is None

    repo = TimesheetRepository(mock_session)
    repo.find_by_id = MagicMock(return_value=ts)

    repo.soft_delete(ts.id)

    assert ts.deleted_at is not None
    mock_session.flush.assert_called_once()


@pytest.mark.unit
def test_soft_delete_raises_error_when_timesheet_not_found(mock_session) -> None:
    """TimesheetRepository.soft_delete raises ResourceNotFoundError for missing ID."""
    repo = TimesheetRepository(mock_session)
    repo.find_by_id = MagicMock(return_value=None)

    with pytest.raises(ResourceNotFoundError):
        repo.soft_delete("ts_doesnotexist")


@pytest.mark.unit
def test_find_by_employee_returns_timesheets_list(mock_session) -> None:
    """TimesheetRepository.find_by_employee returns all timesheets for the employee."""
    employee_id = "emp_abc123456789"
    timesheets = [TimesheetFactory(employee_id=employee_id) for _ in range(3)]
    (mock_session.query.return_value
     .filter.return_value
     .order_by.return_value
     .limit.return_value
     .all.return_value) = timesheets

    repo = TimesheetRepository(mock_session)
    results = repo.find_by_employee(employee_id)

    assert results == timesheets
    mock_session.query.assert_called_once()


@pytest.mark.unit
def test_find_by_project_returns_timesheets_list(mock_session) -> None:
    """TimesheetRepository.find_by_project returns all timesheets for the project."""
    project_id = "proj_xyz987654321"
    timesheets = [TimesheetFactory(project_id=project_id) for _ in range(2)]
    (mock_session.query.return_value
     .filter.return_value
     .order_by.return_value
     .limit.return_value
     .all.return_value) = timesheets

    repo = TimesheetRepository(mock_session)
    results = repo.find_by_project(project_id)

    assert results == timesheets
    mock_session.query.assert_called_once()


@pytest.mark.unit
def test_find_by_status_returns_filtered_timesheets(mock_session) -> None:
    """TimesheetRepository.find_by_status returns timesheets matching the given status."""
    timesheets = [TimesheetFactory(status="submitted") for _ in range(2)]
    (mock_session.query.return_value
     .filter.return_value
     .order_by.return_value
     .limit.return_value
     .all.return_value) = timesheets

    repo = TimesheetRepository(mock_session)
    results = repo.find_by_status("submitted")

    assert results == timesheets
    mock_session.query.assert_called_once()
