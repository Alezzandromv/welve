from uuid import UUID
from beanie.operators import In

from fastapi import HTTPException, status

from app.models.cita import Cita, CitaServicio
from app.models.cliente import Cliente, FichaSalud
from app.models.usuario import Usuario
from app.schemas.clientes import ActualizarClienteRequest, FichaSaludRequest
from app.utils.timezone import ahora_lima
import asyncio

from app.models.personal import Personal
from app.models.servicio import Servicio

async def listar_todos() -> list[Cliente]:
    return await Cliente.find_all().to_list()


async def listar_todos_con_usuario() -> list[dict]:
    todos = await Cliente.find_all().to_list()
    if not todos:
        return []

    usuario_ids = [c.usuario_id for c in todos]
    usuarios = await Usuario.find(In(Usuario.id, usuario_ids)).to_list()
    usuarios_map = {u.id: u for u in usuarios}

    result = []
    for c in todos:
        u = usuarios_map.get(c.usuario_id)
        d = c.model_dump()
        d["nombre_completo"] = u.nombre_completo if u else None
        d["correo"] = u.correo if u else None
        d["telefono"] = u.telefono if u else None
        result.append(d)
    return result


async def obtener_por_id(cliente_id: UUID) -> Cliente:
    cliente = await Cliente.get(cliente_id)
    if not cliente:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrada")
    return cliente


async def obtener_con_usuario(cliente_id: UUID) -> dict:
    cliente = await obtener_por_id(cliente_id)
    usuario = await Usuario.get(cliente.usuario_id)
    return {"cliente": cliente, "usuario": usuario}


async def historial(cliente_id: UUID) -> list[dict]:
    citas = await Cita.find(Cita.cliente_id == cliente_id).sort("-programada_en").to_list()
    if not citas:
        return []

    cita_ids = [c.id for c in citas]
    personal_ids = list({c.personal_id for c in citas})

    personal_res, cs_res = await asyncio.gather(
        Personal.find(In(Personal.id, personal_ids)).to_list(),
        CitaServicio.find(In(CitaServicio.cita_id, cita_ids)).to_list(),
    )

    personal_map = {p.id: p for p in personal_res}
    usuario_ids = list({p.usuario_id for p in personal_map.values()})

    # cs_res puede tener varios CitaServicio por cita; nos quedamos con el primero por cita
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

        personal = personal_map.get(cita.personal_id)
        u_per = usuarios_map.get(personal.usuario_id) if personal else None
        d["nombre_especialista"] = u_per.nombre_completo if u_per else None

        cs = primer_cs_por_cita.get(cita.id)
        svc = servicios_map.get(cs.servicio_id) if cs else None
        d["nombre_servicio"] = svc.nombre if svc else None

        d["nombre_cliente"] = None

        result.append(d)

    return result

async def listar_fichas(cliente_id: UUID) -> list[FichaSalud]:
    return await FichaSalud.find(
        FichaSalud.cliente_id == cliente_id,
        FichaSalud.esta_activo == True,
    ).to_list()


async def agregar_ficha(cliente_id: UUID, body: FichaSaludRequest) -> FichaSalud:
    cliente = await Cliente.get(cliente_id)
    if not cliente:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrada")

    ficha = FichaSalud(
        cliente_id=cliente_id,
        tipo_restriccion=body.tipo_restriccion,
        descripcion=body.descripcion,
        severidad=body.severidad,
    )
    await ficha.insert()
    return ficha


async def actualizar(cliente_id: UUID, body: ActualizarClienteRequest) -> dict:
    cliente = await Cliente.get(cliente_id)
    if not cliente:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrada")

    datos = body.model_dump(exclude_none=True)
    campos_usuario = {c: datos.pop(c) for c in ("nombre_completo", "telefono") if c in datos}

    usuario = await Usuario.get(cliente.usuario_id)
    if campos_usuario and usuario:
        for campo, valor in campos_usuario.items():
            setattr(usuario, campo, valor)
        await usuario.save()

    for campo, valor in datos.items():
        setattr(cliente, campo, valor)
    await cliente.save()

    d = cliente.model_dump()
    d["nombre_completo"] = usuario.nombre_completo if usuario else None
    d["correo"] = usuario.correo if usuario else None
    d["telefono"] = usuario.telefono if usuario else None
    return d


async def bloquear(cliente_id: UUID, motivo: str) -> Cliente:
    cliente = await Cliente.get(cliente_id)
    if not cliente:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrada")

    cliente.esta_bloqueada = True
    cliente.motivo_bloqueo = motivo
    cliente.fecha_bloqueo = ahora_lima()
    await cliente.save()
    return cliente


async def desbloquear(cliente_id: UUID) -> Cliente:
    cliente = await Cliente.get(cliente_id)
    if not cliente:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrada")

    cliente.esta_bloqueada = False
    cliente.motivo_bloqueo = None
    cliente.fecha_bloqueo = None
    await cliente.save()
    return cliente
