from celery import Celery

from app.core.config import settings
from app.core.logging import configurar_logging

configurar_logging(settings.environment)

celery_app = Celery(
    "welve",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.tasks.recordatorios", "app.tasks.no_show"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="America/Lima",
    enable_utc=True,
)

celery_app.conf.beat_schedule = {
    "verificar-no-show-cada-5min": {
        "task": "app.tasks.no_show.verificar_no_show",
        "schedule": 300.0,
    },
}
