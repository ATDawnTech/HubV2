"""Structured logging configuration for ADT Hub.

Call configure_logging() once at application startup before any log statements.
All log output is structured JSON for CloudWatch ingestion.
"""

import logging

import structlog

from ..config import settings


def configure_logging() -> None:
    """Configure structured JSON logging for the service.

    Sets up structlog with JSON rendering and stdlib integration.
    Log level is controlled by the LOG_LEVEL environment variable.
    """
    log_level = getattr(logging, settings.log_level.upper(), logging.INFO)

    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer(),
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )
    logging.basicConfig(level=log_level)
