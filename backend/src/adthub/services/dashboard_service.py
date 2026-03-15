"""Business logic for the Hub Dashboard — module summaries and task management."""

import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from ..db.models.tasks import DashboardTask
from ..db.repositories.dashboard_repository import DashboardRepository
from ..exceptions import TaskAlreadyCompletedError, TaskNotFoundError


# Canonical ordered list of modules shown on the Hub Dashboard (Feature 1.1).
# The id values correspond to the module column in dashboard_tasks.
_MODULE_DEFINITIONS: list[dict[str, str]] = [
    {"id": "employees", "label": "Employee Management", "path": "/employees"},
    {"id": "admin", "label": "Admin Settings", "path": "/admin"},
    {"id": "assets", "label": "Asset Management", "path": "/assets"},
    {"id": "intake", "label": "Intake Management", "path": "/intake"},
    {"id": "onboarding", "label": "Onboarding", "path": "/onboarding"},
    {"id": "projects", "label": "Project Management", "path": "/projects"},
    {"id": "audit", "label": "Audit & Logging", "path": "/audit"},
    {"id": "timesheets", "label": "Timesheets", "path": "/timesheets"},
    {"id": "productivity", "label": "Productivity", "path": "/productivity"},
    {"id": "ats", "label": "ATS", "path": "/ats"},
]


@dataclass
class ModuleSummary:
    """Represents a single module card on the Hub Dashboard."""

    id: str
    label: str
    path: str
    pending_count: int


class DashboardService:
    """Orchestrates Hub Dashboard data retrieval and task operations.

    This layer owns all business rules for Epic 1. It does not import SQLAlchemy
    and does not know about HTTP. All data access is delegated to DashboardRepository.
    """

    def __init__(self, repository: DashboardRepository) -> None:
        self._repository = repository

    def get_module_summaries(self, user_id: str) -> list[ModuleSummary]:
        """Return all modules with their pending task counts for the given user.

        The module list is fixed by the application's feature set. Each entry
        is enriched with the count of open tasks assigned to the user from
        that module's task pool.

        Args:
            user_id: The employee ID of the authenticated user.

        Returns:
            Ordered list of ModuleSummary instances, one per module.
        """
        counts = self._repository.get_module_task_counts(user_id)
        return [
            ModuleSummary(
                id=mod["id"],
                label=mod["label"],
                path=mod["path"],
                pending_count=counts.get(mod["id"], 0),
            )
            for mod in _MODULE_DEFINITIONS
        ]

    def get_my_tasks(
        self,
        user_id: str,
        limit: int,
        cursor: str | None,
    ) -> tuple[list[DashboardTask], int]:
        """Return paginated open tasks assigned to the user, sorted by deadline.

        Args:
            user_id: The employee ID of the authenticated user.
            limit: Page size. The repository fetches limit+1 to detect next page.
            cursor: Opaque pagination cursor. None for the first page.

        Returns:
            A tuple of (tasks, total_count). tasks contains at most `limit` items.
            total_count reflects all open tasks for the user regardless of pagination.
        """
        tasks = self._repository.find_tasks_for_user(user_id, limit, cursor)
        total = self._repository.count_open_tasks_for_user(user_id)
        return tasks, total

    def create_test_task(self, user_id: str) -> DashboardTask:
        """Create a test task assigned to the requesting user.

        The task uses the 'employees' module, is due in 72 hours, and carries a
        title that clearly identifies it as a test. It behaves exactly like a real
        task — it appears in the inbox and dashboard task list and can be completed.

        Args:
            user_id: The employee ID of the authenticated user.

        Returns:
            The newly created DashboardTask.
        """
        now = datetime.now(timezone.utc)
        task_id = f"test_{uuid.uuid4().hex[:12]}"
        task = DashboardTask(
            id=task_id,
            module="employees",
            title="Test task — return company equipment",
            source_record_id=task_id,
            assigned_to_id=user_id,
            deadline=now + timedelta(hours=72),
            status="open",
            created_at=now,
            updated_at=now,
        )
        return self._repository.save_task(task)

    def complete_task(self, task_id: str, user_id: str) -> DashboardTask:
        """Mark a task as completed.

        Validates that the task exists, belongs to the requesting user, and is
        not already completed before delegating the mutation to the repository.

        Args:
            task_id: The unique identifier of the task to complete.
            user_id: The employee ID of the authenticated user.

        Returns:
            The updated DashboardTask with status='completed'.

        Raises:
            TaskNotFoundError: If the task does not exist or is not assigned to user_id.
            TaskAlreadyCompletedError: If the task is already in completed status.
        """
        task = self._repository.find_task_by_id(task_id)

        if task is None or task.assigned_to_id != user_id:
            # Return the same error regardless of which condition failed to avoid
            # leaking the existence of tasks belonging to other users (IDOR prevention).
            raise TaskNotFoundError(f"Task '{task_id}' not found.")

        if task.status == "completed":
            raise TaskAlreadyCompletedError(f"Task '{task_id}' is already completed.")

        return self._repository.complete_task(task)
