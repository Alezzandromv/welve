from uuid import UUID

from fastapi import APIRouter, Depends

from app.core.security import requerir_rol
from app.schemas.citas import CitaResponse
from app.schemas.pagos import ConfirmarPagoRequest, PagoResponse
from app.services import citas_service, pagos_service

router = APIRouter()

_admin = Depends(requerir_rol("admin"))


@router.get("/citas", response_model=list[CitaResponse])
async def listar_citas(usuario: dict = _admin) -> list[CitaResponse]:
    citas = await citas_service.listar_todas()
    return [CitaResponse.model_validate(c.model_dump()) for c in citas]


@router.get("/pagos/pendientes", response_model=list[PagoResponse])
async def pagos_pendientes(usuario: dict = _admin) -> list[PagoResponse]:
    pagos = await pagos_service.listar_pendientes()
    return [PagoResponse.model_validate(p.model_dump()) for p in pagos]


@router.patch("/pagos/{pago_id}/confirmar", response_model=PagoResponse)
async def confirmar_pago(
    pago_id: UUID,
    body: ConfirmarPagoRequest,
    usuario: dict = _admin,
) -> PagoResponse:
    pago = await pagos_service.confirmar(pago_id, body, admin_id=UUID(usuario["sub"]))
    return PagoResponse.model_validate(pago.model_dump())
