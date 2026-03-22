from sqlalchemy.orm import Session

from ..models.assets import Asset
from .base import BaseRepository


class AssetRepository(BaseRepository[Asset]):
    """Repository for asset data access."""

    def __init__(self, session: Session) -> None:
        super().__init__(Asset, session)

    def find_by_asset_tag(self, asset_tag: str) -> Asset | None:
        """Find an asset by its unique asset tag."""
        return (
            self._session.query(Asset)
            .filter(
                Asset.asset_tag == asset_tag,
                Asset.deleted_at.is_(None),
            )
            .first()
        )

    def count_by_tag_prefix(self, prefix: str) -> int:
        """Count all assets (including soft-deleted) whose asset_tag starts with prefix."""
        return (
            self._session.query(Asset)
            .filter(Asset.asset_tag.like(f"{prefix}%"))
            .count()
        )

    def find_assigned_to(self, employee_id: str) -> list[Asset]:
        """Find all assets assigned to an employee."""
        return (
            self._session.query(Asset)
            .filter(
                Asset.assigned_to == employee_id,
                Asset.deleted_at.is_(None),
            )
            .order_by(Asset.id)
            .all()
        )

    def find_by_status(self, status: str, limit: int = 20, cursor: str | None = None) -> list[Asset]:
        """Find assets by status."""
        query = (
            self._session.query(Asset)
            .filter(
                Asset.status == status,
                Asset.deleted_at.is_(None),
            )
            .order_by(Asset.id)
            .limit(limit + 1)
        )
        if cursor:
            query = query.filter(Asset.id > cursor)
        return query.all()
