"""Factory Boy factories for DashboardTask test instances."""

import uuid
from datetime import datetime, timezone, timedelta
import factory
from src.adthub.db.models.tasks import DashboardTask


class TaskFactory(factory.Factory):
    """Factory for open DashboardTask test instances.

    All fields have sensible defaults. Override only what the test cares about.
    """

    class Meta:
        model = DashboardTask

    id = factory.LazyFunction(lambda: f"task_{uuid.uuid4().hex[:12]}")
    module = "intake"
    title = factory.Sequence(lambda n: f"Test Task {n}")
    source_record_id = factory.LazyFunction(lambda: f"rec_{uuid.uuid4().hex[:12]}")
    assigned_to_id = None
    deadline = factory.LazyFunction(lambda: datetime.now(timezone.utc) + timedelta(days=3))
    status = "open"
    completed_at = None
    created_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))
    updated_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))


class CompletedTaskFactory(TaskFactory):
    """Factory for completed DashboardTask test instances."""

    status = "completed"
    completed_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))


class OverdueTaskFactory(TaskFactory):
    """Factory for open DashboardTask instances with a past deadline."""

    deadline = factory.LazyFunction(lambda: datetime.now(timezone.utc) - timedelta(days=1))


class NullDeadlineTaskFactory(TaskFactory):
    """Factory for open DashboardTask instances with no deadline set."""

    deadline = None
