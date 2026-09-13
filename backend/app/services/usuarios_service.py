from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.cliente import Cliente
from app.models.enums import RolUsuario
from app.models.usuario import Usuario
from app.schemas.usuarios import (
    ActualizarUsuarioRequest,
    CambiarCorreoRequest,
    CrearUsuarioRequest,
    ResetearPasswordRequest,
)
from app.services._comunes import verificar_correo_disponible, verificar_telefono_disponible


async def crear(session: AsyncSession, body: CrearUsuarioRequest) -> Usuario:
    if body.rol in ("admin", "trabajador"):
        if not body.correo:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="El correo es requerido para admin y trabajador")
        if not body.password or len(body.password) < 8:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="La contraseña es requerida (mínimo 8 caracteres)")
    if body.rol == "cliente" and not body.telefono:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="El teléfono es requerido para clientes")

    await verificar_correo_disponible(session, str(body.correo) if body.correo else None)
    await verificar_telefono_disponible(session, body.telefono)

    usuario = Usuario(
        nombre_completo=body.nombre_completo,
        correo=str(body.correo) if body.correo else None,
        telefono=body.telefono or None,
        hashed_password=hash_password(body.password) if body.password else None,
        rol=RolUsuario(body.rol),
    )
    session.add(usuario)
    try:
        await session.flush()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El correo o teléfono ya está registrado") from None

    if body.rol == "cliente":
        session.add(Cliente(usuario_id=usuario.id))
        await session.flush()

    return usuario


async def listar(
    session: AsyncSession, rol: str | None = None, esta_activo: bool | None = None,
    limit: int = 50, offset: int = 0,
) -> list[Usuario]:
    stmt = select(Usuario)
    if rol:
        stmt = stmt.where(Usuario.rol == rol)
    if esta_activo is not None:
        stmt = stmt.where(Usuario.esta_activo == esta_activo)
    stmt = stmt.order_by(Usuario.nombre_completo.asc()).limit(limit).offset(offset)
    return list((await session.execute(stmt)).scalars().all())


async def obtener(session: AsyncSession, usuario_id: UUID) -> Usuario:
    usuario = await session.get(Usuario, usuario_id)
    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    return usuario


async def actualizar(session: AsyncSession, usuario_id: UUID, body: ActualizarUsuarioRequest) -> Usuario:
    usuario = await obtener(session, usuario_id)
    datos = body.model_dump(exclude_none=True)
    for campo, valor in datos.items():
        setattr(usuario, campo, valor)
    await session.flush()
    return usuario


async def cambiar_correo(session: AsyncSession, usuario_id: UUID, body: CambiarCorreoRequest) -> Usuario:
    usuario = await obtener(session, usuario_id)
    correo_nuevo = str(body.correo)
    if correo_nuevo != (usuario.correo or ""):
        await verificar_correo_disponible(session, correo_nuevo, excluir_usuario_id=usuario_id)
    usuario.correo = correo_nuevo
    usuario.correo_verificado = False
    await session.flush()
    return usuario


async def resetear_password(session: AsyncSession, usuario_id: UUID, body: ResetearPasswordRequest) -> None:
    usuario = await obtener(session, usuario_id)
    usuario.hashed_password = hash_password(body.password_nueva)
    await session.flush()


async def cambiar_estado(
    session: AsyncSession, usuario_id: UUID, esta_activo: bool, usuario_actual_id: UUID
) -> Usuario:
    if str(usuario_id) == str(usuario_actual_id) and not esta_activo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puedes desactivarte a ti mismo",
        )
    usuario = await obtener(session, usuario_id)
    usuario.esta_activo = esta_activo
    await session.flush()
    return usuario
