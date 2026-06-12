from uuid import UUID

from fastapi import HTTPException, status

from app.core.security import hash_password
from app.models.usuario import Usuario
from app.schemas.usuarios import (
    ActualizarUsuarioRequest,
    CambiarCorreoRequest,
    ResetearPasswordRequest,
)


async def listar(rol: str | None = None, esta_activo: bool | None = None) -> list[Usuario]:
    filtros = []
    if rol:
        filtros.append(Usuario.rol == rol)
    if esta_activo is not None:
        filtros.append(Usuario.esta_activo == esta_activo)
    return await Usuario.find(*filtros).to_list()


async def obtener(usuario_id: UUID) -> Usuario:
    usuario = await Usuario.get(usuario_id)
    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    return usuario


async def actualizar(usuario_id: UUID, body: ActualizarUsuarioRequest) -> Usuario:
    usuario = await obtener(usuario_id)
    datos = body.model_dump(exclude_none=True)
    for campo, valor in datos.items():
        setattr(usuario, campo, valor)
    await usuario.save()
    return usuario


async def cambiar_correo(usuario_id: UUID, body: CambiarCorreoRequest) -> Usuario:
    usuario = await obtener(usuario_id)
    correo_nuevo = str(body.correo)
    if correo_nuevo != (usuario.correo or ""):
        existente = await Usuario.find_one(Usuario.correo == correo_nuevo)
        if existente and str(existente.id) != str(usuario_id):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El correo ya está en uso por otro usuario",
            )
    usuario.correo = correo_nuevo
    usuario.correo_verificado = False
    await usuario.save()
    return usuario


async def resetear_password(usuario_id: UUID, body: ResetearPasswordRequest) -> None:
    usuario = await obtener(usuario_id)
    usuario.hashed_password = hash_password(body.password_nueva)
    await usuario.save()


async def cambiar_estado(
    usuario_id: UUID, esta_activo: bool, usuario_actual_id: UUID
) -> Usuario:
    if str(usuario_id) == str(usuario_actual_id) and not esta_activo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puedes desactivarte a ti mismo",
        )
    usuario = await obtener(usuario_id)
    usuario.esta_activo = esta_activo
    await usuario.save()
    return usuario
