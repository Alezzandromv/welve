from collections.abc import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

# statement_cache_size=0 es obligatorio cuando DATABASE_URL apunta al connection pooler de
# Supabase en modo transacción (PgBouncer, puerto 6543): el pooler no soporta prepared
# statements persistentes entre requests, y asyncpg los cachea por defecto.
engine = create_async_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=settings.db_pool_size,
    max_overflow=settings.db_max_overflow,
    connect_args={"statement_cache_size": 0},
)

AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependencia FastAPI: una sesión por request. Commit al final si no hubo excepción,
    rollback si la hubo — cualquier secuencia de operaciones dentro de un mismo handler
    queda atómica por construcción."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def verificar_conexion() -> None:
    """Falla rápido y claro en el arranque si Postgres no es alcanzable."""
    async with engine.connect() as conn:
        await conn.execute(text("SELECT 1"))
