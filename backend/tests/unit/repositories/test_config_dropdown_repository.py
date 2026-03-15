"""Unit tests for ConfigDropdownRepository — all dependencies mocked."""

import pytest
from unittest.mock import MagicMock

from src.adthub.db.repositories.config_dropdown_repository import ConfigDropdownRepository
from src.adthub.db.models.config_tables import ConfigDropdown


def _make_dropdown(module: str = "employees", category: str = "hire_type", value: str = "Full Time") -> ConfigDropdown:
    d = ConfigDropdown()
    d.id = "cd_test001"
    d.module = module
    d.category = category
    d.value = value
    d.sort_order = 0
    d.is_active = True
    d.deleted_at = None
    return d


# ---------------------------------------------------------------------------
# find_by_module
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_find_by_module_returns_list_from_query(mock_session) -> None:
    """find_by_module returns the list returned by the query chain."""
    dropdowns = [_make_dropdown(), _make_dropdown(value="Part Time")]
    (
        mock_session.query.return_value
        .filter.return_value
        .filter.return_value
        .order_by.return_value
        .all.return_value
    ) = dropdowns

    repo = ConfigDropdownRepository(mock_session)
    result = repo.find_by_module("employees")

    assert result == dropdowns


@pytest.mark.unit
def test_find_by_module_returns_empty_list_when_none_found(mock_session) -> None:
    """find_by_module returns [] when the query yields no rows."""
    (
        mock_session.query.return_value
        .filter.return_value
        .filter.return_value
        .order_by.return_value
        .all.return_value
    ) = []

    repo = ConfigDropdownRepository(mock_session)
    result = repo.find_by_module("employees")

    assert result == []


@pytest.mark.unit
def test_find_by_module_with_category_adds_filter(mock_session) -> None:
    """find_by_module with category applies an additional filter."""
    dropdowns = [_make_dropdown(category="department")]
    (
        mock_session.query.return_value
        .filter.return_value
        .filter.return_value
        .filter.return_value
        .order_by.return_value
        .all.return_value
    ) = dropdowns

    repo = ConfigDropdownRepository(mock_session)
    result = repo.find_by_module("employees", category="department")

    assert result == dropdowns


# ---------------------------------------------------------------------------
# find_by_module_category_value
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_find_by_module_category_value_returns_match(mock_session) -> None:
    """find_by_module_category_value returns the matching dropdown."""
    dropdown = _make_dropdown()
    mock_session.query.return_value.filter.return_value.first.return_value = dropdown

    repo = ConfigDropdownRepository(mock_session)
    result = repo.find_by_module_category_value("employees", "hire_type", "Full Time")

    assert result == dropdown


@pytest.mark.unit
def test_find_by_module_category_value_returns_none_when_missing(mock_session) -> None:
    """find_by_module_category_value returns None when no match exists."""
    mock_session.query.return_value.filter.return_value.first.return_value = None

    repo = ConfigDropdownRepository(mock_session)
    result = repo.find_by_module_category_value("employees", "hire_type", "Ghost")

    assert result is None


# ---------------------------------------------------------------------------
# find_all_paginated
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_find_all_paginated_returns_list_from_query(mock_session) -> None:
    """find_all_paginated returns the rows from the query chain."""
    dropdowns = [_make_dropdown(), _make_dropdown(value="Contract")]
    (
        mock_session.query.return_value
        .filter.return_value
        .order_by.return_value
        .limit.return_value
        .all.return_value
    ) = dropdowns

    repo = ConfigDropdownRepository(mock_session)
    result = repo.find_all_paginated(
        module=None, category=None, active_only=False, limit=50, cursor=None
    )

    assert result == dropdowns


@pytest.mark.unit
def test_find_all_paginated_returns_empty_list_when_no_rows(mock_session) -> None:
    """find_all_paginated returns [] when there are no matching dropdowns."""
    # module="employees" and active_only=True each add a .filter() call (2 extra)
    (
        mock_session.query.return_value
        .filter.return_value
        .filter.return_value
        .filter.return_value
        .order_by.return_value
        .limit.return_value
        .all.return_value
    ) = []

    repo = ConfigDropdownRepository(mock_session)
    result = repo.find_all_paginated(
        module="employees", category=None, active_only=True, limit=20, cursor=None
    )

    assert result == []


# ---------------------------------------------------------------------------
# count
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_count_returns_integer_from_query(mock_session) -> None:
    """count returns the integer count from the query chain."""
    mock_session.query.return_value.filter.return_value.count.return_value = 7

    repo = ConfigDropdownRepository(mock_session)
    result = repo.count(module=None, category=None, active_only=False)

    assert result == 7


@pytest.mark.unit
def test_count_returns_zero_when_no_rows(mock_session) -> None:
    """count returns 0 when no rows match."""
    # module + category + active_only each add a .filter() (3 extra on top of deleted_at)
    (
        mock_session.query.return_value
        .filter.return_value
        .filter.return_value
        .filter.return_value
        .filter.return_value
        .count.return_value
    ) = 0

    repo = ConfigDropdownRepository(mock_session)
    result = repo.count(module="employees", category="hire_type", active_only=True)

    assert result == 0
