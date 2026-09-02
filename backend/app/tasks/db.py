"""Sessionmaker async para las tasks de Celery.

Se crea de forma perezosa (lazy singleton) en vez de a import-time del módulo: Celery usa
workers prefork, y crear el engine/pool de asyncpg antes del fork compartiría sockets entre
procesos hijos de forma insegura.
"""
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

_engine = None
_SessionLocal: async_sessionmaker[AsyncSession] | None = None


def get_task_sessionmaker() -> async_sessionmaker[AsyncSession]:
    global _engine, _SessionLocal
    if _SessionLocal is None:
        _engine = create_async_engine(
            settings.database_url,
            pool_size=2,
            max_overflow=2,
            pool_pre_ping=True,
            connect_args={"statement_cache_size": 0},
        )
        _SessionLocal = async_sessionmaker(_engine, expire_on_commit=False, class_=AsyncSession)
    return _SessionLocal
