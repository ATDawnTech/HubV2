import uuid
from datetime import datetime, timezone
import factory
from src.adthub.db.models.config_tables import Role, SkillsCatalog
from src.adthub.db.models.assets import AssetCategory


class RoleFactory(factory.Factory):
    class Meta:
        model = Role

    id = factory.LazyFunction(uuid.uuid4)
    name = factory.Sequence(lambda n: f"Role {n}")
    is_system = False
    created_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))
    updated_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))
    deleted_at = None


class SkillsCatalogFactory(factory.Factory):
    class Meta:
        model = SkillsCatalog

    id = factory.LazyFunction(uuid.uuid4)
    name = factory.Sequence(lambda n: f"Skill {n}")
    search_tokens = factory.LazyAttribute(lambda o: o.name.lower())
    created_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))
    updated_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))
    deleted_at = None


class AssetCategoryFactory(factory.Factory):
    class Meta:
        model = AssetCategory

    id = factory.LazyFunction(uuid.uuid4)
    name = factory.Sequence(lambda n: f"Category {n}")
    is_active = True
    sort_order = 0
    created_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))
    updated_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))
    deleted_at = None

