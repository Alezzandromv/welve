"""Rate limiting con slowapi, respaldado por Redis (no memoria local) — Redis ya es una
dependencia dura del stack (Celery), así que el límite se comparte entre workers/procesos
uvicorn sin costo adicional."""
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings

limiter = Limiter(key_func=get_remote_address, storage_uri=settings.redis_url)
