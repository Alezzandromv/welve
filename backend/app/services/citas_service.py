from datetime import date, datetime, timedelta
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.models.cita import Cita, CitaServicio
from app.models.cliente import Cliente, FichaSalud
from app.models.enums import EstadoCita
from app.models.personal import DisponibilidadPersonal, Personal
from app.models.servicio import Servicio
from app.models.usuario import Usuario
from app.schemas.citas import (
    CambiarEstadoCitaRequest,
    CrearCitaAdminRequest,
    CrearCitaRequest,
)
from app.services._comunes import (
    cita_a_dict,
    cliente_por_usuario_id,
    personal_por_usuario_id,
    resolver_servicios_activos,
)
from app.utils.disponibilidad import se_solapa
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


def _programar_recordatorios(cita: Cita) -> None:
    """Agenda los recordatorios de WhatsApp 24h/2h antes de la cita vía Celery ETA — import
    diferido para no acoplar el arranque de la API a la carga del módulo `tasks/` (que
    inicializa el cliente de Celery). No se agenda si el ETA ya quedó en el pasado (cita
    creada con menos de 24h/2h de anticipación) — la propia task también es defensiva por
    si la cita se cancela o su transacción hace rollback después de este punto."""
    from app.tasks.recordatorios import recordatorio_2h, recordatorio_24h

    ahora = ahora_lima()
    eta_24h = cita.programada_en - timedelta(hours=24)
    eta_2h = cita.programada_en - timedelta(hours=2)

    if eta_24h > ahora:
        recordatorio_24h.apply_async(args=[str(cita.id)], eta=eta_24h)
    if eta_2h > ahora:
        recordatorio_2h.apply_async(args=[str(cita.id)], eta=eta_2h)


async def _validar_ficha_salud_requerida(session: AsyncSession, cliente_id: UUID, servicios: list) -> None:
    """RN08: si algún servicio requiere ficha de salud, debe existir una activa. Aplica por
    igual a la reserva de cliente y a la creación por admin — es una regla de seguridad del
    cliente, no una conveniencia de agenda que el admin deba poder saltarse en silencio."""
    if not any(s.requiere_ficha_salud for s in servicios):
        return
    ficha = (
        await session.execute(
            select(FichaSalud).where(
                FichaSalud.cliente_id == cliente_id,
                FichaSalud.esta_activo,
            ).limit(1)
        )
    ).scalar_one_or_none()
    if not ficha:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Este servicio requiere una ficha de salud registrada. Solicita a la administración que la registre.",
        )


async def _fichas_criticas(session: AsyncSession, cliente_id: UUID) -> list[FichaSalud]:
    stmt = select(FichaSalud).where(
        FichaSalud.cliente_id == cliente_id,
        FichaSalud.severidad == "critica",
        FichaSalud.esta_activo,
    )
    return list((await session.execute(stmt)).scalars().all())


async def _validar_solapamiento(session: AsyncSession, personal: Personal, programada_en: datetime, termina_en: datetime) -> None:
    """RN13: valida solapamiento + buffer en ambas direcciones. Acota la consulta a una
    ventana de ±1 día alrededor de la nueva cita (ninguna cita dura más de eso) en vez de
    cargar el historial completo del personal — misma semántica, muchas menos filas."""
    disp = (
        await session.execute(
            select(DisponibilidadPersonal).where(
                DisponibilidadPersonal.personal_id == personal.id,
                DisponibilidadPersonal.esta_activo,
            ).limit(1)
        )
    ).scalar_one_or_none()
    buffer_minutos = disp.minutos_buffer if disp else 10

    ventana_inicio = programada_en - timedelta(days=1)
    ventana_fin = termina_en + timedelta(days=1)
    stmt = select(Cita).where(
        Cita.personal_id == personal.id,
        Cita.programada_en < ventana_fin,
        Cita.termina_en > ventana_inicio,
    )
    citas_personal = (await session.execute(stmt)).scalars().all()
    for c in citas_personal:
        if c.estado in _ESTADOS_BLOQUEADOS:
            continue
        if se_solapa(programada_en, termina_en, c.programada_en, c.termina_en, buffer_minutos):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El horario seleccionado no está disponible para la especialista",
            )


