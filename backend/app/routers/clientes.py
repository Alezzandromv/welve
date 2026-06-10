from uuid import UUID

from fastapi import APIRouter, Depends

from app.core.security import requerir_rol
from app.schemas.citas import CitaResponse
from app.schemas.clientes import (
    BloquearClienteRequest,
    FichaSaludRequest,
    FichaSaludResponse,
)
from app.services import clientes_service

router = APIRouter()

_admin = Depends(requerir_rol("admin"))


@router.get("/{cliente_id}/historial", response_model=list[CitaResponse])
async def historial(cliente_id: UUID, usuario: dict = _admin) -> list[CitaResponse]:
    citas = await clientes_service.historial(cliente_id)
    return [CitaResponse.model_validate(c.model_dump()) for c in citas]


@router.post("/{cliente_id}/fichas-salud", response_model=FichaSaludResponse, status_code=201)
async def agregar_ficha(
    cliente_id: UUID,
    body: FichaSaludRequest,
    usuario: dict = _admin,
) -> FichaSaludResponse:
    ficha = await clientes_service.agregar_ficha(cliente_id, body)
    return FichaSaludResponse.model_validate(ficha.model_dump())


@router.patch("/{cliente_id}/bloquear")
async def bloquear_cliente(
    cliente_id: UUID,
    body: BloquearClienteRequest,
    usuario: dict = _admin,
) -> dict:
    await clientes_service.bloquear(cliente_id, body.motivo_bloqueo)
    return {"detail": "Cliente bloqueada"}


@router.patch("/{cliente_id}/desbloquear")
async def desbloquear_cliente(
    cliente_id: UUID,
    usuario: dict = _admin,
) -> dict:
    await clientes_service.desbloquear(cliente_id)
    return {"detail": "Cliente desbloqueada"}
