from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security import obtener_usuario_actual, requerir_rol
from app.schemas.citas import (
    CambiarEstadoRequest,
    CancelarCitaRequest,
    CitaResponse,
    CitaServicioResponse,
    CrearCitaRequest,
    RegistrarLlegadaRequest,
)
from app.services import citas_service

router = APIRouter()

# Singleton a nivel de módulo — llamar `requerir_rol(...)` directo en un default de argumento
# lo re-evalúa (y re-crea la dependency function) en cada import, en vez de una sola vez.
_staff = Depends(requerir_rol("admin", "trabajador"))


@router.post("", response_model=CitaResponse, status_code=201)
async def crear_cita(
    body: CrearCitaRequest,
    usuario: dict = Depends(obtener_usuario_actual),
    session: AsyncSession = Depends(get_session),
) -> CitaResponse:
    cita = await citas_service.crear(session, body, UUID(usuario["sub"]))
    return CitaResponse.model_validate(await citas_service.enriquecer_cita(session, cita))


@router.get("/mis-citas", response_model=list[CitaResponse])
async def mis_citas(
    usuario: dict = Depends(obtener_usuario_actual),
    session: AsyncSession = Depends(get_session),
) -> list[CitaResponse]:
    citas = await citas_service.listar_por_cliente(session, UUID(usuario["sub"]))
    return [CitaResponse.model_validate(c) for c in citas]


@router.patch("/{cita_id}/cancelar", response_model=CitaResponse)
async def cancelar_cita(
    cita_id: UUID,
    body: CancelarCitaRequest,
    usuario: dict = Depends(obtener_usuario_actual),
    session: AsyncSession = Depends(get_session),
) -> CitaResponse:
    cita = await citas_service.cancelar(session, cita_id, UUID(usuario["sub"]), body.motivo_cancelacion)
    return CitaResponse.model_validate(await citas_service.enriquecer_cita(session, cita))


@router.patch("/{cita_id}/estado", response_model=CitaResponse)
async def cambiar_estado(
    cita_id: UUID,
    body: CambiarEstadoRequest,
    usuario: dict = _staff,
    session: AsyncSession = Depends(get_session),
) -> CitaResponse:
    cita = await citas_service.cambiar_estado(session, cita_id, body, usuario)
    return CitaResponse.model_validate(await citas_service.enriquecer_cita(session, cita))


@router.patch("/{cita_id}/llegada", response_model=CitaResponse)
async def registrar_llegada(
    cita_id: UUID,
    body: RegistrarLlegadaRequest,
    usuario: dict = _staff,
    session: AsyncSession = Depends(get_session),
) -> CitaResponse:
    cita = await citas_service.registrar_llegada(session, cita_id, body.hora_llegada_real, usuario)
    return CitaResponse.model_validate(await citas_service.enriquecer_cita(session, cita))


@router.get("/{cita_id}/servicios", response_model=list[CitaServicioResponse])
async def servicios_de_cita(
    cita_id: UUID,
    usuario: dict = _staff,
    session: AsyncSession = Depends(get_session),
) -> list[CitaServicioResponse]:
    servicios = await citas_service.servicios_de_cita(session, cita_id)
    return [CitaServicioResponse.model_validate(s) for s in servicios]
