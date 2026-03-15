class ADTHubException(Exception):
    """Base exception for all ADTHub application errors."""


class ResourceNotFoundError(ADTHubException):
    """Raised when a requested resource does not exist or has been soft-deleted."""


class ValidationError(ADTHubException):
    """Raised when input data fails business rule validation."""


class ConflictError(ADTHubException):
    """Raised when an operation conflicts with existing data (e.g. duplicate)."""


class TaskNotFoundError(ResourceNotFoundError):
    """Raised when a dashboard task does not exist or is not assigned to the requesting user."""


class TaskAlreadyCompletedError(ValidationError):
    """Raised when attempting to complete a task that is already in completed status."""


class SystemRoleDeleteError(ValidationError):
    """Raised when attempting to delete a system role (is_system=True)."""


class RoleAssignmentError(ValidationError):
    """Raised when a role assignment violates hierarchy or business rules (e.g. duplicate)."""


class PermissionDeniedError(ADTHubException):
    """Raised when the authenticated user lacks a required permission. Maps to HTTP 403."""
