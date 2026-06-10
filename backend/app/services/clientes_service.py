from uuid import UUID

from fastapi import HTTPException, status

from app.models.cita import Cita
from app.models.cliente import Cliente, FichaSalud
from app.schemas.clientes import FichaSaludRequest
from app.utils.timezone import ahora_lima


async def historial(cliente_id: UUID) -> list[Cita]:
    return await Cita.find(Cita.cliente_id == cliente_id).sort("-programada_en").to_list()


async def agregar_ficha(cliente_id: UUID, body: FichaSaludRequest) -> FichaSalud:
    ficha = FichaSalud(
        cliente_id=cliente_id,
        tipo_restriccion=body.tipo_restriccion,
        descripcion=body.descripcion,
        severidad=body.severidad,
    )
    await ficha.insert()
    return ficha


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
