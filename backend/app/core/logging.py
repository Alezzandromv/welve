"""Configuración de logging estructurado (structlog) — JSON en producción, consola legible
en desarrollo. Se llama tanto desde `main.py` (API) como desde `tasks/__init__.py` (workers
de Celery) para que todo el backend emita el mismo formato."""
import logging

import structlog


def configurar_logging(environment: str) -> None:
    procesadores: list = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]
    procesadores.append(
        structlog.dev.ConsoleRenderer() if environment == "development" else structlog.processors.JSONRenderer()
    )
    structlog.configure(
        processors=procesadores,
        wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )
