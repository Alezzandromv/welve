"""Tests del flujo de autenticación: login de staff y magic link de clientes."""
import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.ratelimit import limiter
from app.main import app
from app.models.auth import MagicLink
from app.models.enums import RolUsuario
from app.models.usuario import Usuario
from tests.conftest import crear_usuario_admin, crear_usuario_cliente, token_para


@pytest.mark.asyncio
async def test_login_admin_valido(client: AsyncClient) -> None:
    """El admin sembrado por seed.py (CLAUDE.md) debe poder loguearse."""
    respuesta = await client.post(
        "/api/v1/auth/login",
        json={"correo": "admin@eunoia.pe", "contrasena": "welve2026"},
    )
    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["rol"] == "admin"
    assert cuerpo["access_token"]


@pytest.mark.asyncio
async def test_login_password_incorrecta(client: AsyncClient) -> None:
    respuesta = await client.post(
        "/api/v1/auth/login",
        json={"correo": "admin@eunoia.pe", "contrasena": "password-equivocada"},
    )
    assert respuesta.status_code == 401


@pytest.mark.asyncio
async def test_login_correo_inexistente(client: AsyncClient) -> None:
    respuesta = await client.post(
        "/api/v1/auth/login",
        json={"correo": "no-existe@eunoia.pe", "contrasena": "cualquiera"},
    )
    assert respuesta.status_code == 401


@pytest.mark.asyncio
async def test_magic_link_flujo_completo(client: AsyncClient, db_session: AsyncSession) -> None:
    """Solicitar acceso crea Usuario+MagicLink; verificar el token lo marca usado y
    entrega JWT; reusar el mismo token debe rechazarse (410)."""
    telefono = f"+51900{uuid.uuid4().int % 1_000_000:06d}"

    respuesta = await client.post("/api/v1/auth/solicitar-acceso", json={"telefono": telefono})
    assert respuesta.status_code == 200

    usuario = (await db_session.execute(select(Usuario).where(Usuario.telefono == telefono))).scalar_one()
    link = (await db_session.execute(select(MagicLink).where(MagicLink.usuario_id == usuario.id))).scalar_one()
    assert link.usado is False

    verificacion = await client.get("/api/v1/auth/verificar", params={"token": str(link.token)})
    assert verificacion.status_code == 200
    cuerpo = verificacion.json()
    assert cuerpo["rol"] == "cliente"
    assert cuerpo["access_token"]

    # Reusar el mismo token debe fallar — nunca reutilizar tokens (CLAUDE.md).
    reuso = await client.get("/api/v1/auth/verificar", params={"token": str(link.token)})
    assert reuso.status_code == 410


@pytest.mark.asyncio
async def test_magic_link_token_inexistente(client: AsyncClient) -> None:
    respuesta = await client.get("/api/v1/auth/verificar", params={"token": str(uuid.uuid4())})
    assert respuesta.status_code == 404


@pytest.mark.asyncio
async def test_usuario_desactivado_pierde_acceso_con_token_valido(client: AsyncClient, db_session: AsyncSession) -> None:
    """Seguridad: `obtener_usuario_actual` revalida `esta_activo` contra la DB en cada
    request — un token JWT firmado y no expirado no debe bastar si el admin desactivó la
    cuenta después de emitirlo."""
    admin = await crear_usuario_admin(db_session)
    token = token_para(admin.id, "admin")

    ok = await client.get("/api/v1/auth/perfil", headers={"Authorization": f"Bearer {token}"})
    assert ok.status_code == 200

    admin.esta_activo = False
    await db_session.flush()

    rechazado = await client.get("/api/v1/auth/perfil", headers={"Authorization": f"Bearer {token}"})
    assert rechazado.status_code == 401


@pytest.mark.asyncio
async def test_cliente_bloqueado_pierde_acceso_con_token_valido(client: AsyncClient, db_session: AsyncSession) -> None:
    """Seguridad: un cliente marcado `esta_bloqueada` no debe poder usar endpoints
    autenticados aunque su JWT siga siendo válido."""
    cliente = await crear_usuario_cliente(db_session, telefono="+51900111099")
    token = token_para(cliente.usuario_id, "cliente")

    ok = await client.get("/api/v1/auth/perfil", headers={"Authorization": f"Bearer {token}"})
    assert ok.status_code == 200

    cliente.esta_bloqueada = True
    await db_session.flush()

    rechazado = await client.get("/api/v1/auth/perfil", headers={"Authorization": f"Bearer {token}"})
    assert rechazado.status_code == 403


@pytest.mark.asyncio
async def test_token_con_rol_desactualizado_es_rechazado(client: AsyncClient, db_session: AsyncSession) -> None:
    """Seguridad: si el rol del usuario cambia después de emitido el token (ej. un admin
    reasigna a un trabajador), el token viejo no debe seguir autorizando con el rol previo."""
    admin = await crear_usuario_admin(db_session)
    token = token_para(admin.id, "admin")  # token firmado con rol=admin

    admin.rol = RolUsuario.trabajador
    await db_session.flush()

    respuesta = await client.get("/api/v1/auth/perfil", headers={"Authorization": f"Bearer {token}"})
    assert respuesta.status_code == 401


@pytest.mark.asyncio
async def test_rate_limit_login() -> None:
    """`/auth/login` está limitado a 5/minuto por IP — la 6ª request en la ventana debe
    devolver 429. No usa la fixture `client` (que desactiva el limiter para el resto de la
    suite) y va contra la sesión real (login no escribe nada, es de solo lectura)."""
    limiter.reset()
    limiter.enabled = True
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            for _ in range(5):
                r = await ac.post("/api/v1/auth/login", json={"correo": "no-existe@eunoia.pe", "contrasena": "x"})
                assert r.status_code == 401
            bloqueado = await ac.post("/api/v1/auth/login", json={"correo": "no-existe@eunoia.pe", "contrasena": "x"})
            assert bloqueado.status_code == 429
    finally:
        limiter.enabled = False
        limiter.reset()