async def crear(session: AsyncSession, body: CrearCitaRequest, usuario_id: UUID) -> Cita:
    # RN11: rechazar si cliente bloqueada
    cliente = await cliente_por_usuario_id(session, usuario_id)
    if cliente.esta_bloqueada:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No es posible realizar la reserva")

    servicios = await resolver_servicios_activos(session, body.servicio_ids)
    await _validar_ficha_salud_requerida(session, cliente.id, servicios)

    programada_en = a_lima(body.programada_en)
    if programada_en <= ahora_lima():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="La fecha y hora de la cita deben ser futuras",
        )

    duracion_total = sum(s.duracion_minutos for s in servicios)
    termina_en = programada_en + timedelta(minutes=duracion_total)

    personal = await session.get(Personal, body.personal_id)
    if not personal or not personal.esta_activo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Especialista no encontrada o inactiva")

    await _validar_solapamiento(session, personal, programada_en, termina_en)

    nueva_cita = Cita(
        cliente_id=cliente.id,
        personal_id=personal.id,
        programada_en=programada_en,
        termina_en=termina_en,
        notas_cliente=body.notas_cliente,
    )
    session.add(nueva_cita)
    await session.flush()

    for s in servicios:
        session.add(CitaServicio(
            cita_id=nueva_cita.id,
            servicio_id=s.id,
            precio_unitario=s.precio,
            duracion_minutos=s.duracion_minutos,
        ))
    await session.flush()
    _programar_recordatorios(nueva_cita)

    return nueva_cita


async def crear_para_admin(session: AsyncSession, body: CrearCitaAdminRequest) -> Cita:
    cliente = await session.get(Cliente, body.cliente_id)
    if not cliente:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrada")
    if cliente.esta_bloqueada:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="El cliente está bloqueado")

    servicios = await resolver_servicios_activos(session, body.servicio_ids)
    await _validar_ficha_salud_requerida(session, cliente.id, servicios)

    programada_en = a_lima(body.programada_en)
    if not body.permitir_fecha_pasada and programada_en <= ahora_lima():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="La fecha y hora de la cita deben ser futuras (o pasar permitir_fecha_pasada=true para backfill)",
        )

    duracion_total = sum(s.duracion_minutos for s in servicios)
    termina_en = programada_en + timedelta(minutes=duracion_total)

    personal = await session.get(Personal, body.personal_id)
    if not personal or not personal.esta_activo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Especialista no encontrada o inactiva")

    await _validar_solapamiento(session, personal, programada_en, termina_en)

    nueva_cita = Cita(
        cliente_id=cliente.id,
        personal_id=personal.id,
        programada_en=programada_en,
        termina_en=termina_en,
        notas_cliente=body.notas_cliente,
    )
    session.add(nueva_cita)
    await session.flush()

    for s in servicios:
        session.add(CitaServicio(
            cita_id=nueva_cita.id,
            servicio_id=s.id,
            precio_unitario=s.precio,
            duracion_minutos=s.duracion_minutos,
        ))
    await session.flush()
    _programar_recordatorios(nueva_cita)

    return nueva_cita


async def cancelar(session: AsyncSession, cita_id: UUID, solicitante_id: UUID, motivo: str | None) -> Cita:
    cita = await session.get(Cita, cita_id)
    if not cita:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cita no encontrada")

    if cita.estado not in ("pendiente", "confirmada"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="La cita no puede cancelarse en su estado actual",
        )

    # Leer horas_cancelacion_sin_penalidad del servicio más restrictivo (mayor umbral)
    # Nunca hardcodear — siempre leer del modelo Servicio (RN01/RN02)
    cita_servicios = (await session.execute(select(CitaServicio).where(CitaServicio.cita_id == cita.id))).scalars().all()
    horas_umbral = 5  # fallback defensivo; nunca debería ejecutarse si hay CitaServicio
    if cita_servicios:
        servicio_ids = [cs.servicio_id for cs in cita_servicios]
        servicios = (await session.execute(select(Servicio).where(Servicio.id.in_(servicio_ids)))).scalars().all()
        horas_umbral = max(
            (s.horas_cancelacion_sin_penalidad for s in servicios),
            default=5,
        )

    ahora = ahora_lima()
    horas_hasta_cita = (cita.programada_en - ahora).total_seconds() / 3600

    if horas_hasta_cita >= horas_umbral:
        # RN01: cancelación a tiempo — sin penalidad, reembolso completo
        cita.estado = EstadoCita.cancelada
        cita.penalizacion_aplicada = False
    else:
        # RN02: cancelación tardía — pierde depósito, penalización aplicada
        cita.estado = EstadoCita.cancelada_tardia
        cita.penalizacion_aplicada = True

    cita.motivo_cancelacion = motivo
    cita.fecha_cancelacion = ahora
    await session.flush()
    return cita


