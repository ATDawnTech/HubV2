import uuid
from datetime import datetime, timezone
import factory
from src.adthub.db.models.config_tables import Role, SkillsCatalog, AssetCategory


class RoleFactory(factory.Factory):
    class Meta:
        model = Role

    id = factory.LazyFunction(lambda: f"role_{uuid.uuid4().hex[:12]}")
    name = factory.Sequence(lambda n: f"Role {n}")
    is_system = False
    created_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))
    updated_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))
    deleted_at = None


class SkillsCatalogFactory(factory.Factory):
    class Meta:
        model = SkillsCatalog

    id = factory.LazyFunction(lambda: f"skl_{uuid.uuid4().hex[:12]}")
    name = factory.Sequence(lambda n: f"Skill {n}")
    created_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))
    updated_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))
    deleted_at = None


class AssetCategoryFactory(factory.Factory):
    class Meta:
        model = AssetCategory

    id = factory.LazyFunction(lambda: f"acat_{uuid.uuid4().hex[:12]}")
    name = factory.Sequence(lambda n: f"Category {n}")
    is_active = True
    sort_order = 0
    created_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))
    updated_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))
    deleted_at = None
