from uuid import UUID

from fastapi import HTTPException, status

from app.models.cita import Cita
from app.models.pago import Pago
from app.schemas.pagos import ConfirmarPagoRequest
from app.utils.timezone import ahora_lima


async def listar_pendientes() -> list[Pago]:
    return await Pago.find(Pago.estado == "pendiente").sort("-id").to_list()


async def confirmar(pago_id: UUID, body: ConfirmarPagoRequest, admin_id: UUID) -> Pago:
    pago = await Pago.get(pago_id)
    if not pago:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pago no encontrado")

    if pago.estado != "pendiente":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="El pago ya fue procesado",
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

    # Si es depósito → la cita pasa a 'confirmada'
    if pago.tipo == "deposito":
        cita = await Cita.get(pago.cita_id)
        if cita and cita.estado == "pendiente":
            cita.estado = "confirmada"
            await cita.save()

    return pago
