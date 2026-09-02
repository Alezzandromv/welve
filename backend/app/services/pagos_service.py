from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cita import Cita
from app.models.enums import EstadoCita, EstadoPago
from app.models.pago import Pago
from app.schemas.pagos import ConfirmarPagoRequest, CrearPagoRequest
from app.utils.timezone import ahora_lima


async def crear(session: AsyncSession, body: CrearPagoRequest, admin_id: UUID) -> Pago:
    cita = await session.get(Cita, body.cita_id)
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
    session.add(pago)
    await session.flush()
    return pago


async def listar_pendientes(session: AsyncSession) -> list[Pago]:
    stmt = select(Pago).where(Pago.estado == "pendiente")
    return list((await session.execute(stmt)).scalars().all())


async def listar_por_cita(session: AsyncSession, cita_id: UUID) -> list[Pago]:
    stmt = select(Pago).where(Pago.cita_id == cita_id)
    return list((await session.execute(stmt)).scalars().all())


async def confirmar(session: AsyncSession, pago_id: UUID, body: ConfirmarPagoRequest, admin_id: UUID) -> Pago:
    pago = await session.get(Pago, pago_id)
    if not pago:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pago no encontrado")

    if pago.estado != "pendiente":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Solo se pueden confirmar pagos en estado pendiente",
        )

    ahora = ahora_lima()
    pago.estado = EstadoPago.confirmado
    pago.confirmado_por = admin_id
    pago.fecha_confirmacion = ahora
    if body.referencia_externa:
        pago.referencia_externa = body.referencia_externa
    if body.nota_admin:
        pago.nota_admin = body.nota_admin
    await session.flush()

    # Confirmar depósito → cita pasa a 'confirmada' (misma sesión de request: atómico).
    if pago.tipo == "deposito":
        cita = await session.get(Cita, pago.cita_id)
        if cita and cita.estado == "pendiente":
            cita.estado = EstadoCita.confirmada
            await session.flush()

    return pago


async def rechazar(session: AsyncSession, pago_id: UUID, admin_id: UUID, nota: str | None = None) -> Pago:
    pago = await session.get(Pago, pago_id)
    if not pago:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pago no encontrado")

    if pago.estado != "pendiente":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Solo se pueden rechazar pagos en estado pendiente",
        )

    pago.estado = EstadoPago.rechazado
    pago.confirmado_por = admin_id
    pago.fecha_confirmacion = ahora_lima()
    if nota:
        pago.nota_admin = nota
    await session.flush()
    return pago


async def reembolsar(session: AsyncSession, pago_id: UUID, admin_id: UUID, nota: str | None = None) -> Pago:
    pago = await session.get(Pago, pago_id)
    if not pago:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pago no encontrado")

    if pago.estado != "confirmado":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Solo se pueden reembolsar pagos confirmados",
        )

    pago.estado = EstadoPago.reembolsado
    pago.confirmado_por = admin_id
    pago.fecha_confirmacion = ahora_lima()
    if nota:
        pago.nota_admin = nota
    await session.flush()
    return pago
