from datetime import date, datetime, timedelta
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status

from app.models.cita import Cita
from app.models.personal import DisponibilidadPersonal, Personal
from app.models.servicio import Categoria, Servicio
from app.schemas.servicios import DisponibilidadResponse, HorarioDisponible

LIMA_TZ = ZoneInfo("America/Lima")

# dia_semana en el modelo: 0=domingo, 1=lunes, ..., 6=sábado
# Python's weekday(): 0=lunes, ..., 6=domingo
_DIA_PYTHON_A_MODELO = {0: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 0}
_ESTADOS_BLOQUEADOS = {"cancelada", "cancelada_tardia", "no_show"}


async def listar(categoria_id: UUID | None = None) -> list[Servicio]:
    if categoria_id:
        return (
            await Servicio.find(
                Servicio.categoria_id == categoria_id,
                Servicio.esta_activo == True,
            ).to_list()
        )
    return await Servicio.find(Servicio.esta_activo == True).to_list()


async def listar_categorias() -> list[Categoria]:
    return (
        await Categoria.find(Categoria.esta_activo == True)
        .sort("+orden_visualizacion")
        .to_list()
    )


async def calcular_disponibilidad(servicio_id: UUID, fecha: date) -> list[DisponibilidadResponse]:
    servicio = await Servicio.get(servicio_id)
    if not servicio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Servicio no encontrado",
        )

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
                ocupado = any(
                    cursor < (c.termina_en + buffer) and fin_slot > c.programada_en
                    for c in citas_activas
                )
                if not ocupado:
                    horarios.append(HorarioDisponible(inicio=cursor, fin=fin_slot))
                cursor += timedelta(minutes=30)

        if horarios:
            resultados.append(
                DisponibilidadResponse(personal_id=personal.id, horarios=horarios)
            )

    return resultados
