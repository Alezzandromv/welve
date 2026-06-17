import asyncio
from datetime import date, datetime, timedelta
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status

from app.models.cita import Cita, CitaServicio
from app.models.cliente import Cliente, FichaSalud
from app.models.personal import DisponibilidadPersonal, Personal
from app.models.servicio import Servicio
from app.schemas.citas import CambiarEstadoRequest, CrearCitaAdminRequest, CrearCitaRequest
from app.utils.timezone import a_lima, ahora_lima

LIMA_TZ = ZoneInfo("America/Lima")

_ESTADOS_BLOQUEADOS: set[str] = {"cancelada", "cancelada_tardia", "no_show"}

# RN: transiciones de estado válidas — fuente de verdad para toda la app
_TRANSICIONES_VALIDAS: dict[str, set[str]] = {
    "pendiente":        {"confirmada", "cancelada"},
    "confirmada":       {"en_curso", "cancelada", "cancelada_tardia", "no_show"},
    "en_curso":         {"completada", "no_show"},
    "completada":       set(),
    "cancelada":        set(),
    "cancelada_tardia": set(),
    "no_show":          set(),
}


async def _fichas_criticas(cliente_id: UUID) -> list[FichaSalud]:
    return await FichaSalud.find(
        FichaSalud.cliente_id == cliente_id,
        FichaSalud.severidad == "critica",
        FichaSalud.esta_activo == True,
    ).to_list()


async def crear(body: CrearCitaRequest, usuario_id: UUID) -> Cita:
    # RN11: rechazar si cliente bloqueada
    cliente = await Cliente.find_one(Cliente.usuario_id == usuario_id)
    if not cliente:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Perfil de cliente no encontrado")
    if cliente.esta_bloqueada:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No es posible realizar la reserva")

    if not body.servicio_ids:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Debe seleccionar al menos un servicio")

    servicios: list[Servicio] = []
    for sid in body.servicio_ids:
        s = await Servicio.get(sid)
        if not s or not s.esta_activo:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Servicio {sid} no encontrado o inactivo")
        servicios.append(s)

    # RN08: si algún servicio requiere ficha de salud, debe existir una activa
    if any(s.requiere_ficha_salud for s in servicios):
        ficha = await FichaSalud.find_one(
            FichaSalud.cliente_id == cliente.id,
            FichaSalud.esta_activo == True,
        )
        if not ficha:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Este servicio requiere una ficha de salud registrada. Solicita a la administración que la registre.",
            )

    programada_en = a_lima(body.programada_en)
    if programada_en <= ahora_lima():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La fecha y hora de la cita deben ser futuras",
        )

    duracion_total = sum(s.duracion_minutos for s in servicios)
    termina_en = programada_en + timedelta(minutes=duracion_total)

    personal = await Personal.get(body.personal_id)
    if not personal or not personal.esta_activo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Especialista no encontrada o inactiva")

    # RN13: validar solapamiento + buffer en ambas direcciones
    # buffer se lee del perfil del personal (cualquier disponibilidad activa)
    disp = await DisponibilidadPersonal.find_one(
        DisponibilidadPersonal.personal_id == personal.id,
        DisponibilidadPersonal.esta_activo == True,
    )
    buffer = timedelta(minutes=disp.minutos_buffer if disp else 10)

    citas_personal = await Cita.find(Cita.personal_id == personal.id).to_list()
    for c in citas_personal:
        if c.estado in _ESTADOS_BLOQUEADOS:
            continue
        # Conflicto si los rangos expandidos por buffer se solapan
        if programada_en < (c.termina_en + buffer) and c.programada_en < (termina_en + buffer):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El horario seleccionado no está disponible para la especialista",
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


