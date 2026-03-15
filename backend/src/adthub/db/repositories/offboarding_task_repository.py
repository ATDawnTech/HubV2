"""Repository for offboarding task data access (Epic 2 – Feature 2.10)."""

from sqlalchemy.orm import Session

from ..models.employees import OffboardingTask


class OffboardingTaskRepository:
    """Data access for the offboarding_tasks table."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def find_by_employee(self, employee_id: str) -> list[OffboardingTask]:
        """Return all non-deleted offboarding tasks for an employee."""
        return (
            self._session.query(OffboardingTask)
            .filter(
                OffboardingTask.employee_id == employee_id,
                OffboardingTask.deleted_at.is_(None),
            )
            .order_by(OffboardingTask.task_type)
            .all()
        )

    def find_task_by_id(self, task_id: str) -> OffboardingTask | None:
        """Return a single offboarding task by ID."""
        return (
            self._session.query(OffboardingTask)
            .filter(
                OffboardingTask.id == task_id,
                OffboardingTask.deleted_at.is_(None),
            )
            .first()
        )

    def count_pending_for_employee(self, employee_id: str) -> int:
        """Count non-completed offboarding tasks for an employee."""
        return (
            self._session.query(OffboardingTask)
            .filter(
                OffboardingTask.employee_id == employee_id,
                OffboardingTask.status != "completed",
                OffboardingTask.deleted_at.is_(None),
            )
            .count()
        )

    def save(self, task: OffboardingTask) -> OffboardingTask:
        """Persist a new or modified offboarding task."""
        self._session.add(task)
        self._session.flush()
        return task
