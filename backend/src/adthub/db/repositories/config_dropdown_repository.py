"""Repository for ConfigDropdown — the sole source of truth for all dynamic
dropdown values across every module (Epic 3.1).
"""

from sqlalchemy.orm import Session

from ..models.config_tables import ConfigDropdown
from .base import BaseRepository


class ConfigDropdownRepository(BaseRepository[ConfigDropdown]):
    def __init__(self, session: Session) -> None:
        super().__init__(ConfigDropdown, session)

    # ------------------------------------------------------------------
    # Queries
    # ------------------------------------------------------------------

    def find_by_module(
        self,
        module: str,
        category: str | None = None,
        active_only: bool = True,
    ) -> list[ConfigDropdown]:
        """Return all dropdown entries for a module, optionally filtered by category."""
        query = (
            self._session.query(ConfigDropdown)
            .filter(
                ConfigDropdown.module == module,
                ConfigDropdown.deleted_at.is_(None),
            )
        )
        if category:
            query = query.filter(ConfigDropdown.category == category)
        if active_only:
            query = query.filter(ConfigDropdown.is_active.is_(True))
        return query.order_by(ConfigDropdown.sort_order, ConfigDropdown.value).all()

    def find_by_module_category_value(
        self, module: str, category: str, value: str
    ) -> ConfigDropdown | None:
        """Look up a single entry by the unique triple (module, category, value)."""
        return (
            self._session.query(ConfigDropdown)
            .filter(
                ConfigDropdown.module == module,
                ConfigDropdown.category == category,
                ConfigDropdown.value == value,
                ConfigDropdown.deleted_at.is_(None),
            )
            .first()
        )

    def find_all_paginated(
        self,
        module: str | None,
        category: str | None,
        active_only: bool,
        limit: int,
        cursor: str | None,
    ) -> list[ConfigDropdown]:
        """Cursor-paginated list across all (or filtered) dropdown entries."""
        query = self._session.query(ConfigDropdown).filter(
            ConfigDropdown.deleted_at.is_(None)
        )
        if module:
            query = query.filter(ConfigDropdown.module == module)
        if category:
            query = query.filter(ConfigDropdown.category == category)
        if active_only:
            query = query.filter(ConfigDropdown.is_active.is_(True))
        query = query.order_by(ConfigDropdown.module, ConfigDropdown.category, ConfigDropdown.sort_order, ConfigDropdown.id)
        if cursor:
            query = query.filter(ConfigDropdown.id > cursor)
        return query.limit(limit + 1).all()

    def count(
        self,
        module: str | None,
        category: str | None,
        active_only: bool,
    ) -> int:
        query = self._session.query(ConfigDropdown).filter(
            ConfigDropdown.deleted_at.is_(None)
        )
        if module:
            query = query.filter(ConfigDropdown.module == module)
        if category:
            query = query.filter(ConfigDropdown.category == category)
        if active_only:
            query = query.filter(ConfigDropdown.is_active.is_(True))
        return query.count()
