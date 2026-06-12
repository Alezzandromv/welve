from uuid import UUID

from fastapi import HTTPException, status

from app.models.cita import Cita
from app.models.pago import Pago
from app.schemas.pagos import ConfirmarPagoRequest, CrearPagoRequest
from app.utils.timezone import ahora_lima


async def crear(body: CrearPagoRequest, admin_id: UUID) -> Pago:
    cita = await Cita.get(body.cita_id)
    if not cita:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cita no encontrada")

    pago = Pago(
        cita_id=cita.id,
        cliente_id=cita.cliente_id,
        tipo=body.tipo,
        metodo=body.metodo,
        monto=body.monto,
        referencia_externa=body.referencia_externa,
    )
    await pago.insert()
    return pago


async def listar_pendientes() -> list[Pago]:
    return await Pago.find(Pago.estado == "pendiente").to_list()


async def listar_por_cita(cita_id: UUID) -> list[Pago]:
    return await Pago.find(Pago.cita_id == cita_id).to_list()


async def confirmar(pago_id: UUID, body: ConfirmarPagoRequest, admin_id: UUID) -> Pago:
    pago = await Pago.get(pago_id)
    if not pago:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pago no encontrado")

    if pago.estado != "pendiente":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Solo se pueden confirmar pagos en estado pendiente",
        )

    ahora = ahora_lima()
    pago.estado = "confirmado"
    pago.confirmado_por = admin_id
    pago.fecha_confirmacion = ahora
    if body.referencia_externa:
        pago.referencia_externa = body.referencia_externa
    if body.nota_admin:
        pago.nota_admin = body.nota_admin
    await pago.save()

    # Confirmar depósito → cita pasa a 'confirmada'
    if pago.tipo == "deposito":
        cita = await Cita.get(pago.cita_id)
        if cita and cita.estado == "pendiente":
            cita.estado = "confirmada"
            await cita.save()

    return pago


async def rechazar(pago_id: UUID, admin_id: UUID, nota: str | None = None) -> Pago:
    pago = await Pago.get(pago_id)
    if not pago:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pago no encontrado")

    if pago.estado != "pendiente":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Solo se pueden rechazar pagos en estado pendiente",
        )

    pago.estado = "rechazado"
    pago.confirmado_por = admin_id
    pago.fecha_confirmacion = ahora_lima()
    if nota:
        pago.nota_admin = nota
    await pago.save()
    return pago


async def reembolsar(pago_id: UUID, admin_id: UUID, nota: str | None = None) -> Pago:
    pago = await Pago.get(pago_id)
    if not pago:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pago no encontrado")

    if pago.estado != "confirmado":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Solo se pueden reembolsar pagos confirmados",
        )

    pago.estado = "reembolsado"
    pago.confirmado_por = admin_id
    pago.fecha_confirmacion = ahora_lima()
    if nota:
        pago.nota_admin = nota
    await pago.save()
    return pago
