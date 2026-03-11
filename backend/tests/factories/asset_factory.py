import uuid
from datetime import datetime, timezone
import factory
from src.adthub.db.models.assets import Asset


class AssetFactory(factory.Factory):
    class Meta:
        model = Asset

    id = factory.LazyFunction(lambda: f"ast_{uuid.uuid4().hex[:12]}")
    asset_tag = factory.Sequence(lambda n: f"AST-{n:05d}")
    model = factory.Sequence(lambda n: f"Model {n}")
    status = "available"
    invoice_verified_status = "unverified"
    created_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))
    updated_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))
    deleted_at = None


class AssignedAssetFactory(AssetFactory):
    status = "assigned"
