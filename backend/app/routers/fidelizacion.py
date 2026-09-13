from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security import obtener_usuario_actual, requerir_rol
from app.schemas.fidelizacion import (
    AplicarDescuentoRequest,
    CrearDescuentoRequest,
    CrearRetoRequest,
    DescuentoResponse,
    DescuentoUsoResponse,
    RetoResponse,
)
from app.services import fidelizacion_service

router = APIRouter()

_admin = Depends(requerir_rol("admin"))


# ── Cliente ────────────────────────────────────────────────────────────────────

@router.get("/mis-retos")
async def mis_retos(usuario: dict = Depends(obtener_usuario_actual), session: AsyncSession = Depends(get_session)) -> list:
    return await fidelizacion_service.progreso_retos(session, UUID(usuario["sub"]))


@router.get("/mis-descuentos", response_model=list[DescuentoResponse])
async def mis_descuentos(
    usuario: dict = Depends(obtener_usuario_actual),
    session: AsyncSession = Depends(get_session),
) -> list[DescuentoResponse]:
    descuentos = await fidelizacion_service.descuentos_disponibles(session, UUID(usuario["sub"]))
    return [DescuentoResponse.model_validate(d) for d in descuentos]


@router.post("/aplicar-descuento", response_model=DescuentoUsoResponse, status_code=201)
async def aplicar_descuento(
    cita_id: UUID,
    body: AplicarDescuentoRequest,
    usuario: dict = Depends(obtener_usuario_actual),
    session: AsyncSession = Depends(get_session),
) -> DescuentoUsoResponse:
    uso = await fidelizacion_service.aplicar_descuento(
        session,
        codigo=body.codigo,
        cita_id=cita_id,
        usuario_id=UUID(usuario["sub"]),
    )
    return DescuentoUsoResponse.model_validate(uso)


# ── Admin ──────────────────────────────────────────────────────────────────────

@router.get("/descuentos", response_model=list[DescuentoResponse])
async def listar_descuentos(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    usuario: dict = _admin,
    session: AsyncSession = Depends(get_session),
) -> list[DescuentoResponse]:
    descuentos = await fidelizacion_service.listar_descuentos(session, limit, offset)
    return [DescuentoResponse.model_validate(d) for d in descuentos]


@router.post("/descuentos", response_model=DescuentoResponse, status_code=201)
async def crear_descuento(
    body: CrearDescuentoRequest,
    usuario: dict = _admin,
    session: AsyncSession = Depends(get_session),
) -> DescuentoResponse:
    descuento = await fidelizacion_service.crear_descuento(session, body)
    return DescuentoResponse.model_validate(descuento)


@router.get("/retos", response_model=list[RetoResponse])
async def listar_retos(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    usuario: dict = _admin,
    session: AsyncSession = Depends(get_session),
) -> list[RetoResponse]:
    retos = await fidelizacion_service.listar_retos(session, limit, offset)
    return [RetoResponse.model_validate(r) for r in retos]


@router.post("/retos", response_model=RetoResponse, status_code=201)
async def crear_reto(
    body: CrearRetoRequest,
    usuario: dict = _admin,
    session: AsyncSession = Depends(get_session),
) -> RetoResponse:
    reto = await fidelizacion_service.crear_reto(session, body)
    return RetoResponse.model_validate(reto)
