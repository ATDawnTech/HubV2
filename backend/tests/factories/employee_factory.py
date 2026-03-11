import uuid
from datetime import datetime, timezone
import factory
from src.adthub.db.models.employees import Employee


class EmployeeFactory(factory.Factory):
    """Factory for Employee test instances."""

    class Meta:
        model = Employee

    id = factory.LazyFunction(lambda: f"emp_{uuid.uuid4().hex[:12]}")
    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")
    work_email = factory.LazyAttributeSequence(lambda o, n: f"employee{n}@example.com")
    personal_email = factory.LazyAttributeSequence(lambda o, n: f"personal{n}@example.com")
    employee_code = factory.Sequence(lambda n: f"EMP{n:04d}")
    status = "active"
    currency_code = "USD"
    created_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))
    updated_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))
    deleted_at = None


class ArchivedEmployeeFactory(EmployeeFactory):
    """Factory for archived employees."""
    status = "archived"
    archived_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))
    deleted_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))
