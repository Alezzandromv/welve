"""Fixtures compartidos.

Cada test corre dentro de una transacción de Postgres que se revierte al terminar
(patrón estándar de SQLAlchemy 2.0 para tests: conexión → transacción externa →
`AsyncSession` unida a esa conexión vía savepoints). Así se puede probar contra la
base real de Supabase (la que usa `DATABASE_URL` en `.env`) sin ensuciar los datos
sembrados por `seed.py` — todo lo que haga un test, incluidos los `commit()` internos
de `get_session`, queda deshecho al cerrar la conexión de la fixture.
"""
from collections.abc import AsyncGenerator
from uuid import UUID

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.core.database import get_session
from app.core.ratelimit import limiter
from app.core.security import crear_access_token
from app.main import app
from app.models.cliente import Cliente
from app.models.enums import RolUsuario
from app.models.personal import DisponibilidadPersonal, Personal
from app.models.servicio import Categoria, Servicio
from app.models.usuario import Usuario
from app.utils.horarios import parse_hhmm

# pytest-asyncio (modo strict) crea un event loop nuevo por test por defecto — un engine
# con pool reutilizaría conexiones asyncpg abiertas en un loop ya cerrado. `NullPool` abre
# y cierra una conexión nueva en cada `connect()`, evitando que crucen de loop en loop.
_test_engine = create_async_engine(
    settings.database_url, poolclass=NullPool, connect_args={"statement_cache_size": 0},
)


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    connection = await _test_engine.connect()
    trans = await connection.begin()
    session = AsyncSession(bind=connection, expire_on_commit=False, join_transaction_mode="create_savepoint")

    yield session

    await session.close()
    await trans.rollback()
    await connection.close()


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    # El rate limiting (slowapi, backend Redis) es real entre invocaciones de test — se
    # desactiva aquí para que la suite no dependa de cuántas veces se llamó /login o
    # /solicitar-acceso antes en la misma ventana de tiempo (incluidos runs previos de la
    # propia suite, ya que el contador vive en Redis, no en memoria del proceso).
    limiter.enabled = False

    async def _override_get_session() -> AsyncGenerator[AsyncSession, None]:
        # Replica el commit/rollback por request de `get_session` real, pero sobre la
        # misma sesión de la fixture (unida por savepoints) para que todo quede dentro
        # de la transacción que se revierte al final del test.
        try:
            yield db_session
            await db_session.commit()
        except Exception:
            await db_session.rollback()
            raise

    app.dependency_overrides[get_session] = _override_get_session
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


def token_para(usuario_id: UUID, rol: str, nombre: str = "Test") -> str:
    """Emite un JWT directamente (sin pasar por /auth/login) para pruebas que no
    necesitan ejercitar el flujo de autenticación en sí."""
    return crear_access_token(usuario_id, rol, nombre)


async def crear_usuario_cliente(session: AsyncSession, telefono: str, nombre: str = "Cliente Test") -> Cliente:
    usuario = Usuario(telefono=telefono, nombre_completo=nombre, rol=RolUsuario.cliente)
    session.add(usuario)
    await session.flush()
    cliente = Cliente(usuario_id=usuario.id)
    session.add(cliente)
    await session.flush()
    return cliente


async def crear_usuario_admin(session: AsyncSession, nombre: str = "Admin Test") -> Usuario:
    """`obtener_usuario_actual` revalida el usuario contra la DB en cada request, así que un
    token de prueba con un `sub` inventado (UUID al azar) ya no basta — hace falta un
    `Usuario` real con `esta_activo=True` (default del modelo)."""
    usuario = Usuario(
        nombre_completo=nombre,
        correo=f"{nombre.lower().replace(' ', '.')}@test.eunoia.pe",
        rol=RolUsuario.admin,
    )
    session.add(usuario)
    await session.flush()
    return usuario


async def crear_personal_activo(session: AsyncSession, nombre: str = "Especialista Test") -> Personal:
    usuario = Usuario(nombre_completo=nombre, correo=f"{nombre.lower().replace(' ', '.')}@test.eunoia.pe", rol=RolUsuario.trabajador)
    session.add(usuario)
    await session.flush()
    personal = Personal(usuario_id=usuario.id, especialidad="General")
    session.add(personal)
    await session.flush()
    for dia in range(7):  # disponible todos los días, 00:00–23:59, para no interferir con las pruebas
        session.add(DisponibilidadPersonal(
            personal_id=personal.id,
            dia_semana=dia,
            hora_inicio=parse_hhmm("00:00"),
            hora_fin=parse_hhmm("23:59"),
            minutos_buffer=10,
        ))
    await session.flush()
    return personal


async def crear_servicio_test(
    session: AsyncSession,
    nombre: str = "Servicio Test",
    duracion_minutos: int = 60,
    horas_cancelacion_sin_penalidad: int = 5,
    requiere_ficha_salud: bool = False,
) -> Servicio:
    categoria = (await session.execute(select(Categoria).limit(1))).scalar_one_or_none()
    if categoria is None:
        categoria = Categoria(nombre=f"Categoria Test {nombre}")
        session.add(categoria)
        await session.flush()

    servicio = Servicio(
        categoria_id=categoria.id,
        nombre=nombre,
        duracion_minutos=duracion_minutos,
        precio=100.0,
        monto_deposito=30.0,
        horas_cancelacion_sin_penalidad=horas_cancelacion_sin_penalidad,
        requiere_ficha_salud=requiere_ficha_salud,
    )
    session.add(servicio)
    await session.flush()
    return servicio
