"""Business logic for Employee Management (Epic 2).

This layer owns all business rules. No SQLAlchemy imports, no HTTP knowledge.
"""

import uuid
from datetime import datetime, timedelta, timezone

import structlog

from ..db.models.config_tables import RoleAssignment
from ..db.models.employees import Employee, OffboardingTask
from ..db.repositories.employee_repository import EmployeeRepository
from ..db.repositories.offboarding_task_repository import OffboardingTaskRepository
from ..db.repositories.role_repository import RoleRepository
from ..exceptions import ConflictError, ResourceNotFoundError
from ..schemas.employees import CreateEmployeeRequest, UpdateEmployeeRequest

logger = structlog.get_logger()

_LIVE_STATUSES = ["active", "new_onboard"]

_OFFBOARDING_TASK_TYPES = [
    ("email_decommission", "it"),
    ("project_migration", "manager"),
    ("asset_retrieval", "hr"),
    ("system_account_removal", "it"),
]


class EmployeeService:
    """Orchestrates employee data retrieval and mutation operations."""

    def __init__(
        self,
        repository: EmployeeRepository,
        task_repository: OffboardingTaskRepository,
        role_repository: RoleRepository | None = None,
    ) -> None:
        self._repository = repository
        self._task_repository = task_repository
        self._role_repository = role_repository

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _auto_assign_roles(self, employee_id: str, department: str | None) -> None:
        """Assign any roles whose auto_assign_departments includes the employee's department.

        Skips roles already assigned. No-ops if no role_repository is configured
        or department is None.
        """
        if not self._role_repository or not department:
            return
        matching_roles = self._role_repository.find_roles_by_department(department)
        existing = {a.role_id for a in self._role_repository.find_assignments_for_employee(employee_id)}
        now = datetime.now(timezone.utc)
        for role in matching_roles:
            if role.id in existing:
                continue
            assignment = RoleAssignment(
                employee_id=employee_id,
                role_id=role.id,
                assigned_at=now,
                is_manager=False,
                manager_permissions=None,
            )
            self._role_repository.save_assignment(assignment)

    # ------------------------------------------------------------------
    # Queries
    # ------------------------------------------------------------------

    def list_employees(
        self,
        limit: int = 20,
        cursor: str | None = None,
        q: str | None = None,
        statuses: list[str] | None = None,
        departments: list[str] | None = None,
        locations: list[str] | None = None,
        hire_types: list[str] | None = None,
        work_modes: list[str] | None = None,
        job_title: str | None = None,
        hire_date_from: str | None = None,
        hire_date_to: str | None = None,
    ) -> tuple[list[Employee], int]:
        """Return a paginated page of live employees and their filtered total count.

        Defaults to showing 'active' and 'new_onboard' employees only.
        Pass statuses=['archiving'] to query the offboarding hub, etc.
        """
        resolved_statuses = statuses if statuses is not None else _LIVE_STATUSES
        employees = self._repository.find_with_filters(
            limit=limit,
            cursor=cursor,
            q=q,
            statuses=resolved_statuses,
            departments=departments,
            locations=locations,
            hire_types=hire_types,
            work_modes=work_modes,
            job_title=job_title,
            hire_date_from=hire_date_from,
            hire_date_to=hire_date_to,
        )
        total = self._repository.count_with_filters(
            q=q,
            statuses=resolved_statuses,
            departments=departments,
            locations=locations,
            hire_types=hire_types,
            work_modes=work_modes,
            job_title=job_title,
            hire_date_from=hire_date_from,
            hire_date_to=hire_date_to,
        )
        return employees, total

    def check_email_exists(self, email: str) -> bool:
        """Return True if the given email is already registered (case-insensitive)."""
        return self._repository.find_by_email(email.strip()) is not None

    def get_employee(self, employee_id: str) -> Employee:
        """Return a single employee by ID.

        Raises:
            ResourceNotFoundError: If the employee does not exist or is soft-deleted.
        """
        employee = self._repository.find_by_id(employee_id)
        if employee is None:
            raise ResourceNotFoundError(f"Employee '{employee_id}' not found.")
        return employee

    def list_offboarding(
        self,
        limit: int = 20,
        cursor: str | None = None,
    ) -> tuple[list[Employee], int]:
        """Return employees currently in the 'archiving' (Offboarding Hub) state."""
        return self.list_employees(limit=limit, cursor=cursor, statuses=["archiving"])

    def get_offboarding_tasks(self, employee_id: str) -> list[OffboardingTask]:
        """Return all offboarding tasks for an employee.

        Raises:
            ResourceNotFoundError: If the employee does not exist.
        """
        employee = self._repository.find_by_id(employee_id)
        if employee is None:
            raise ResourceNotFoundError(f"Employee '{employee_id}' not found.")
        return self._task_repository.find_by_employee(employee_id)

    # ------------------------------------------------------------------
    # Mutations
    # ------------------------------------------------------------------

    def create_employee(self, request: CreateEmployeeRequest) -> Employee:
        """Create and persist a new employee.

        Sets status to 'active' and auto-generates a sequential employee_code.

        Raises:
            ConflictError: If the work email is already registered (case-insensitive).
        """
        existing = self._repository.find_by_email(request.work_email)
        if existing is not None:
            raise ConflictError(
                f"An employee with email '{request.work_email}' already exists."
            )

        total = self._repository.count_all_including_archived()
        employee_code = f"ATD-{total + 1:04d}"

        now = datetime.now(timezone.utc)
        employee = Employee(
            id=f"emp_{uuid.uuid4().hex[:12]}",
            employee_code=employee_code,
            first_name=request.first_name,
            last_name=request.last_name,
            work_email=request.work_email,
            job_title=request.job_title,
            department=request.department,
            manager_id=request.manager_id,
            hire_date=request.hire_date,
            hire_type=request.hire_type,
            work_mode=request.work_mode,
            location=request.location,
            status="active",
            created_at=now,
            updated_at=now,
        )
        saved = self._repository.save(employee)
        self._auto_assign_roles(saved.id, saved.department)
        logger.info("Employee created.", employee_id=saved.id, employee_code=employee_code)
        return saved

    def update_employee(
        self, employee_id: str, request: UpdateEmployeeRequest
    ) -> Employee:
        """Update an existing employee's fields (only provided fields are changed).

        Raises:
            ResourceNotFoundError: If the employee does not exist.
        """
        employee = self._repository.find_by_id(employee_id)
        if employee is None:
            raise ResourceNotFoundError(f"Employee '{employee_id}' not found.")

        old_department = employee.department
        for field, value in request.model_dump(exclude_none=True).items():
            setattr(employee, field, value)
        employee.updated_at = datetime.now(timezone.utc)

        saved = self._repository.save(employee)
        if saved.department != old_department and self._role_repository:
            # Remove auto-assigned roles for the old department
            if old_department:
                old_dept_roles = self._role_repository.find_roles_by_department(old_department)
                old_dept_role_ids = {r.id for r in old_dept_roles}
                current_assignments = self._role_repository.find_assignments_for_employee(employee_id)
                for assignment in current_assignments:
                    if assignment.assigned_by is None and assignment.role_id in old_dept_role_ids:
                        self._role_repository.delete_assignment(employee_id, assignment.role_id)
            # Add roles for the new department
            if saved.department:
                self._auto_assign_roles(saved.id, saved.department)
        logger.info("Employee updated.", employee_id=employee_id)
        return saved

    def archive_employee(self, employee_id: str) -> Employee:
        """Initiate the offboarding workflow for an employee.

        Sets status to 'archiving', records archived_at, and creates the 4
        mandatory offboarding task records. The employee reaches 'archived'
        status only when all tasks are completed.

        Raises:
            ResourceNotFoundError: If the employee does not exist.
        """
        employee = self._repository.find_by_id(employee_id)
        if employee is None:
            raise ResourceNotFoundError(f"Employee '{employee_id}' not found.")

        now = datetime.now(timezone.utc)
        employee.status = "archiving"
        employee.archived_at = now
        employee.updated_at = now
        self._repository.save(employee)

        logger.info("Employee archiving initiated.", employee_id=employee_id)

        # Remove all role assignments when entering offboarding
        if self._role_repository:
            self._role_repository.delete_all_assignments_for_employee(employee_id)
            logger.info("Role assignments removed for offboarding.", employee_id=employee_id)

        # Create the 4 mandatory offboarding tasks — each due within 72 hours
        due_at = now + timedelta(hours=72)
        for task_type, assigned_group in _OFFBOARDING_TASK_TYPES:
            task = OffboardingTask(
                id=f"obt_{uuid.uuid4().hex[:12]}",
                employee_id=employee_id,
                task_type=task_type,
                assigned_group=assigned_group,
                status="pending",
                due_at=due_at,
                created_at=now,
                updated_at=now,
            )
            self._task_repository.save(task)

        return employee

    def reassign_offboarding_task(
        self, task_id: str, assignee_id: str | None
    ) -> OffboardingTask:
        """Update the assignee_id on an offboarding task.

        Raises:
            ResourceNotFoundError: If the task does not exist.
        """
        task = self._task_repository.find_task_by_id(task_id)
        if task is None:
            raise ResourceNotFoundError(f"Offboarding task '{task_id}' not found.")

        task.assignee_id = assignee_id
        task.updated_at = datetime.now(timezone.utc)
        self._task_repository.save(task)
        return task

    def complete_offboarding_task(
        self, task_id: str, completed_by: str
    ) -> OffboardingTask:
        """Mark an offboarding task as completed and sign it off.

        If this is the last pending task for the employee, automatically
        transitions the employee status to 'archived'.

        Raises:
            ResourceNotFoundError: If the task does not exist.
        """
        task = self._task_repository.find_task_by_id(task_id)
        if task is None:
            raise ResourceNotFoundError(f"Offboarding task '{task_id}' not found.")

        now = datetime.now(timezone.utc)
        task.status = "completed"
        task.completed_by = completed_by
        task.completed_at = now
        task.updated_at = now
        self._task_repository.save(task)

        logger.info("Offboarding task completed.", task_id=task_id, completed_by=completed_by)

        # Auto-archive the employee when all tasks are done
        pending_count = self._task_repository.count_pending_for_employee(task.employee_id)
        if pending_count == 0:
            employee = self._repository.find_by_id(task.employee_id)
            if employee is not None:
                employee.status = "archived"
                employee.updated_at = now
                self._repository.save(employee)
                logger.info("Employee auto-archived.", employee_id=task.employee_id)

        return task
