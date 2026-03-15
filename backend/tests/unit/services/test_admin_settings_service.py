"""Unit tests for AdminSettingsService (Epic 3.1 — Dropdown Settings).

All tests use mock repositories — no database is touched.
"""

import pytest
from unittest.mock import MagicMock

from src.adthub.db.models.config_tables import ConfigDropdown
from src.adthub.exceptions import ConflictError, ResourceNotFoundError, ValidationError
from src.adthub.services.admin_settings_service import AdminSettingsService


def _make_dropdown(value: str = "Full Time", module: str = "employees", category: str = "hire_type") -> ConfigDropdown:
    d = ConfigDropdown()
    d.id = "cd_abc123"
    d.module = module
    d.category = category
    d.value = value
    d.sort_order = 0
    d.is_active = True
    d.created_by = None
    return d


def _make_service(mock_repo: MagicMock, mock_employee_repo: MagicMock | None = None) -> AdminSettingsService:
    return AdminSettingsService(
        repository=mock_repo,
        employee_repository=mock_employee_repo or MagicMock(),
    )


# ---------------------------------------------------------------------------
# create_dropdown
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_create_dropdown_strips_whitespace_from_value() -> None:
    """create_dropdown strips leading/trailing whitespace before saving."""
    mock_repo = MagicMock()
    mock_repo.find_by_module_category_value.return_value = None
    saved = _make_dropdown(value="Full Time")
    mock_repo.save.return_value = saved

    service = _make_service(mock_repo)
    service.create_dropdown(
        module="employees", category="hire_type",
        value="  Full Time  ", sort_order=0, created_by=None,
    )

    mock_repo.find_by_module_category_value.assert_called_once_with(
        "employees", "hire_type", "Full Time"
    )


@pytest.mark.unit
def test_create_dropdown_raises_value_error_for_blank_value() -> None:
    """create_dropdown raises ValidationError when value is empty/whitespace-only."""
    service = _make_service(MagicMock())
    with pytest.raises(ValidationError, match="must not be blank"):
        service.create_dropdown(
            module="employees", category="hire_type",
            value="   ", sort_order=0, created_by=None,
        )


@pytest.mark.unit
def test_create_dropdown_raises_conflict_on_duplicate() -> None:
    """create_dropdown raises ConflictError if (module, category, value) already exists."""
    mock_repo = MagicMock()
    mock_repo.find_by_module_category_value.return_value = _make_dropdown()

    service = _make_service(mock_repo)
    with pytest.raises(ConflictError):
        service.create_dropdown(
            module="employees", category="hire_type",
            value="Full Time", sort_order=0, created_by=None,
        )


@pytest.mark.unit
def test_create_dropdown_stores_created_by() -> None:
    """create_dropdown passes the created_by user_id to the saved row."""
    mock_repo = MagicMock()
    mock_repo.find_by_module_category_value.return_value = None
    captured = {}

    def _save(entry):
        captured["created_by"] = entry.created_by
        return entry

    mock_repo.save.side_effect = _save

    service = _make_service(mock_repo)
    service.create_dropdown(
        module="employees", category="hire_type",
        value="Contractor", sort_order=1, created_by="emp_user123",
    )

    assert captured["created_by"] == "emp_user123"


# ---------------------------------------------------------------------------
# update_dropdown
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_update_dropdown_raises_not_found_for_unknown_id() -> None:
    """update_dropdown raises ResourceNotFoundError when dropdown ID doesn't exist."""
    mock_repo = MagicMock()
    mock_repo.find_by_id.return_value = None

    service = _make_service(mock_repo)
    with pytest.raises(ResourceNotFoundError):
        service.update_dropdown(dropdown_id="cd_missing", new_value=None, new_sort_order=None, is_active=None)


@pytest.mark.unit
def test_update_dropdown_raises_conflict_when_new_value_duplicates_existing() -> None:
    """update_dropdown raises ConflictError if new_value already exists in same module/category."""
    existing = _make_dropdown(value="Full Time")
    conflict = _make_dropdown(value="Part Time")
    mock_repo = MagicMock()
    mock_repo.find_by_id.return_value = existing
    mock_repo.find_by_module_category_value.return_value = conflict

    service = _make_service(mock_repo)
    with pytest.raises(ConflictError):
        service.update_dropdown(
            dropdown_id="cd_abc123", new_value="Part Time",
            new_sort_order=None, is_active=None,
        )


@pytest.mark.unit
def test_update_dropdown_propagates_rename_to_employee_column() -> None:
    """update_dropdown calls propagate_column_rename on EmployeeRepository when category maps to an employee column."""
    existing = _make_dropdown(value="Old Dept", module="employees", category="department")
    mock_repo = MagicMock()
    mock_repo.find_by_id.return_value = existing
    mock_repo.find_by_module_category_value.return_value = None  # no conflict
    mock_repo.save.return_value = existing
    mock_employee_repo = MagicMock()

    service = _make_service(mock_repo, mock_employee_repo)
    service.update_dropdown(
        dropdown_id="cd_abc123", new_value="New Dept",
        new_sort_order=None, is_active=None,
    )

    mock_employee_repo.propagate_column_rename.assert_called_once_with(
        "department", "Old Dept", "New Dept"
    )


@pytest.mark.unit
def test_update_dropdown_skips_propagation_for_non_employee_module() -> None:
    """update_dropdown does NOT call propagate_column_rename for modules with no employee column mapping."""
    existing = _make_dropdown(value="Stage A", module="ats", category="stage")
    mock_repo = MagicMock()
    mock_repo.find_by_id.return_value = existing
    mock_repo.find_by_module_category_value.return_value = None
    mock_repo.save.return_value = existing
    mock_employee_repo = MagicMock()

    service = _make_service(mock_repo, mock_employee_repo)
    service.update_dropdown(
        dropdown_id="cd_abc123", new_value="Stage B",
        new_sort_order=None, is_active=None,
    )

    mock_employee_repo.propagate_column_rename.assert_not_called()


@pytest.mark.unit
def test_update_dropdown_updates_sort_order_and_is_active() -> None:
    """update_dropdown patches sort_order and is_active when provided."""
    existing = _make_dropdown()
    existing.sort_order = 0
    existing.is_active = True
    mock_repo = MagicMock()
    mock_repo.find_by_id.return_value = existing
    mock_repo.save.return_value = existing

    service = _make_service(mock_repo)
    service.update_dropdown(
        dropdown_id="cd_abc123", new_value=None,
        new_sort_order=5, is_active=False,
    )

    assert existing.sort_order == 5
    assert existing.is_active is False
