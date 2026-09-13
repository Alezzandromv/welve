"""Helpers compartidos entre services.

No importa de ningún `*_service.py` (solo de `models`) para evitar ciclos de import —
los services importan de aquí, nunca al revés.
"""
from typing import TypeVar
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.base import Base
from app.models.cita import Cita
from app.models.cliente import Cliente
from app.models.personal import Personal
from app.models.servicio import Servicio
from app.models.usuario import Usuario

ModelT = TypeVar("ModelT", bound=Base)


async def obtener_o_404(session: AsyncSession, modelo: type[ModelT], id_: UUID, detalle: str) -> ModelT:
    obj = await session.get(modelo, id_)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detalle)
    return obj


async def cliente_por_usuario_id(session: AsyncSession, usuario_id: UUID) -> Cliente:
    """Lanza 404 si el usuario no tiene perfil de cliente — equivalente al chequeo
    `if not cliente: raise ...` que antes se repetía en cada call site."""
    cliente = (await session.execute(select(Cliente).where(Cliente.usuario_id == usuario_id))).scalar_one_or_none()
    if not cliente:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Perfil de cliente no encontrado")
    return cliente


async def personal_por_usuario_id(session: AsyncSession, usuario_id: UUID) -> Personal | None:
    return (await session.execute(select(Personal).where(Personal.usuario_id == usuario_id))).scalar_one_or_none()


async def verificar_correo_disponible(session: AsyncSession, correo: str | None, excluir_usuario_id: UUID | None = None) -> None:
    if not correo:
        return
    stmt = select(Usuario).where(Usuario.correo == correo)
    if excluir_usuario_id:
        stmt = stmt.where(Usuario.id != excluir_usuario_id)
    if (await session.execute(stmt)).scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El correo ya está registrado")


async def verificar_telefono_disponible(session: AsyncSession, telefono: str | None, excluir_usuario_id: UUID | None = None) -> None:
    if not telefono:
        return
    stmt = select(Usuario).where(Usuario.telefono == telefono)
    if excluir_usuario_id:
        stmt = stmt.where(Usuario.id != excluir_usuario_id)
    if (await session.execute(stmt)).scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El teléfono ya está registrado")


def extraer_campos_usuario(datos: dict, campos: tuple[str, ...] = ("nombre_completo", "telefono")) -> dict:
    """Separa (pop in-place) los campos de Usuario mezclados en el payload de Cliente/Personal."""
    return {c: datos.pop(c) for c in campos if c in datos}


def aplicar_campos(obj: object, campos: dict) -> None:
    for campo, valor in campos.items():
        setattr(obj, campo, valor)


def cita_a_dict(cita: Cita) -> dict:
    return {
        "id": cita.id,
        "cliente_id": cita.cliente_id,
        "personal_id": cita.personal_id,
        "programada_en": cita.programada_en,
        "termina_en": cita.termina_en,
        "estado": cita.estado,
        "hora_llegada_real": cita.hora_llegada_real,
        "notas_cliente": cita.notas_cliente,
        "notas_especialista": cita.notas_especialista,
        "motivo_cancelacion": cita.motivo_cancelacion,
        "fecha_cancelacion": cita.fecha_cancelacion,
        "penalizacion_aplicada": cita.penalizacion_aplicada,
        "creada_en": cita.creada_en,
    }


async def resolver_servicios_activos(session: AsyncSession, servicio_ids: list[UUID]) -> list[Servicio]:
    """Valida que cada id exista y esté activo, preservando el orden de `servicio_ids`.
    Lanza 422 si la lista está vacía, 404 si algún servicio no existe o está inactivo."""
    if not servicio_ids:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Debe seleccionar al menos un servicio")

    mapa = {s.id: s for s in (await session.execute(select(Servicio).where(Servicio.id.in_(servicio_ids)))).scalars().all()}
    resultado: list[Servicio] = []
    for sid in servicio_ids:
        s = mapa.get(sid)
        if not s or not s.esta_activo:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Servicio {sid} no encontrado o inactivo")
        resultado.append(s)
    return resultado
