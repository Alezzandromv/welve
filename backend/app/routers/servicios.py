from datetime import date
from uuid import UUID

from fastapi import APIRouter

from app.schemas.servicios import CategoriaResponse, DisponibilidadResponse, ServicioResponse
from app.services import servicios_service

router = APIRouter()


@router.get("", response_model=list[ServicioResponse])
async def listar_servicios(categoria_id: UUID | None = None) -> list[ServicioResponse]:
    servicios = await servicios_service.listar(categoria_id)
    return [ServicioResponse.model_validate(s.model_dump()) for s in servicios]


@router.get("/categorias", response_model=list[CategoriaResponse])
async def listar_categorias() -> list[CategoriaResponse]:
    categorias = await servicios_service.listar_categorias()
    return [CategoriaResponse.model_validate(c.model_dump()) for c in categorias]


@router.get("/{servicio_id}/disponibilidad", response_model=list[DisponibilidadResponse])
async def disponibilidad(servicio_id: UUID, fecha: str) -> list[DisponibilidadResponse]:
    fecha_date = date.fromisoformat(fecha)
    return await servicios_service.calcular_disponibilidad(servicio_id, fecha_date)
