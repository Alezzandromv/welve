from uuid import UUID

from fastapi import HTTPException, status

from app.models.personal import DisponibilidadPersonal, Personal
from app.models.usuario import Usuario
from app.schemas.personal import (
    ActualizarPersonalRequest,
    CrearDisponibilidadRequest,
    CrearPersonalRequest,
)


async def listar() -> list[Personal]:
    return await Personal.find(Personal.esta_activo == True).to_list()


async def listar_todos_con_usuario() -> list[dict]:
    """Returns all personal (including inactive) enriched with user info."""
    todos = await Personal.find().to_list()
    result = []
    for p in todos:
        u = await Usuario.get(p.usuario_id)
        d = p.model_dump()
        d["nombre_completo"] = u.nombre_completo if u else None
        d["correo"] = u.correo if u else None
        d["telefono"] = u.telefono if u else None
        result.append(d)
    return result


async def obtener_por_id(personal_id: UUID) -> Personal:
    personal = await Personal.get(personal_id)
    if not personal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Personal no encontrado")
    return personal


async def crear(body: CrearPersonalRequest) -> Personal:
    usuario = await Usuario.get(body.usuario_id)
    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    if usuario.rol not in ("trabajador", "admin"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Solo usuarios con rol trabajador o admin pueden tener perfil de personal",
        )

    existente = await Personal.find_one(Personal.usuario_id == body.usuario_id)
    if existente:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Este usuario ya tiene perfil de personal")

    personal = Personal(**body.model_dump())
    await personal.insert()
    return personal


async def actualizar(personal_id: UUID, body: ActualizarPersonalRequest) -> dict:
    personal = await Personal.get(personal_id)
    if not personal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Personal no encontrado")

    datos = body.model_dump(exclude_none=True)
    campos_usuario = {c: datos.pop(c) for c in ("nombre_completo", "telefono") if c in datos}

    usuario = await Usuario.get(personal.usuario_id)
    if campos_usuario and usuario:
        for campo, valor in campos_usuario.items():
            setattr(usuario, campo, valor)
        await usuario.save()

    for campo, valor in datos.items():
        setattr(personal, campo, valor)
    await personal.save()

    d = personal.model_dump()
    d["nombre_completo"] = usuario.nombre_completo if usuario else None
    d["correo"] = usuario.correo if usuario else None
    d["telefono"] = usuario.telefono if usuario else None
    return d


async def listar_disponibilidades(personal_id: UUID) -> list[DisponibilidadPersonal]:
    return await DisponibilidadPersonal.find(
        DisponibilidadPersonal.personal_id == personal_id,
        DisponibilidadPersonal.esta_activo == True,
    ).to_list()


def _mins(hora: str) -> int:
    """Convierte "HH:MM" o "HH:MM:SS" a minutos desde medianoche."""
    partes = hora.split(":")
    return int(partes[0]) * 60 + int(partes[1])


async def agregar_disponibilidad(body: CrearDisponibilidadRequest) -> DisponibilidadPersonal:
    personal = await Personal.get(body.personal_id)
    if not personal or not personal.esta_activo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Personal no encontrado o inactivo")

    if _mins(body.hora_fin) <= _mins(body.hora_inicio):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="hora_fin debe ser posterior a hora_inicio",
        )

    existentes = await DisponibilidadPersonal.find(
        DisponibilidadPersonal.personal_id == body.personal_id,
        DisponibilidadPersonal.dia_semana == body.dia_semana,
        DisponibilidadPersonal.esta_activo == True,
    ).to_list()

    for disp in existentes:
        if _mins(body.hora_inicio) < _mins(disp.hora_fin) and _mins(body.hora_fin) > _mins(disp.hora_inicio):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El bloque de disponibilidad se solapa con uno ya registrado para ese día",
            )

    nueva = DisponibilidadPersonal(**body.model_dump())
    await nueva.insert()
    return nueva


async def eliminar_disponibilidad(disp_id: UUID) -> None:
    disp = await DisponibilidadPersonal.get(disp_id)
    if not disp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Disponibilidad no encontrada")

    disp.esta_activo = False
    await disp.save()
