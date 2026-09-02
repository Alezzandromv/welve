from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
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
    session: AsyncSession = Depends(get_session),
) -> list[ServicioResponse]:
    servicios = await servicios_service.listar(session, categoria_id, incluir_inactivos)
    return [ServicioResponse.model_validate(s) for s in servicios]


@router.get("/categorias", response_model=list[CategoriaResponse])
async def listar_categorias(session: AsyncSession = Depends(get_session)) -> list[CategoriaResponse]:
    categorias = await servicios_service.listar_categorias(session)
    return [CategoriaResponse.model_validate(c) for c in categorias]


@router.get("/{servicio_id}/disponibilidad", response_model=list[DisponibilidadResponse])
async def disponibilidad(servicio_id: UUID, fecha: date, session: AsyncSession = Depends(get_session)) -> list[DisponibilidadResponse]:
    return await servicios_service.calcular_disponibilidad(session, servicio_id, fecha)


# ── Admin ──────────────────────────────────────────────────────────────────────

@router.patch("/categorias/{categoria_id}", response_model=CategoriaResponse)
async def actualizar_categoria(
    categoria_id: UUID,
    body: ActualizarCategoriaRequest,
    usuario: dict = _admin,
    session: AsyncSession = Depends(get_session),
) -> CategoriaResponse:
    categoria = await servicios_service.actualizar_categoria(session, categoria_id, body)
    return CategoriaResponse.model_validate(categoria)


@router.post("/categorias", response_model=CategoriaResponse, status_code=201)
async def crear_categoria(
    body: CrearCategoriaRequest,
    usuario: dict = _admin,
    session: AsyncSession = Depends(get_session),
) -> CategoriaResponse:
    categoria = await servicios_service.crear_categoria(session, body)
    return CategoriaResponse.model_validate(categoria)


@router.post("", response_model=ServicioResponse, status_code=201)
async def crear_servicio(
    body: CrearServicioRequest,
    usuario: dict = _admin,
    session: AsyncSession = Depends(get_session),
) -> ServicioResponse:
    servicio = await servicios_service.crear_servicio(session, body)
    return ServicioResponse.model_validate(servicio)


@router.patch("/{servicio_id}", response_model=ServicioResponse)
async def actualizar_servicio(
    servicio_id: UUID,
    body: ActualizarServicioRequest,
    usuario: dict = _admin,
    session: AsyncSession = Depends(get_session),
) -> ServicioResponse:
    servicio = await servicios_service.actualizar_servicio(session, servicio_id, body)
    return ServicioResponse.model_validate(servicio)