async def crear_para_admin(body: CrearCitaAdminRequest) -> Cita:
    cliente = await Cliente.get(body.cliente_id)
    if not cliente:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrada")
    if cliente.esta_bloqueada:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="El cliente está bloqueado")

    if not body.servicio_ids:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Debe seleccionar al menos un servicio")

    servicios: list[Servicio] = []
    for sid in body.servicio_ids:
        s = await Servicio.get(sid)
        if not s or not s.esta_activo:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Servicio {sid} no encontrado o inactivo")
        servicios.append(s)

    programada_en = a_lima(body.programada_en)
    duracion_total = sum(s.duracion_minutos for s in servicios)
    termina_en = programada_en + timedelta(minutes=duracion_total)

    personal = await Personal.get(body.personal_id)
    if not personal or not personal.esta_activo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Especialista no encontrada o inactiva")

    disp = await DisponibilidadPersonal.find_one(
        DisponibilidadPersonal.personal_id == personal.id,
        DisponibilidadPersonal.esta_activo == True,
    )
    buffer = timedelta(minutes=disp.minutos_buffer if disp else 10)

    citas_personal = await Cita.find(Cita.personal_id == personal.id).to_list()
    for c in citas_personal:
        if c.estado in _ESTADOS_BLOQUEADOS:
            continue
        if programada_en < (c.termina_en + buffer) and c.programada_en < (termina_en + buffer):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El horario seleccionado no está disponible para la especialista",
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

    # Leer horas_cancelacion_sin_penalidad del servicio más restrictivo (mayor umbral)
    # Nunca hardcodear — siempre leer del modelo Servicio (RN01/RN02)
    cita_servicios = await CitaServicio.find(CitaServicio.cita_id == cita.id).to_list()
    horas_umbral = 5  # fallback defensivo; nunca debería ejecutarse si hay CitaServicio
    if cita_servicios:
        servicios = [await Servicio.get(cs.servicio_id) for cs in cita_servicios]
        horas_umbral = max(
            (s.horas_cancelacion_sin_penalidad for s in servicios if s),
            default=5,
        )

    ahora = ahora_lima()
    horas_hasta_cita = (cita.programada_en - ahora).total_seconds() / 3600

    if horas_hasta_cita >= horas_umbral:
        # RN01: cancelación a tiempo — sin penalidad, reembolso completo
        cita.estado = "cancelada"
        cita.penalizacion_aplicada = False
    else:
        # RN02: cancelación tardía — pierde depósito, penalización aplicada
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

    # Trabajador solo puede modificar sus propias citas
    if usuario.get("rol") == "trabajador":
        personal = await Personal.find_one(Personal.usuario_id == UUID(usuario["sub"]))
        if not personal or cita.personal_id != personal.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permiso para modificar esta cita")

    permitidos = _TRANSICIONES_VALIDAS.get(cita.estado, set())
    if body.estado not in permitidos:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Transición '{cita.estado}' → '{body.estado}' no permitida",
        )

    # RN09: al iniciar, alertar si hay fichas críticas — bloquea sin confirmación explícita
    if body.estado == "en_curso" and not body.confirmar_ficha_critica:
        criticas = await _fichas_criticas(cita.cliente_id)
        if criticas:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "codigo": "FICHA_CRITICA",
                    "mensaje": "Esta cliente tiene restricciones de salud críticas. Revísalas antes de iniciar el servicio.",
                    "fichas": [
                        {"tipo": f.tipo_restriccion, "descripcion": f.descripcion}
                        for f in criticas
                    ],
                },
            )

    # RN03: no_show manual — pierde depósito
    if body.estado == "no_show":
        cita.penalizacion_aplicada = True

    cita.estado = body.estado  # type: ignore[assignment]
    if body.notas_especialista:
        cita.notas_especialista = body.notas_especialista

    # Al marcar en_curso: registrar hora de llegada si aún no está registrada
    if body.estado == "en_curso" and cita.hora_llegada_real is None:
        cita.hora_llegada_real = ahora_lima()

    await cita.save()

    # RN15: al completar, verificar si el cliente cumplió algún reto
    if body.estado == "completada":
        from app.services.fidelizacion_service import verificar_retos_completados
        await verificar_retos_completados(cita.cliente_id)

    return cita


async def registrar_llegada(cita_id: UUID, hora_llegada: datetime, usuario: dict) -> Cita:
    """Registra hora_llegada_real sin cambiar estado — llamable por admin o trabajador asignado."""
    cita = await Cita.get(cita_id)
    if not cita:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cita no encontrada")

    if usuario.get("rol") == "trabajador":
        personal = await Personal.find_one(Personal.usuario_id == UUID(usuario["sub"]))
        if not personal or cita.personal_id != personal.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permiso para modificar esta cita")

    if cita.estado not in ("pendiente", "confirmada"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Solo se puede registrar llegada en citas pendientes o confirmadas",
        )

    cita.hora_llegada_real = a_lima(hora_llegada)
    await cita.save()
    return cita


async def listar_por_cliente(usuario_id: UUID) -> list[Cita]:
    cliente = await Cliente.find_one(Cliente.usuario_id == usuario_id)
    if not cliente:
        return []
    return await Cita.find(Cita.cliente_id == cliente.id).sort("-programada_en").to_list()


