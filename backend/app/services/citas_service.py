from datetime import datetime, timedelta
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status

from app.models.cita import Cita, CitaServicio
from app.models.cliente import Cliente, FichaSalud
from app.models.personal import DisponibilidadPersonal, Personal
from app.models.servicio import Servicio
from app.schemas.citas import CambiarEstadoRequest, CrearCitaRequest
from app.utils.timezone import a_lima, ahora_lima

LIMA_TZ = ZoneInfo("America/Lima")
_ESTADOS_BLOQUEADOS = {"cancelada", "cancelada_tardia", "no_show"}
_TRANSICIONES_VALIDAS: dict[str, set[str]] = {
    "pendiente":  {"confirmada", "cancelada"},
    "confirmada": {"en_curso", "cancelada", "cancelada_tardia", "no_show"},
    "en_curso":   {"completada", "no_show"},
    "completada": set(),
    "cancelada":  set(),
    "cancelada_tardia": set(),
    "no_show":    set(),
}


async def crear(body: CrearCitaRequest, cliente_id: UUID) -> Cita:
    # RN11: cliente no bloqueada
    cliente = await Cliente.find_one(Cliente.usuario_id == cliente_id)
    if not cliente:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Perfil de cliente no encontrado")
    if cliente.esta_bloqueada:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No es posible realizar la reserva")

    # Obtener servicios
    servicios: list[Servicio] = []
    for sid in body.servicio_ids:
        s = await Servicio.get(sid)
        if not s or not s.esta_activo:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Servicio {sid} no encontrado")
        servicios.append(s)

    # RN08: ficha de salud requerida
    if any(s.requiere_ficha_salud for s in servicios):
        ficha = await FichaSalud.find_one(
            FichaSalud.cliente_id == cliente.id,
            FichaSalud.esta_activo == True,
        )
        if not ficha:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Este servicio requiere ficha de salud registrada",
            )

    # Calcular termina_en
    duracion_total = sum(s.duracion_minutos for s in servicios)
    programada_en = a_lima(body.programada_en)
    termina_en = programada_en + timedelta(minutes=duracion_total)

    # Obtener personal y buffer
    personal = await Personal.get(body.personal_id)
    if not personal or not personal.esta_activo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Especialista no encontrado")

    # RN13: sin solapamiento + buffer
    disp = await DisponibilidadPersonal.find_one(
        DisponibilidadPersonal.personal_id == personal.id,
        DisponibilidadPersonal.esta_activo == True,
    )
    buffer = timedelta(minutes=disp.minutos_buffer if disp else 10)

    citas_personal = await Cita.find(Cita.personal_id == personal.id).to_list()
    for cita in citas_personal:
        if cita.estado in _ESTADOS_BLOQUEADOS:
            continue
        if programada_en < (cita.termina_en + buffer) and termina_en > cita.programada_en:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Horario no disponible para el especialista seleccionado",
            )

    nueva_cita = Cita(
        cliente_id=cliente.id,
        personal_id=personal.id,
        programada_en=programada_en,
        termina_en=termina_en,
        notas_cliente=body.notas_cliente,
    )
    await nueva_cita.insert()

    for s in servicios:
        await CitaServicio(
            cita_id=nueva_cita.id,
            servicio_id=s.id,
            precio_unitario=s.precio,
            duracion_minutos=s.duracion_minutos,
        ).insert()

    return nueva_cita


async def cancelar(cita_id: UUID, solicitante_id: UUID, motivo: str | None) -> Cita:
    cita = await Cita.get(cita_id)
    if not cita:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cita no encontrada")

    if cita.estado not in ("pendiente", "confirmada"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La cita no puede cancelarse en su estado actual",
        )

    # Obtener servicio principal para leer horas_cancelacion_sin_penalidad
    cita_servicio = await CitaServicio.find_one(CitaServicio.cita_id == cita.id)
    servicio = await Servicio.get(cita_servicio.servicio_id) if cita_servicio else None
    horas_umbral = servicio.horas_cancelacion_sin_penalidad if servicio else 5

    ahora = ahora_lima()
    horas_hasta_cita = (cita.programada_en - ahora).total_seconds() / 3600

    if horas_hasta_cita >= horas_umbral:
        # RN01: cancelación sin penalidad
        cita.estado = "cancelada"
        cita.penalizacion_aplicada = False
    else:
        # RN02: cancelación tardía, pierde depósito
        cita.estado = "cancelada_tardia"
        cita.penalizacion_aplicada = True

    cita.motivo_cancelacion = motivo
    cita.fecha_cancelacion = ahora
    await cita.save()
    return cita


async def cambiar_estado(cita_id: UUID, body: CambiarEstadoRequest, usuario: dict) -> Cita:
    cita = await Cita.get(cita_id)
    if not cita:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cita no encontrada")

    permitidos = _TRANSICIONES_VALIDAS.get(cita.estado, set())
    if body.estado not in permitidos:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Transición '{cita.estado}' → '{body.estado}' no permitida",
        )

    cita.estado = body.estado
    if body.notas_especialista:
        cita.notas_especialista = body.notas_especialista
    if body.estado == "en_curso":
        cita.hora_llegada_real = ahora_lima()

    await cita.save()

    # RN15: al completar, verificar retos del cliente
    if body.estado == "completada":
        from app.services.fidelizacion_service import verificar_retos_completados
        await verificar_retos_completados(cita.cliente_id)

    return cita


async def listar_por_cliente(cliente_id: UUID) -> list[Cita]:
    cliente = await Cliente.find_one(Cliente.usuario_id == cliente_id)
    if not cliente:
        return []
    return await Cita.find(Cita.cliente_id == cliente.id).sort("-programada_en").to_list()


async def listar_todas() -> list[Cita]:
    return await Cita.find().sort("-programada_en").to_list()


async def agenda_trabajador(personal_id: UUID, fecha: str | None) -> list[Cita]:
    personal = await Personal.find_one(Personal.usuario_id == personal_id)
    if not personal:
        return []

    if fecha:
        try:
            from datetime import date
            d = date.fromisoformat(fecha)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Formato de fecha inválido (YYYY-MM-DD)",
            )
    else:
        d = ahora_lima().date()

    inicio = datetime(d.year, d.month, d.day, tzinfo=LIMA_TZ)
    fin = inicio + timedelta(days=1)

    return await Cita.find(
        Cita.personal_id == personal.id,
        Cita.programada_en >= inicio,
        Cita.programada_en < fin,
    ).sort("+programada_en").to_list()
