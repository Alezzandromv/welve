"""Tests del flujo de autenticación: login de staff y magic link de clientes."""
import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth import MagicLink
from app.models.usuario import Usuario


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
