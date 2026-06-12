from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends

from app.core.security import requerir_rol
from app.schemas.servicios import (
    ActualizarCategoriaRequest,
    ActualizarServicioRequest,
    CategoriaResponse,
    CrearCategoriaRequest,
    CrearServicioRequest,
    DisponibilidadResponse,
    ServicioResponse,
)
from app.services import servicios_service

router = APIRouter()

_admin = Depends(requerir_rol("admin"))


# ── Público ────────────────────────────────────────────────────────────────────

@router.get("", response_model=list[ServicioResponse])
async def listar_servicios(
    categoria_id: UUID | None = None,
    incluir_inactivos: bool = False,
) -> list[ServicioResponse]:
    servicios = await servicios_service.listar(categoria_id, incluir_inactivos)
    return [ServicioResponse.model_validate(s.model_dump()) for s in servicios]


@router.get("/categorias", response_model=list[CategoriaResponse])
async def listar_categorias() -> list[CategoriaResponse]:
    categorias = await servicios_service.listar_categorias()
    return [CategoriaResponse.model_validate(c.model_dump()) for c in categorias]


@router.get("/{servicio_id}/disponibilidad", response_model=list[DisponibilidadResponse])
async def disponibilidad(servicio_id: UUID, fecha: date) -> list[DisponibilidadResponse]:
    return await servicios_service.calcular_disponibilidad(servicio_id, fecha)


# ── Admin ──────────────────────────────────────────────────────────────────────

@router.patch("/categorias/{categoria_id}", response_model=CategoriaResponse)
async def actualizar_categoria(
    categoria_id: UUID,
    body: ActualizarCategoriaRequest,
    usuario: dict = _admin,
) -> CategoriaResponse:
    categoria = await servicios_service.actualizar_categoria(categoria_id, body)
    return CategoriaResponse.model_validate(categoria.model_dump())


@router.post("/categorias", response_model=CategoriaResponse, status_code=201)
async def crear_categoria(
    body: CrearCategoriaRequest,
    usuario: dict = _admin,
) -> CategoriaResponse:
    categoria = await servicios_service.crear_categoria(body)
    return CategoriaResponse.model_validate(categoria.model_dump())


@router.post("", response_model=ServicioResponse, status_code=201)
async def crear_servicio(
    body: CrearServicioRequest,
    usuario: dict = _admin,
) -> ServicioResponse:
    servicio = await servicios_service.crear_servicio(body)
    return ServicioResponse.model_validate(servicio.model_dump())


@router.patch("/{servicio_id}", response_model=ServicioResponse)
async def actualizar_servicio(
    servicio_id: UUID,
    body: ActualizarServicioRequest,
    usuario: dict = _admin,
) -> ServicioResponse:
    servicio = await servicios_service.actualizar_servicio(servicio_id, body)
    return ServicioResponse.model_validate(servicio.model_dump())
