class ResourceNotFoundError(Exception):
    """Raised when a requested resource does not exist or has been soft-deleted."""


class ValidationError(Exception):
    """Raised when input data fails business rule validation."""


class ConflictError(Exception):
    """Raised when an operation conflicts with existing data (e.g. duplicate)."""
