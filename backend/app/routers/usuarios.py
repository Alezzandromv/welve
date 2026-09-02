from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security import requerir_rol
from app.schemas.usuarios import (
    ActualizarUsuarioRequest,
    CambiarCorreoRequest,
    CambiarEstadoRequest,
    CrearUsuarioRequest,
    ResetearPasswordRequest,
    UsuarioAdminResponse,
)
from app.services import usuarios_service

router = APIRouter()
_admin = Depends(requerir_rol("admin"))


@router.post("", response_model=UsuarioAdminResponse, status_code=201)
async def crear_usuario(
    body: CrearUsuarioRequest,
    _: dict = _admin,
    session: AsyncSession = Depends(get_session),
) -> UsuarioAdminResponse:
    u = await usuarios_service.crear(session, body)
    return UsuarioAdminResponse.model_validate(u)


@router.get("", response_model=list[UsuarioAdminResponse])
async def listar_usuarios(
    rol: str | None = None,
    esta_activo: bool | None = None,
    _: dict = _admin,
    session: AsyncSession = Depends(get_session),
) -> list[UsuarioAdminResponse]:
    usuarios = await usuarios_service.listar(session, rol, esta_activo)
    return [UsuarioAdminResponse.model_validate(u) for u in usuarios]


@router.get("/{usuario_id}", response_model=UsuarioAdminResponse)
async def obtener_usuario(
    usuario_id: UUID,
    _: dict = _admin,
    session: AsyncSession = Depends(get_session),
) -> UsuarioAdminResponse:
    u = await usuarios_service.obtener(session, usuario_id)
    return UsuarioAdminResponse.model_validate(u)


@router.patch("/{usuario_id}", response_model=UsuarioAdminResponse)
async def actualizar_usuario(
    usuario_id: UUID,
    body: ActualizarUsuarioRequest,
    _: dict = _admin,
    session: AsyncSession = Depends(get_session),
) -> UsuarioAdminResponse:
    u = await usuarios_service.actualizar(session, usuario_id, body)
    return UsuarioAdminResponse.model_validate(u)


@router.patch("/{usuario_id}/correo", response_model=UsuarioAdminResponse)
async def cambiar_correo(
    usuario_id: UUID,
    body: CambiarCorreoRequest,
    _: dict = _admin,
    session: AsyncSession = Depends(get_session),
) -> UsuarioAdminResponse:
    u = await usuarios_service.cambiar_correo(session, usuario_id, body)
    return UsuarioAdminResponse.model_validate(u)


@router.patch("/{usuario_id}/password", status_code=204)
async def resetear_password(
    usuario_id: UUID,
    body: ResetearPasswordRequest,
    _: dict = _admin,
    session: AsyncSession = Depends(get_session),
) -> None:
    await usuarios_service.resetear_password(session, usuario_id, body)


@router.patch("/{usuario_id}/estado", response_model=UsuarioAdminResponse)
async def cambiar_estado(
    usuario_id: UUID,
    body: CambiarEstadoRequest,
    usuario: dict = _admin,
    session: AsyncSession = Depends(get_session),
) -> UsuarioAdminResponse:
    u = await usuarios_service.cambiar_estado(
        session, usuario_id, body.esta_activo, UUID(usuario["sub"])
    )
    return UsuarioAdminResponse.model_validate(u)
