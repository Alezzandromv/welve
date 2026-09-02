from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import TipoContrato
from app.models.personal import DisponibilidadPersonal, Personal
from app.models.usuario import Usuario
from app.schemas.personal import (
    ActualizarPersonalRequest,
    CrearDisponibilidadRequest,
    CrearPersonalRequest,
)
from app.utils.horarios import hhmm, parse_hhmm


def _disp_a_dict(d: DisponibilidadPersonal) -> dict:
    """DisponibilidadPersonal ORM (hora_inicio/hora_fin como `time`) -> dict con "HH:MM"
    para que el schema de respuesta (que expone strings) no cambie."""
    return {
        "id": d.id,
        "personal_id": d.personal_id,
        "dia_semana": d.dia_semana,
        "hora_inicio": hhmm(d.hora_inicio),
        "hora_fin": hhmm(d.hora_fin),
        "minutos_buffer": d.minutos_buffer,
        "esta_activo": d.esta_activo,
    }


async def listar(session: AsyncSession) -> list[Personal]:
    stmt = select(Personal).where(Personal.esta_activo)
    return list((await session.execute(stmt)).scalars().all())


async def listar_todos_con_usuario(session: AsyncSession) -> list[dict]:
    """Devuelve todo el personal (incluido inactivo) enriquecido con datos de usuario."""
    stmt = select(Personal, Usuario).join(Usuario, Personal.usuario_id == Usuario.id)
    filas = (await session.execute(stmt)).all()

    result = []
    for personal, usuario in filas:
        d = {
            "id": personal.id,
            "usuario_id": personal.usuario_id,
            "especialidad": personal.especialidad,
            "biografia": personal.biografia,
            "color_agenda": personal.color_agenda,
            "comision_porcentaje": personal.comision_porcentaje,
            "tipo_contrato": personal.tipo_contrato.value,
            "fecha_ingreso": personal.fecha_ingreso,
            "esta_activo": personal.esta_activo,
            "nombre_completo": usuario.nombre_completo,
            "correo": usuario.correo,
            "telefono": usuario.telefono,
        }
        result.append(d)
    return result


async def obtener_por_id(session: AsyncSession, personal_id: UUID) -> Personal:
    personal = await session.get(Personal, personal_id)
    if not personal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Personal no encontrado")
    return personal


async def crear(session: AsyncSession, body: CrearPersonalRequest) -> Personal:
    usuario = await session.get(Usuario, body.usuario_id)
    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    if usuario.rol.value not in ("trabajador", "admin"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Solo usuarios con rol trabajador o admin pueden tener perfil de personal",
        )

    existente = (
        await session.execute(select(Personal).where(Personal.usuario_id == body.usuario_id))
    ).scalar_one_or_none()
    if existente:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Este usuario ya tiene perfil de personal")

    datos = body.model_dump()
    datos["tipo_contrato"] = TipoContrato(datos["tipo_contrato"])
    personal = Personal(**datos)
    session.add(personal)
    await session.flush()
    return personal


async def actualizar(session: AsyncSession, personal_id: UUID, body: ActualizarPersonalRequest) -> dict:
    personal = await session.get(Personal, personal_id)
    if not personal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Personal no encontrado")

    datos = body.model_dump(exclude_none=True)
    campos_usuario = {c: datos.pop(c) for c in ("nombre_completo", "telefono") if c in datos}
    if "tipo_contrato" in datos:
        datos["tipo_contrato"] = TipoContrato(datos["tipo_contrato"])

    usuario = await session.get(Usuario, personal.usuario_id)
    if campos_usuario and usuario:
        for campo, valor in campos_usuario.items():
            setattr(usuario, campo, valor)

    for campo, valor in datos.items():
        setattr(personal, campo, valor)
    await session.flush()

    return {
        "id": personal.id,
        "usuario_id": personal.usuario_id,
        "especialidad": personal.especialidad,
        "biografia": personal.biografia,
        "color_agenda": personal.color_agenda,
        "comision_porcentaje": personal.comision_porcentaje,
        "tipo_contrato": personal.tipo_contrato.value,
        "fecha_ingreso": personal.fecha_ingreso,
        "esta_activo": personal.esta_activo,
        "nombre_completo": usuario.nombre_completo if usuario else None,
        "correo": usuario.correo if usuario else None,
        "telefono": usuario.telefono if usuario else None,
    }


async def listar_disponibilidades(session: AsyncSession, personal_id: UUID) -> list[dict]:
    stmt = select(DisponibilidadPersonal).where(
        DisponibilidadPersonal.personal_id == personal_id,
        DisponibilidadPersonal.esta_activo,
    )
    disps = (await session.execute(stmt)).scalars().all()
    return [_disp_a_dict(d) for d in disps]


def _mins(hora: str) -> int:
    """Convierte "HH:MM" o "HH:MM:SS" a minutos desde medianoche."""
    partes = hora.split(":")
    return int(partes[0]) * 60 + int(partes[1])


async def agregar_disponibilidad(session: AsyncSession, body: CrearDisponibilidadRequest) -> dict:
    personal = await session.get(Personal, body.personal_id)
    if not personal or not personal.esta_activo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Personal no encontrado o inactivo")

    if _mins(body.hora_fin) <= _mins(body.hora_inicio):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="hora_fin debe ser posterior a hora_inicio",
        )

    stmt = select(DisponibilidadPersonal).where(
        DisponibilidadPersonal.personal_id == body.personal_id,
        DisponibilidadPersonal.dia_semana == body.dia_semana,
        DisponibilidadPersonal.esta_activo,
    )
    existentes = (await session.execute(stmt)).scalars().all()

    for disp in existentes:
        if _mins(body.hora_inicio) < _mins(hhmm(disp.hora_fin)) and _mins(body.hora_fin) > _mins(hhmm(disp.hora_inicio)):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El bloque de disponibilidad se solapa con uno ya registrado para ese día",
            )

    nueva = DisponibilidadPersonal(
        personal_id=body.personal_id,
        dia_semana=body.dia_semana,
        hora_inicio=parse_hhmm(body.hora_inicio),
        hora_fin=parse_hhmm(body.hora_fin),
        minutos_buffer=body.minutos_buffer,
    )
    session.add(nueva)
    await session.flush()
    return _disp_a_dict(nueva)


async def eliminar_disponibilidad(session: AsyncSession, disp_id: UUID) -> None:
    disp = await session.get(DisponibilidadPersonal, disp_id)
    if not disp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Disponibilidad no encontrada")

    disp.esta_activo = False
    await session.flush()
