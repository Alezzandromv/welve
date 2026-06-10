from uuid import UUID

from fastapi import APIRouter, Depends

from app.core.security import obtener_usuario_actual, requerir_rol
from app.schemas.citas import (
    CambiarEstadoRequest,
    CancelarCitaRequest,
    CitaResponse,
    CrearCitaRequest,
)
from app.services import citas_service

router = APIRouter()


@router.post("", response_model=CitaResponse, status_code=201)
async def crear_cita(
    body: CrearCitaRequest,
    usuario: dict = Depends(obtener_usuario_actual),
) -> CitaResponse:
    cita = await citas_service.crear(body, cliente_id=UUID(usuario["sub"]))
    return CitaResponse.model_validate(cita.model_dump())


@router.get("/mis-citas", response_model=list[CitaResponse])
async def mis_citas(usuario: dict = Depends(obtener_usuario_actual)) -> list[CitaResponse]:
    citas = await citas_service.listar_por_cliente(UUID(usuario["sub"]))
    return [CitaResponse.model_validate(c.model_dump()) for c in citas]


@router.patch("/{cita_id}/cancelar", response_model=CitaResponse)
async def cancelar_cita(
    cita_id: UUID,
    body: CancelarCitaRequest,
    usuario: dict = Depends(obtener_usuario_actual),
) -> CitaResponse:
    cita = await citas_service.cancelar(cita_id, UUID(usuario["sub"]), body.motivo_cancelacion)
    return CitaResponse.model_validate(cita.model_dump())


@router.patch("/{cita_id}/estado", response_model=CitaResponse)
async def cambiar_estado(
    cita_id: UUID,
    body: CambiarEstadoRequest,
    usuario: dict = Depends(requerir_rol("admin", "trabajador")),
) -> CitaResponse:
    cita = await citas_service.cambiar_estado(cita_id, body, usuario)
    return CitaResponse.model_validate(cita.model_dump())
