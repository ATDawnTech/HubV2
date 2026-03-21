from datetime import datetime, timezone
from sqlalchemy.orm import Session
from ..db.models.assets import Asset, AssetCategory
from ..db.repositories.asset_repository import AssetRepository
from ..db.repositories.asset_category_repository import AssetCategoryRepository
from ..exceptions import ConflictError


class AssetService:
    def __init__(self, db: Session):
        self.db = db
        self._repo = AssetRepository(db)

    def get_all(self, limit: int = 20, cursor: str | None = None) -> tuple[list[Asset], int, str | None]:
        """List assets with cursor-based pagination."""
        rows = self._repo.find_all(limit, cursor)
        total = self._repo.count_all()
        
        has_next = len(rows) > limit
        page = rows[:limit]
        next_cursor = str(page[-1].id) if has_next else None
        
        return page, total, next_cursor

    def get_by_id(self, asset_id: str) -> Asset | None:
        """Get an asset by ID."""
        return self._repo.find_by_id(asset_id)

    def create(self, asset_data: dict) -> Asset:
        """Create a new asset."""
        asset = Asset(**asset_data)
        saved = self._repo.save(asset)
        self.db.commit()
        self.db.refresh(saved)
        return saved

    def update(self, asset: Asset, update_data: dict) -> Asset:
        """Update an asset."""
        for field, value in update_data.items():
            setattr(asset, field, value)
        saved = self._repo.save(asset)
        self.db.commit()
        self.db.refresh(saved)
        return saved

    def delete(self, asset: Asset) -> None:
        """Soft delete an asset."""
        self._repo.soft_delete(str(asset.id))
        self.db.commit()

class AssetCategoryService:
    def __init__(self, db: Session):
        self.db = db
        self._repo = AssetCategoryRepository(db)

    def get_all(self, limit: int = 20, cursor: str | None = None) -> tuple[list[AssetCategory], int, str | None]:
        """List asset categories with cursor-based pagination."""
        rows = self._repo.find_all(limit, cursor)
        total = self._repo.count_all()
        
        has_next = len(rows) > limit
        page = rows[:limit]
        next_cursor = str(page[-1].id) if has_next else None
        
        return page, total, next_cursor

    def get_by_id(self, asset_category_id: str) -> AssetCategory | None:
        """Get an asset category by ID."""
        return self._repo.find_by_id(asset_category_id)

    def create(self, asset_category_data: dict) -> AssetCategory:
        """Create a new asset category."""
        # Validate duplicated code
        if "code" in asset_category_data and asset_category_data["code"]:
            existing = self._repo.find_by_code(asset_category_data["code"])
            if existing:
                raise ConflictError(f"Asset category with code '{asset_category_data['code']}' already exists.")

        asset_category = AssetCategory(**asset_category_data)
        saved = self._repo.save(asset_category)
        self.db.commit()
        self.db.refresh(saved)
        return saved

    def update(self, asset_category: AssetCategory, update_data: dict) -> AssetCategory:
        """Update an asset category."""
        # Validate duplicated code
        if "code" in update_data and update_data["code"]:
            existing = self._repo.find_by_code(update_data["code"])
            if existing and str(existing.id) != str(asset_category.id):
                raise ConflictError(f"Asset category with code '{update_data['code']}' already exists.")

        for field, value in update_data.items():
            setattr(asset_category, field, value)
        saved = self._repo.save(asset_category)
        self.db.commit()
        self.db.refresh(saved)
        return saved

    def delete(self, asset_category: AssetCategory) -> None:
        """Soft delete an asset category."""
        self._repo.soft_delete(str(asset_category.id))
        self.db.commit()