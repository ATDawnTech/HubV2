import pytest
from src.adthub.db.repositories.employee_repository import EmployeeRepository
from src.adthub.exceptions import ResourceNotFoundError
from tests.factories.employee_factory import EmployeeFactory, ArchivedEmployeeFactory


@pytest.mark.integration
def test_find_by_id_returns_employee_when_found(db_session) -> None:
    """EmployeeRepository.find_by_id returns the correct employee."""
    employee = EmployeeFactory()
    db_session.add(employee)
    db_session.flush()

    repo = EmployeeRepository(db_session)
    result = repo.find_by_id(employee.id)

    assert result is not None
    assert result.id == employee.id
    assert result.work_email == employee.work_email


@pytest.mark.integration
def test_find_by_id_returns_none_when_not_found(db_session) -> None:
    """EmployeeRepository.find_by_id returns None for non-existent ID."""
    repo = EmployeeRepository(db_session)
    result = repo.find_by_id("emp_doesnotexist")
    assert result is None


@pytest.mark.integration
def test_find_by_id_returns_none_when_soft_deleted(db_session) -> None:
    """EmployeeRepository.find_by_id does not return soft-deleted employees."""
    employee = ArchivedEmployeeFactory()
    db_session.add(employee)
    db_session.flush()

    repo = EmployeeRepository(db_session)
    result = repo.find_by_id(employee.id)

    assert result is None


@pytest.mark.integration
def test_find_all_returns_employees(db_session) -> None:
    """EmployeeRepository.find_all returns all active employees."""
    emp1 = EmployeeFactory()
    emp2 = EmployeeFactory()
    db_session.add_all([emp1, emp2])
    db_session.flush()

    repo = EmployeeRepository(db_session)
    results = repo.find_all()

    ids = [r.id for r in results]
    assert emp1.id in ids
    assert emp2.id in ids


@pytest.mark.integration
def test_find_all_returns_empty_list_when_no_employees(db_session) -> None:
    """EmployeeRepository.find_all returns empty list when no employees exist."""
    repo = EmployeeRepository(db_session)
    results = repo.find_all()
    assert results == []


@pytest.mark.integration
def test_find_all_excludes_soft_deleted_employees(db_session) -> None:
    """EmployeeRepository.find_all does not return soft-deleted employees."""
    active = EmployeeFactory()
    deleted = ArchivedEmployeeFactory()
    db_session.add_all([active, deleted])
    db_session.flush()

    repo = EmployeeRepository(db_session)
    results = repo.find_all()
    result_ids = [r.id for r in results]

    assert active.id in result_ids
    assert deleted.id not in result_ids


@pytest.mark.integration
def test_find_all_paginates_with_cursor(db_session) -> None:
    """EmployeeRepository.find_all returns the next page when cursor is provided."""
    employees = [EmployeeFactory() for _ in range(5)]
    employees.sort(key=lambda e: e.id)
    db_session.add_all(employees)
    db_session.flush()

    repo = EmployeeRepository(db_session)
    first_page = repo.find_all(limit=2)
    assert len(first_page) <= 3  # limit+1

    cursor = first_page[1].id
    second_page = repo.find_all(limit=2, cursor=cursor)
    assert all(e.id > cursor for e in second_page)


@pytest.mark.integration
def test_save_creates_employee_with_all_fields(db_session) -> None:
    """EmployeeRepository.save persists a new employee with correct field values."""
    employee = EmployeeFactory(
        first_name="Alice",
        last_name="Smith",
        status="active",
    )

    repo = EmployeeRepository(db_session)
    saved = repo.save(employee)

    assert saved.id == employee.id
    assert saved.first_name == "Alice"
    assert saved.last_name == "Smith"
    assert saved.status == "active"
    assert saved.deleted_at is None


@pytest.mark.integration
def test_save_updates_employee_fields(db_session) -> None:
    """EmployeeRepository.save updates an existing employee."""
    employee = EmployeeFactory()
    db_session.add(employee)
    db_session.flush()

    employee.first_name = "Updated"
    repo = EmployeeRepository(db_session)
    repo.save(employee)

    result = repo.find_by_id(employee.id)
    assert result.first_name == "Updated"


@pytest.mark.integration
def test_soft_delete_sets_deleted_at(db_session) -> None:
    """EmployeeRepository.soft_delete sets deleted_at on the record."""
    employee = EmployeeFactory()
    db_session.add(employee)
    db_session.flush()

    repo = EmployeeRepository(db_session)
    repo.soft_delete(employee.id)

    # Re-query directly (bypassing soft delete filter)
    from src.adthub.db.models.employees import Employee
    raw = db_session.query(Employee).filter(Employee.id == employee.id).first()
    assert raw.deleted_at is not None


@pytest.mark.integration
def test_soft_delete_record_no_longer_returned(db_session) -> None:
    """EmployeeRepository.soft_delete causes find_by_id to return None."""
    employee = EmployeeFactory()
    db_session.add(employee)
    db_session.flush()

    repo = EmployeeRepository(db_session)
    repo.soft_delete(employee.id)

    result = repo.find_by_id(employee.id)
    assert result is None


@pytest.mark.integration
def test_soft_delete_raises_error_when_not_found(db_session) -> None:
    """EmployeeRepository.soft_delete raises ResourceNotFoundError for missing ID."""
    repo = EmployeeRepository(db_session)
    with pytest.raises(ResourceNotFoundError):
        repo.soft_delete("emp_doesnotexist")


@pytest.mark.integration
def test_find_by_email_returns_employee_when_found(db_session) -> None:
    """EmployeeRepository.find_by_email returns employee with matching email."""
    employee = EmployeeFactory(work_email="alice@example.com")
    db_session.add(employee)
    db_session.flush()

    repo = EmployeeRepository(db_session)
    result = repo.find_by_email("alice@example.com")

    assert result is not None
    assert result.id == employee.id


@pytest.mark.integration
def test_find_by_email_returns_none_when_not_found(db_session) -> None:
    """EmployeeRepository.find_by_email returns None for unregistered email."""
    repo = EmployeeRepository(db_session)
    result = repo.find_by_email("nobody@example.com")
    assert result is None


@pytest.mark.integration
def test_find_active_returns_only_active_employees(db_session) -> None:
    """EmployeeRepository.find_active returns only employees with status=active."""
    active = EmployeeFactory(status="active")
    archived = EmployeeFactory(status="archived")
    db_session.add_all([active, archived])
    db_session.flush()

    repo = EmployeeRepository(db_session)
    results = repo.find_active()
    result_ids = [r.id for r in results]

    assert active.id in result_ids
    assert archived.id not in result_ids
