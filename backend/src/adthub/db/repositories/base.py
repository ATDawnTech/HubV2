from datetime import UTC, datetime
from typing import Generic, TypeVar

from sqlalchemy.orm import Session

from ...exceptions import ResourceNotFoundError

T = TypeVar("T")


class BaseRepository(Generic[T]):
    """Base repository for HubV2 single-tenant data access.

    All queries on soft-deletable tables automatically filter deleted_at IS NULL.
    Subclasses must never issue queries without the deleted_at filter on deletable tables.
    """

    def __init__(self, model: type[T], session: Session) -> None:
        self._model = model
        self._session = session

    def find_by_id(self, resource_id: str) -> T | None:
        """Find a single record by ID. Returns None if not found or soft-deleted."""
        return (
            self._session.query(self._model)
            .filter(
                self._model.id == resource_id,
                self._model.deleted_at.is_(None),
            )
            .first()
        )

    def find_all(self, limit: int = 20, cursor: str | None = None) -> list[T]:
        """Find all active records with cursor-based pagination."""
        query = (
            self._session.query(self._model)
            .filter(self._model.deleted_at.is_(None))
            .order_by(self._model.id)
        )
        if cursor:
            query = query.filter(self._model.id > cursor)
        return query.limit(limit + 1).all()

    def save(self, entity: T) -> T:
        """Persist a new or modified entity."""
        self._session.add(entity)
        self._session.flush()
        return entity

    def count_all(self) -> int:
        """Count all non-deleted records."""
        return (
            self._session.query(self._model)
            .filter(self._model.deleted_at.is_(None))
            .count()
        )

    def soft_delete(self, resource_id: str) -> None:
        """Soft delete a record by setting deleted_at."""
        entity = self.find_by_id(resource_id)
        if entity is None:
            raise ResourceNotFoundError(
                f"{self._model.__name__} '{resource_id}' not found."
            )
        entity.deleted_at = datetime.now(UTC)
        self._session.flush()
