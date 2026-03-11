import uuid
from datetime import date, datetime, timezone
import factory
from src.adthub.db.models.timesheets import Timesheet


class TimesheetFactory(factory.Factory):
    class Meta:
        model = Timesheet

    id = factory.LazyFunction(lambda: f"ts_{uuid.uuid4().hex[:12]}")
    employee_id = factory.LazyFunction(lambda: f"emp_{uuid.uuid4().hex[:12]}")
    project_id = factory.LazyFunction(lambda: f"proj_{uuid.uuid4().hex[:12]}")
    work_date = factory.LazyFunction(date.today)
    hours = 8
    status = "submitted"
    is_billable = True
    created_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))
    updated_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))
    deleted_at = None


class ApprovedTimesheetFactory(TimesheetFactory):
    status = "approved"
    approved_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))
