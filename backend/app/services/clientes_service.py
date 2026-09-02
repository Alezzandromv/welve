from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cita import Cita, CitaServicio
from app.models.cliente import Cliente, FichaSalud
from app.models.enums import SeveridadFicha
from app.models.personal import Personal
from app.models.servicio import Servicio
from app.models.usuario import Usuario
from app.schemas.clientes import ActualizarClienteRequest, FichaSaludRequest
from app.utils.timezone import ahora_lima


def _cliente_a_dict(cliente: Cliente, usuario: Usuario | None) -> dict:
    return {
        "id": cliente.id,
        "usuario_id": cliente.usuario_id,
        "fecha_nacimiento": cliente.fecha_nacimiento,
        "canal_captacion": cliente.canal_captacion,
        "etiquetas": cliente.etiquetas,
        "notas_internas": cliente.notas_internas,
        "esta_bloqueada": cliente.esta_bloqueada,
        "motivo_bloqueo": cliente.motivo_bloqueo,
        "nombre_completo": usuario.nombre_completo if usuario else None,
        "correo": usuario.correo if usuario else None,
        "telefono": usuario.telefono if usuario else None,
    }


async def listar_todos(session: AsyncSession) -> list[Cliente]:
    return list((await session.execute(select(Cliente))).scalars().all())


async def listar_todos_con_usuario(session: AsyncSession) -> list[dict]:
    stmt = select(Cliente, Usuario).join(Usuario, Cliente.usuario_id == Usuario.id)
    filas = (await session.execute(stmt)).all()
    return [_cliente_a_dict(cliente, usuario) for cliente, usuario in filas]


async def obtener_por_id(session: AsyncSession, cliente_id: UUID) -> Cliente:
    cliente = await session.get(Cliente, cliente_id)
    if not cliente:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrada")
    return cliente


async def obtener_con_usuario(session: AsyncSession, cliente_id: UUID) -> dict:
    cliente = await obtener_por_id(session, cliente_id)
    usuario = await session.get(Usuario, cliente.usuario_id)
    return {"cliente": cliente, "usuario": usuario}


async def historial(session: AsyncSession, cliente_id: UUID) -> list[dict]:
    stmt = select(Cita).where(Cita.cliente_id == cliente_id).order_by(Cita.programada_en.desc())
    citas = list((await session.execute(stmt)).scalars().all())
    if not citas:
        return []

    cita_ids = [c.id for c in citas]
    personal_ids = list({c.personal_id for c in citas})

    # Secuencial: una AsyncSession no admite ejecutar statements concurrentemente.
    personal_res = await session.execute(select(Personal).where(Personal.id.in_(personal_ids)))
    cs_res = await session.execute(select(CitaServicio).where(CitaServicio.cita_id.in_(cita_ids)))
    personal_map = {p.id: p for p in personal_res.scalars().all()}
    usuario_ids = list({p.usuario_id for p in personal_map.values()})

    cs_list = list(cs_res.scalars().all())
    # Puede haber varios CitaServicio por cita; nos quedamos con el primero (mismo criterio que antes).
    primer_cs_por_cita: dict[UUID, CitaServicio] = {}
    for cs in cs_list:
        primer_cs_por_cita.setdefault(cs.cita_id, cs)

    servicio_ids = list({cs.servicio_id for cs in primer_cs_por_cita.values()})

    usuarios_res = await session.execute(select(Usuario).where(Usuario.id.in_(usuario_ids)))
    servicios_res = await session.execute(select(Servicio).where(Servicio.id.in_(servicio_ids)))
    usuarios_map = {u.id: u for u in usuarios_res.scalars().all()}
    servicios_map = {s.id: s for s in servicios_res.scalars().all()}

    result = []
    for cita in citas:
        d = _cita_a_dict(cita)

        personal = personal_map.get(cita.personal_id)
        u_per = usuarios_map.get(personal.usuario_id) if personal else None
        d["nombre_especialista"] = u_per.nombre_completo if u_per else None

        cs = primer_cs_por_cita.get(cita.id)
        svc = servicios_map.get(cs.servicio_id) if cs else None
        d["nombre_servicio"] = svc.nombre if svc else None

        d["nombre_cliente"] = None

        result.append(d)

    return result


def _cita_a_dict(cita: Cita) -> dict:
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


async def listar_fichas(session: AsyncSession, cliente_id: UUID) -> list[FichaSalud]:
    stmt = select(FichaSalud).where(
        FichaSalud.cliente_id == cliente_id,
        FichaSalud.esta_activo,
    )
    return list((await session.execute(stmt)).scalars().all())


async def agregar_ficha(session: AsyncSession, cliente_id: UUID, body: FichaSaludRequest) -> FichaSalud:
    cliente = await session.get(Cliente, cliente_id)
    if not cliente:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrada")

    ficha = FichaSalud(
        cliente_id=cliente_id,
        tipo_restriccion=body.tipo_restriccion,
        descripcion=body.descripcion,
        severidad=SeveridadFicha(body.severidad),
    )
    session.add(ficha)
    await session.flush()
    return ficha


async def actualizar(session: AsyncSession, cliente_id: UUID, body: ActualizarClienteRequest) -> dict:
    cliente = await session.get(Cliente, cliente_id)
    if not cliente:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrada")

    datos = body.model_dump(exclude_none=True)
    campos_usuario = {c: datos.pop(c) for c in ("nombre_completo", "telefono") if c in datos}

    usuario = await session.get(Usuario, cliente.usuario_id)
    if campos_usuario and usuario:
        for campo, valor in campos_usuario.items():
            setattr(usuario, campo, valor)

    for campo, valor in datos.items():
        setattr(cliente, campo, valor)
    await session.flush()

    return _cliente_a_dict(cliente, usuario)


async def bloquear(session: AsyncSession, cliente_id: UUID, motivo: str) -> Cliente:
    cliente = await session.get(Cliente, cliente_id)
    if not cliente:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrada")

    cliente.esta_bloqueada = True
    cliente.motivo_bloqueo = motivo
    cliente.fecha_bloqueo = ahora_lima()
    await session.flush()
    return cliente


async def desbloquear(session: AsyncSession, cliente_id: UUID) -> Cliente:
    cliente = await session.get(Cliente, cliente_id)
    if not cliente:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrada")

    cliente.esta_bloqueada = False
    cliente.motivo_bloqueo = None
    cliente.fecha_bloqueo = None
    await session.flush()
    return cliente