async def cambiar_estado(session: AsyncSession, cita_id: UUID, body: CambiarEstadoCitaRequest, usuario: dict) -> Cita:
    cita = await session.get(Cita, cita_id)
    if not cita:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cita no encontrada")

    # Trabajador solo puede modificar sus propias citas
    if usuario.get("rol") == "trabajador":
        personal = await personal_por_usuario_id(session, UUID(usuario["sub"]))
        if not personal or cita.personal_id != personal.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permiso para modificar esta cita")

    permitidos = _TRANSICIONES_VALIDAS.get(cita.estado, set())
    if body.estado not in permitidos:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Transición '{cita.estado}' → '{body.estado}' no permitida",
        )

    # RN09: al iniciar, alertar si hay fichas críticas — bloquea sin confirmación explícita
    if body.estado == "en_curso" and not body.confirmar_ficha_critica:
        criticas = await _fichas_criticas(session, cita.cliente_id)
        if criticas:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
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

    cita.estado = EstadoCita(body.estado)
    if body.notas_especialista:
        cita.notas_especialista = body.notas_especialista

    # Al marcar en_curso: registrar hora de llegada si aún no está registrada
    if body.estado == "en_curso" and cita.hora_llegada_real is None:
        cita.hora_llegada_real = ahora_lima()

    await session.flush()

    # RN15: al completar, verificar si el cliente cumplió algún reto
    if body.estado == "completada":
        from app.services.fidelizacion_service import verificar_retos_completados
        await verificar_retos_completados(session, cita.cliente_id)

    return cita


async def registrar_llegada(session: AsyncSession, cita_id: UUID, hora_llegada: datetime, usuario: dict) -> Cita:
    """Registra hora_llegada_real sin cambiar estado — llamable por admin o trabajador asignado."""
    cita = await session.get(Cita, cita_id)
    if not cita:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cita no encontrada")

    if usuario.get("rol") == "trabajador":
        personal = await personal_por_usuario_id(session, UUID(usuario["sub"]))
        if not personal or cita.personal_id != personal.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permiso para modificar esta cita")

    if cita.estado not in ("pendiente", "confirmada"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Solo se puede registrar llegada en citas pendientes o confirmadas",
        )

    cita.hora_llegada_real = a_lima(hora_llegada)
    await session.flush()
    return cita


async def listar_por_cliente(session: AsyncSession, usuario_id: UUID) -> list[Cita]:
    cliente = (await session.execute(select(Cliente).where(Cliente.usuario_id == usuario_id))).scalar_one_or_none()
    if not cliente:
        return []
    stmt = select(Cita).where(Cita.cliente_id == cliente.id).order_by(Cita.programada_en.desc())
    return list((await session.execute(stmt)).scalars().all())


async def listar_todas(
    session: AsyncSession, fecha: date | None = None, estado: str | None = None,
    limit: int = 50, offset: int = 0,
) -> list[Cita]:
    stmt = select(Cita)
    if fecha:
        inicio = datetime(fecha.year, fecha.month, fecha.day, tzinfo=LIMA_TZ)
        fin = inicio + timedelta(days=1)
        stmt = stmt.where(Cita.programada_en >= inicio, Cita.programada_en < fin)
    if estado:
        stmt = stmt.where(Cita.estado == estado)

    stmt = stmt.order_by(Cita.programada_en.asc() if fecha else Cita.programada_en.desc()).limit(limit).offset(offset)
    return list((await session.execute(stmt)).scalars().all())


async def agenda_trabajador(session: AsyncSession, usuario_id: UUID, fecha: date | None = None) -> list[Cita]:
    personal = (await session.execute(select(Personal).where(Personal.usuario_id == usuario_id))).scalar_one_or_none()
    if not personal:
        return []

    d = fecha or ahora_lima().date()
    inicio = datetime(d.year, d.month, d.day, tzinfo=LIMA_TZ)
    fin = inicio + timedelta(days=1)

    stmt = (
        select(Cita)
        .where(Cita.personal_id == personal.id, Cita.programada_en >= inicio, Cita.programada_en < fin)
        .order_by(Cita.programada_en.asc())
    )
    return list((await session.execute(stmt)).scalars().all())