async def listar_todas(fecha: date | None = None, estado: str | None = None) -> list[Cita]:
    filtros = []
    if fecha:
        inicio = datetime(fecha.year, fecha.month, fecha.day, tzinfo=LIMA_TZ)
        fin = inicio + timedelta(days=1)
        filtros.extend([Cita.programada_en >= inicio, Cita.programada_en < fin])
    if estado:
        filtros.append(Cita.estado == estado)

    query = Cita.find(*filtros)
    orden = "+programada_en" if fecha else "-programada_en"
    return await query.sort(orden).to_list()


async def agenda_trabajador(usuario_id: UUID, fecha: date | None = None) -> list[Cita]:
    personal = await Personal.find_one(Personal.usuario_id == usuario_id)
    if not personal:
        return []

    d = fecha or ahora_lima().date()
    inicio = datetime(d.year, d.month, d.day, tzinfo=LIMA_TZ)
    fin = inicio + timedelta(days=1)

    return await Cita.find(
        Cita.personal_id == personal.id,
        Cita.programada_en >= inicio,
        Cita.programada_en < fin,
    ).sort("+programada_en").to_list()


async def servicios_de_cita(cita_id: UUID) -> list[CitaServicio]:
    return await CitaServicio.find(CitaServicio.cita_id == cita_id).to_list()


async def listar_todas_con_nombres(
    fecha: date | None = None,
    estado: str | None = None,
) -> list[dict]:
    """Igual que listar_todas pero enriquece con nombres para el dashboard admin."""
    from beanie.operators import In
    from app.models.usuario import Usuario

    citas = await listar_todas(fecha, estado)
    if not citas:
        return []

    cita_ids = [c.id for c in citas]
    cliente_ids = list({c.cliente_id for c in citas})
    personal_ids = list({c.personal_id for c in citas})

    clientes_res, personal_res, cs_res = await asyncio.gather(
        Cliente.find(In(Cliente.id, cliente_ids)).to_list(),
        Personal.find(In(Personal.id, personal_ids)).to_list(),
        CitaServicio.find(In(CitaServicio.cita_id, cita_ids)).to_list(),
    )

    clientes_map = {c.id: c for c in clientes_res}
    personal_map = {p.id: p for p in personal_res}

    usuario_ids = list({
        *[c.usuario_id for c in clientes_map.values()],
        *[p.usuario_id for p in personal_map.values()],
    })

    primer_cs_por_cita: dict[UUID, CitaServicio] = {}
    for cs in cs_res:
        primer_cs_por_cita.setdefault(cs.cita_id, cs)

    servicio_ids = list({cs.servicio_id for cs in primer_cs_por_cita.values()})

    usuarios_res, servicios_res = await asyncio.gather(
        Usuario.find(In(Usuario.id, usuario_ids)).to_list(),
        Servicio.find(In(Servicio.id, servicio_ids)).to_list(),
    )

    usuarios_map = {u.id: u for u in usuarios_res}
    servicios_map = {s.id: s for s in servicios_res}

    result = []
    for cita in citas:
        d = cita.model_dump()

        cliente = clientes_map.get(cita.cliente_id)
        u_cli = usuarios_map.get(cliente.usuario_id) if cliente else None
        d["nombre_cliente"] = u_cli.nombre_completo if u_cli else None

        personal = personal_map.get(cita.personal_id)
        u_per = usuarios_map.get(personal.usuario_id) if personal else None
        d["nombre_especialista"] = u_per.nombre_completo if u_per else None

        cs = primer_cs_por_cita.get(cita.id)
        svc = servicios_map.get(cs.servicio_id) if cs else None
        d["nombre_servicio"] = svc.nombre if svc else None

        result.append(d)

    return result

async def enriquecer_cita(cita: Cita) -> dict:
    from app.models.usuario import Usuario

    d = cita.model_dump()

    cliente, personal, cs = await asyncio.gather(
        Cliente.get(cita.cliente_id),
        Personal.get(cita.personal_id),
        CitaServicio.find_one(CitaServicio.cita_id == cita.id),
    )

    u_cli = await Usuario.get(cliente.usuario_id) if cliente else None
    d["nombre_cliente"] = u_cli.nombre_completo if u_cli else None

    u_per = await Usuario.get(personal.usuario_id) if personal else None
    d["nombre_especialista"] = u_per.nombre_completo if u_per else None

    svc = await Servicio.get(cs.servicio_id) if cs else None
    d["nombre_servicio"] = svc.nombre if svc else None

    return d