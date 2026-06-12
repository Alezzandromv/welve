from datetime import date, datetime, timedelta
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status

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


async def listar(categoria_id: UUID | None = None, incluir_inactivos: bool = False) -> list[Servicio]:
    filtros = []
    if categoria_id:
        filtros.append(Servicio.categoria_id == categoria_id)
    if not incluir_inactivos:
        filtros.append(Servicio.esta_activo == True)
    return await Servicio.find(*filtros).to_list()


async def listar_categorias() -> list[Categoria]:
    return (
        await Categoria.find(Categoria.esta_activo == True)
        .sort("+orden_visualizacion")
        .to_list()
    )


async def calcular_disponibilidad(servicio_id: UUID, fecha: date) -> list[DisponibilidadResponse]:
    servicio = await Servicio.get(servicio_id)
    if not servicio:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Servicio no encontrado")

    duracion = timedelta(minutes=servicio.duracion_minutos)
    dia_modelo = _DIA_PYTHON_A_MODELO[fecha.weekday()]

    personal_activo = await Personal.find(Personal.esta_activo == True).to_list()
    if not personal_activo:
        return []

    inicio_dia = datetime(fecha.year, fecha.month, fecha.day, tzinfo=LIMA_TZ)
    fin_dia = inicio_dia + timedelta(days=1)
    resultados: list[DisponibilidadResponse] = []

    for personal in personal_activo:
        disponibilidades = await DisponibilidadPersonal.find(
            DisponibilidadPersonal.personal_id == personal.id,
            DisponibilidadPersonal.dia_semana == dia_modelo,
            DisponibilidadPersonal.esta_activo == True,
        ).to_list()

        if not disponibilidades:
            continue

        buffer = timedelta(minutes=disponibilidades[0].minutos_buffer)

        citas_dia = await Cita.find(
            Cita.personal_id == personal.id,
            Cita.programada_en >= inicio_dia,
            Cita.programada_en < fin_dia,
        ).to_list()
        citas_activas = [c for c in citas_dia if c.estado not in _ESTADOS_BLOQUEADOS]

        horarios: list[HorarioDisponible] = []
        for disp in disponibilidades:
            h_ini, m_ini = (int(x) for x in disp.hora_inicio.split(":")[:2])
            h_fin, m_fin = (int(x) for x in disp.hora_fin.split(":")[:2])
            bloque_inicio = datetime(
                fecha.year, fecha.month, fecha.day,
                h_ini, m_ini,
                tzinfo=LIMA_TZ,
            )
            bloque_fin = datetime(
                fecha.year, fecha.month, fecha.day,
                h_fin, m_fin,
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

async def actualizar_categoria(categoria_id: UUID, body: ActualizarCategoriaRequest) -> Categoria:
    categoria = await Categoria.get(categoria_id)
    if not categoria:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoría no encontrada")

    if body.esta_activo is False:
        servicios_activos = await Servicio.find(
            Servicio.categoria_id == categoria_id,
            Servicio.esta_activo == True,
        ).count()
        if servicios_activos > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"No se puede desactivar: la categoría tiene {servicios_activos} servicio(s) activo(s)",
            )

    if body.nombre and body.nombre != categoria.nombre:
        existente = await Categoria.find_one(Categoria.nombre == body.nombre)
        if existente:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ya existe una categoría con ese nombre",
            )

    datos = body.model_dump(exclude_none=True)
    for campo, valor in datos.items():
        setattr(categoria, campo, valor)
    await categoria.save()
    return categoria


async def crear_categoria(body: CrearCategoriaRequest) -> Categoria:
    existente = await Categoria.find_one(Categoria.nombre == body.nombre)
    if existente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una categoría con ese nombre",
        )
    categoria = Categoria(**body.model_dump())
    await categoria.insert()
    return categoria


async def crear_servicio(body: CrearServicioRequest) -> Servicio:
    categoria = await Categoria.get(body.categoria_id)
    if not categoria or not categoria.esta_activo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoría no encontrada o inactiva")

    servicio = Servicio(**body.model_dump())
    await servicio.insert()
    return servicio


async def actualizar_servicio(servicio_id: UUID, body: ActualizarServicioRequest) -> Servicio:
    servicio = await Servicio.get(servicio_id)
    if not servicio:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Servicio no encontrado")

    datos = body.model_dump(exclude_none=True)
    for campo, valor in datos.items():
        setattr(servicio, campo, valor)

    await servicio.save()
    return servicio
