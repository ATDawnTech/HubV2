"""Business logic for Epic 3 – Admin System Settings.

Sub-module 3.1: Dropdown Settings
  - CRUD for config_dropdown entries.
  - Global rename propagation: renaming a value updates all referencing employee records.
  - Deduplication enforcement: duplicate (module, category, value) is rejected.
"""

import secrets
from datetime import UTC, datetime

from ..db.models.config_tables import ConfigDropdown
from ..db.repositories.config_dropdown_repository import ConfigDropdownRepository
from ..db.repositories.employee_repository import EmployeeRepository
from ..exceptions import ConflictError, ResourceNotFoundError, ValidationError

# Modules and categories whose values are stored as plain text in employee rows.
# When a dropdown value is renamed the employee table must be updated too.
_EMPLOYEE_COLUMN_MAP: dict[tuple[str, str], str] = {
    ("employees", "department"): "department",
    ("employees", "hire_type"): "hire_type",
    ("employees", "work_mode"): "work_mode",
    ("global", "location"): "location",
}


class AdminSettingsService:
    def __init__(
        self,
        repository: ConfigDropdownRepository,
        employee_repository: EmployeeRepository,
    ) -> None:
        self._repo = repository
        self._employee_repo = employee_repository

    # ------------------------------------------------------------------
    # List / read
    # ------------------------------------------------------------------

    def list_dropdowns(
        self,
        module: str | None,
        category: str | None,
        active_only: bool,
        limit: int,
        cursor: str | None,
    ) -> tuple[list[ConfigDropdown], int, str | None]:
        """Return a paginated list plus total count and next_cursor."""
        rows = self._repo.find_all_paginated(module, category, active_only, limit, cursor)
        total = self._repo.count(module, category, active_only)

        has_next = len(rows) > limit
        page = rows[:limit]
        next_cursor = page[-1].id if has_next else None

        return page, total, next_cursor

    def get_options(self, module: str, category: str | None = None) -> list[ConfigDropdown]:
        """Return all active dropdown options for a module (optionally filtered by category).

        Used by consumer modules (e.g., Employee forms) to populate select controls.
        """
        return self._repo.find_by_module(module, category=category, active_only=True)

    # ------------------------------------------------------------------
    # Create
    # ------------------------------------------------------------------

    def create_dropdown(
        self,
        module: str,
        category: str,
        value: str,
        sort_order: int,
        created_by: str | None,
    ) -> ConfigDropdown:
        """Add a new dropdown option. Raises ConflictError on duplicate."""
        value = value.strip()
        if not value:
            raise ValidationError("Dropdown value must not be blank.")

        existing = self._repo.find_by_module_category_value(module, category, value)
        if existing is not None:
            raise ConflictError(
                f"Dropdown value '{value}' already exists in {module}/{category}."
            )

        entry = ConfigDropdown(
            id=f"cd_{secrets.token_hex(8)}",
            module=module,
            category=category,
            value=value,
            sort_order=sort_order,
            is_active=True,
            created_by=created_by,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        return self._repo.save(entry)

    # ------------------------------------------------------------------
    # Update
    # ------------------------------------------------------------------

    def update_dropdown(
        self,
        dropdown_id: str,
        new_value: str | None,
        new_sort_order: int | None,
        is_active: bool | None,
    ) -> ConfigDropdown:
        """Update a dropdown entry.

        If the value is changed, propagates the rename to all referencing employee records
        so data integrity is maintained across the system (Logic Contract 3.1).
        """
        entry = self._repo.find_by_id(dropdown_id)
        if entry is None:
            raise ResourceNotFoundError(f"Dropdown '{dropdown_id}' not found.")

        now = datetime.now(UTC)

        if new_value is not None:
            new_value = new_value.strip()
            if not new_value:
                raise ValidationError("Dropdown value must not be blank.")
            if new_value != entry.value:
                # Deduplication check
                conflict = self._repo.find_by_module_category_value(
                    entry.module, entry.category, new_value
                )
                if conflict is not None:
                    raise ConflictError(
                        f"Dropdown value '{new_value}' already exists in "
                        f"{entry.module}/{entry.category}."
                    )
                # Global rename propagation for employee columns.
                # The column name `col` is sourced exclusively from the hardcoded
                # _EMPLOYEE_COLUMN_MAP above — never from user input.
                col = _EMPLOYEE_COLUMN_MAP.get((entry.module, entry.category))
                if col:
                    self._employee_repo.propagate_column_rename(col, entry.value, new_value)
                entry.value = new_value

        if new_sort_order is not None:
            entry.sort_order = new_sort_order

        if is_active is not None:
            entry.is_active = is_active

        entry.updated_at = now
        return self._repo.save(entry)

    # ------------------------------------------------------------------
    # Reassign
    # ------------------------------------------------------------------

    def reassign_employees(
        self,
        module: str,
        category: str,
        from_value: str,
        to_value: str,
    ) -> int:
        """Bulk-update all employee records that reference from_value to use to_value.

        Returns the number of affected rows. If the module/category pair is not
        linked to an employee column, returns 0 without error.
        """
        col = _EMPLOYEE_COLUMN_MAP.get((module, category))
        if not col:
            return 0

        # The column name `col` is sourced exclusively from the hardcoded
        # _EMPLOYEE_COLUMN_MAP above — never from user input.
        return self._employee_repo.bulk_reassign_column(col, from_value, to_value)

    # ------------------------------------------------------------------
    # Delete
    # ------------------------------------------------------------------

    def delete_dropdown(self, dropdown_id: str) -> None:
        """Soft-delete a dropdown option."""
        self._repo.soft_delete(dropdown_id)