async def servicios_de_cita(session: AsyncSession, cita_id: UUID) -> list[CitaServicio]:
    stmt = select(CitaServicio).where(CitaServicio.cita_id == cita_id)
    return list((await session.execute(stmt)).scalars().all())


async def listar_todas_con_nombres(
    session: AsyncSession, fecha: date | None = None, estado: str | None = None,
    limit: int = 50, offset: int = 0,
) -> list[dict]:
    """Igual que listar_todas pero enriquece con nombres para el dashboard admin —
    colapsado a joins en vez de las 5 queries batch + asyncio.gather de la versión Mongo."""
    citas = await listar_todas(session, fecha, estado, limit, offset)
    if not citas:
        return []

    cita_ids = [c.id for c in citas]
    cliente_ids = list({c.cliente_id for c in citas})
    personal_ids = list({c.personal_id for c in citas})

    # Secuencial: una AsyncSession no admite ejecutar statements concurrentemente.
    clientes_res = await session.execute(select(Cliente).where(Cliente.id.in_(cliente_ids)))
    personal_res = await session.execute(select(Personal).where(Personal.id.in_(personal_ids)))
    cs_res = await session.execute(select(CitaServicio).where(CitaServicio.cita_id.in_(cita_ids)))
    clientes_map = {c.id: c for c in clientes_res.scalars().all()}
    personal_map = {p.id: p for p in personal_res.scalars().all()}

    usuario_ids = list({
        *[c.usuario_id for c in clientes_map.values()],
        *[p.usuario_id for p in personal_map.values()],
    })

    primer_cs_por_cita: dict[UUID, CitaServicio] = {}
    for cs in cs_res.scalars().all():
        primer_cs_por_cita.setdefault(cs.cita_id, cs)

    servicio_ids = list({cs.servicio_id for cs in primer_cs_por_cita.values()})

    usuarios_res = await session.execute(select(Usuario).where(Usuario.id.in_(usuario_ids)))
    servicios_res = await session.execute(select(Servicio).where(Servicio.id.in_(servicio_ids)))
    usuarios_map = {u.id: u for u in usuarios_res.scalars().all()}
    servicios_map = {s.id: s for s in servicios_res.scalars().all()}

    result = []
    for cita in citas:
        d = cita_a_dict(cita)

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


async def enriquecer_cita(session: AsyncSession, cita: Cita) -> dict:
    """Resuelve nombre_cliente, nombre_especialista y nombre_servicio en 3 queries
    pequeñas y dirigidas (secuenciales — una AsyncSession no admite ejecutar statements
    concurrentemente, a diferencia del `asyncio.gather` que usaba la versión Mongo)."""
    u_cliente = aliased(Usuario)
    u_personal = aliased(Usuario)

    stmt_cliente = (
        select(u_cliente.nombre_completo)
        .select_from(Cliente)
        .join(u_cliente, Cliente.usuario_id == u_cliente.id)
        .where(Cliente.id == cita.cliente_id)
    )
    stmt_personal = (
        select(u_personal.nombre_completo)
        .select_from(Personal)
        .join(u_personal, Personal.usuario_id == u_personal.id)
        .where(Personal.id == cita.personal_id)
    )
    stmt_servicio = (
        select(Servicio.nombre)
        .select_from(CitaServicio)
        .join(Servicio, Servicio.id == CitaServicio.servicio_id)
        .where(CitaServicio.cita_id == cita.id)
        .limit(1)
    )

    # Nota: AsyncSession no permite ejecutar statements concurrentemente sobre la misma
    # conexión (a diferencia de Motor) — se ejecutan secuencialmente, no con asyncio.gather.
    res_cliente = await session.execute(stmt_cliente)
    res_personal = await session.execute(stmt_personal)
    res_servicio = await session.execute(stmt_servicio)

    d = cita_a_dict(cita)
    d["nombre_cliente"] = res_cliente.scalar_one_or_none()
    d["nombre_especialista"] = res_personal.scalar_one_or_none()
    d["nombre_servicio"] = res_servicio.scalar_one_or_none()
    return d
