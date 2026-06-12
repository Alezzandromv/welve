from uuid import UUID

from fastapi import APIRouter, Depends

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
async def mis_retos(usuario: dict = Depends(obtener_usuario_actual)) -> list:
    return await fidelizacion_service.progreso_retos(UUID(usuario["sub"]))


@router.get("/mis-descuentos", response_model=list[DescuentoResponse])
async def mis_descuentos(
    usuario: dict = Depends(obtener_usuario_actual),
) -> list[DescuentoResponse]:
    descuentos = await fidelizacion_service.descuentos_disponibles(UUID(usuario["sub"]))
    return [DescuentoResponse.model_validate(d.model_dump()) for d in descuentos]


@router.post("/aplicar-descuento", response_model=DescuentoUsoResponse, status_code=201)
async def aplicar_descuento(
    cita_id: UUID,
    body: AplicarDescuentoRequest,
    usuario: dict = Depends(obtener_usuario_actual),
) -> DescuentoUsoResponse:
    uso = await fidelizacion_service.aplicar_descuento(
        codigo=body.codigo,
        cita_id=cita_id,
        usuario_id=UUID(usuario["sub"]),
    )
    return DescuentoUsoResponse.model_validate(uso.model_dump())


# ── Admin ──────────────────────────────────────────────────────────────────────

@router.get("/descuentos", response_model=list[DescuentoResponse])
async def listar_descuentos(usuario: dict = _admin) -> list[DescuentoResponse]:
    descuentos = await fidelizacion_service.listar_descuentos()
    return [DescuentoResponse.model_validate(d.model_dump()) for d in descuentos]


@router.post("/descuentos", response_model=DescuentoResponse, status_code=201)
async def crear_descuento(
    body: CrearDescuentoRequest,
    usuario: dict = _admin,
) -> DescuentoResponse:
    descuento = await fidelizacion_service.crear_descuento(body)
    return DescuentoResponse.model_validate(descuento.model_dump())


@router.get("/retos", response_model=list[RetoResponse])
async def listar_retos(usuario: dict = _admin) -> list[RetoResponse]:
    retos = await fidelizacion_service.listar_retos()
    return [RetoResponse.model_validate(r.model_dump()) for r in retos]


@router.post("/retos", response_model=RetoResponse, status_code=201)
async def crear_reto(
    body: CrearRetoRequest,
    usuario: dict = _admin,
) -> RetoResponse:
    reto = await fidelizacion_service.crear_reto(body)
    return RetoResponse.model_validate(reto.model_dump())
