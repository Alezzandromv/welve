from datetime import date, datetime, timedelta
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cita import Cita
from app.models.personal import DisponibilidadPersonal, Personal
from app.models.servicio import Categoria, Servicio
from app.schemas.servicios import (
    ActualizarCategoriaRequest,
    ActualizarServicioRequest,
    CrearCategoriaRequest,
    CrearServicioRequest,
    DisponibilidadResponse,
    HorarioDisponible,
)

LIMA_TZ = ZoneInfo("America/Lima")

# dia_semana en el modelo: 0=domingo, 1=lunes … 6=sábado
# Python weekday():        0=lunes  … 6=domingo
_DIA_PYTHON_A_MODELO = {0: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 0}

_ESTADOS_BLOQUEADOS: set[str] = {"cancelada", "cancelada_tardia", "no_show"}


async def listar(session: AsyncSession, categoria_id: UUID | None = None, incluir_inactivos: bool = False) -> list[Servicio]:
    stmt = select(Servicio)
    if categoria_id:
        stmt = stmt.where(Servicio.categoria_id == categoria_id)
    if not incluir_inactivos:
        stmt = stmt.where(Servicio.esta_activo)
    return list((await session.execute(stmt)).scalars().all())


async def listar_categorias(session: AsyncSession) -> list[Categoria]:
    stmt = (
        select(Categoria)
        .where(Categoria.esta_activo)
        .order_by(Categoria.orden_visualizacion.asc())
    )
    return list((await session.execute(stmt)).scalars().all())


async def calcular_disponibilidad(session: AsyncSession, servicio_id: UUID, fecha: date) -> list[DisponibilidadResponse]:
    servicio = await session.get(Servicio, servicio_id)
    if not servicio:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Servicio no encontrado")

    duracion = timedelta(minutes=servicio.duracion_minutos)
    dia_modelo = _DIA_PYTHON_A_MODELO[fecha.weekday()]

    personal_activo = list(
        (await session.execute(select(Personal).where(Personal.esta_activo))).scalars().all()
    )
    if not personal_activo:
        return []

    inicio_dia = datetime(fecha.year, fecha.month, fecha.day, tzinfo=LIMA_TZ)
    fin_dia = inicio_dia + timedelta(days=1)
    resultados: list[DisponibilidadResponse] = []

    for personal in personal_activo:
        stmt = select(DisponibilidadPersonal).where(
            DisponibilidadPersonal.personal_id == personal.id,
            DisponibilidadPersonal.dia_semana == dia_modelo,
            DisponibilidadPersonal.esta_activo,
        )
        disponibilidades = list((await session.execute(stmt)).scalars().all())

        if not disponibilidades:
            continue

        buffer = timedelta(minutes=disponibilidades[0].minutos_buffer)

        stmt_citas = select(Cita).where(
            Cita.personal_id == personal.id,
            Cita.programada_en >= inicio_dia,
            Cita.programada_en < fin_dia,
        )
        citas_dia = list((await session.execute(stmt_citas)).scalars().all())
        citas_activas = [c for c in citas_dia if c.estado not in _ESTADOS_BLOQUEADOS]

        horarios: list[HorarioDisponible] = []
        for disp in disponibilidades:
            bloque_inicio = datetime(
                fecha.year, fecha.month, fecha.day,
                disp.hora_inicio.hour, disp.hora_inicio.minute,
                tzinfo=LIMA_TZ,
            )
            bloque_fin = datetime(
                fecha.year, fecha.month, fecha.day,
                disp.hora_fin.hour, disp.hora_fin.minute,
                tzinfo=LIMA_TZ,
            )

            cursor = bloque_inicio
            while cursor + duracion <= bloque_fin:
                fin_slot = cursor + duracion
                # RN13: slot conflicta si se solapa con cualquier cita (considerando buffer)
                ocupado = any(
                    cursor < (c.termina_en + buffer) and c.programada_en < (fin_slot + buffer)
                    for c in citas_activas
                )
                if not ocupado:
                    horarios.append(HorarioDisponible(inicio=cursor, fin=fin_slot))
                cursor += timedelta(minutes=30)

        if horarios:
            resultados.append(DisponibilidadResponse(personal_id=personal.id, horarios=horarios))

    return resultados


# ── Admin ─────────────────────────────────────────────────────────────────────

async def actualizar_categoria(session: AsyncSession, categoria_id: UUID, body: ActualizarCategoriaRequest) -> Categoria:
    categoria = await session.get(Categoria, categoria_id)
    if not categoria:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoría no encontrada")

    if body.esta_activo is False:
        stmt = select(func.count()).select_from(Servicio).where(
            Servicio.categoria_id == categoria_id,
            Servicio.esta_activo,
        )
        servicios_activos = (await session.execute(stmt)).scalar_one()
        if servicios_activos > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"No se puede desactivar: la categoría tiene {servicios_activos} servicio(s) activo(s)",
            )

    if body.nombre and body.nombre != categoria.nombre:
        existente = (await session.execute(select(Categoria).where(Categoria.nombre == body.nombre))).scalar_one_or_none()
        if existente:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ya existe una categoría con ese nombre",
            )

    datos = body.model_dump(exclude_none=True)
    for campo, valor in datos.items():
        setattr(categoria, campo, valor)
    await session.flush()
    return categoria


async def crear_categoria(session: AsyncSession, body: CrearCategoriaRequest) -> Categoria:
    existente = (await session.execute(select(Categoria).where(Categoria.nombre == body.nombre))).scalar_one_or_none()
    if existente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una categoría con ese nombre",
        )
    categoria = Categoria(**body.model_dump())
    session.add(categoria)
    await session.flush()
    return categoria


async def crear_servicio(session: AsyncSession, body: CrearServicioRequest) -> Servicio:
    categoria = await session.get(Categoria, body.categoria_id)
    if not categoria or not categoria.esta_activo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoría no encontrada o inactiva")

    servicio = Servicio(**body.model_dump())
    session.add(servicio)
    await session.flush()
    return servicio


async def actualizar_servicio(session: AsyncSession, servicio_id: UUID, body: ActualizarServicioRequest) -> Servicio:
    servicio = await session.get(Servicio, servicio_id)
    if not servicio:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Servicio no encontrado")

    datos = body.model_dump(exclude_none=True)
    for campo, valor in datos.items():
        setattr(servicio, campo, valor)

    await session.flush()
    return servicio
