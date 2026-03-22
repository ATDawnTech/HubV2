from sqlalchemy.orm import Session
from .base import BaseRepository
from ..models.assets import AssetCategory


class AssetCategoryRepository(BaseRepository[AssetCategory]):
    """Repository for asset category data access."""

    def __init__(self, session: Session) -> None:
        super().__init__(AssetCategory, session)

    def find_by_code(self, code: str) -> AssetCategory | None:
        """Find an asset category by its unique code."""
        return (
            self._session.query(AssetCategory)
            .filter(
                AssetCategory.code == code,
                AssetCategory.deleted_at.is_(None),
            )
            .first()
        )
