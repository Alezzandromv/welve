from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security import requerir_rol
from app.schemas.citas import CitaResponse
from app.schemas.clientes import (
    ActualizarClienteRequest,
    BloquearClienteRequest,
    ClienteResponse,
    FichaSaludRequest,
    FichaSaludResponse,
)
from app.services import clientes_service

router = APIRouter()

_admin = Depends(requerir_rol("admin"))


@router.get("", response_model=list[ClienteResponse])
async def listar_clientes(usuario: dict = _admin, session: AsyncSession = Depends(get_session)) -> list[ClienteResponse]:
    clientes = await clientes_service.listar_todos_con_usuario(session)
    return [ClienteResponse.model_validate(c) for c in clientes]


@router.get("/{cliente_id}", response_model=ClienteResponse)
async def obtener_cliente(cliente_id: UUID, usuario: dict = _admin, session: AsyncSession = Depends(get_session)) -> ClienteResponse:
    cliente = await clientes_service.obtener_por_id(session, cliente_id)
    return ClienteResponse.model_validate(cliente)


@router.patch("/{cliente_id}", response_model=ClienteResponse)
async def actualizar_cliente(
    cliente_id: UUID,
    body: ActualizarClienteRequest,
    usuario: dict = _admin,
    session: AsyncSession = Depends(get_session),
) -> ClienteResponse:
    data = await clientes_service.actualizar(session, cliente_id, body)
    return ClienteResponse.model_validate(data)


@router.get("/{cliente_id}/historial", response_model=list[CitaResponse])
async def historial(cliente_id: UUID, usuario: dict = _admin, session: AsyncSession = Depends(get_session)) -> list[CitaResponse]:
    citas = await clientes_service.historial(session, cliente_id)
    return [CitaResponse.model_validate(c) for c in citas]


@router.get("/{cliente_id}/fichas-salud", response_model=list[FichaSaludResponse])
async def listar_fichas(cliente_id: UUID, usuario: dict = _admin, session: AsyncSession = Depends(get_session)) -> list[FichaSaludResponse]:
    fichas = await clientes_service.listar_fichas(session, cliente_id)
    return [FichaSaludResponse.model_validate(f) for f in fichas]


@router.post("/{cliente_id}/fichas-salud", response_model=FichaSaludResponse, status_code=201)
async def agregar_ficha(
    cliente_id: UUID,
    body: FichaSaludRequest,
    usuario: dict = _admin,
    session: AsyncSession = Depends(get_session),
) -> FichaSaludResponse:
    ficha = await clientes_service.agregar_ficha(session, cliente_id, body)
    return FichaSaludResponse.model_validate(ficha)


@router.patch("/{cliente_id}/bloquear")
async def bloquear_cliente(
    cliente_id: UUID,
    body: BloquearClienteRequest,
    usuario: dict = _admin,
    session: AsyncSession = Depends(get_session),
) -> dict:
    await clientes_service.bloquear(session, cliente_id, body.motivo_bloqueo)
    return {"detail": "Cliente bloqueada"}


@router.patch("/{cliente_id}/desbloquear")
async def desbloquear_cliente(
    cliente_id: UUID,
    usuario: dict = _admin,
    session: AsyncSession = Depends(get_session),
) -> dict:
    await clientes_service.desbloquear(session, cliente_id)
    return {"detail": "Cliente desbloqueada"}
