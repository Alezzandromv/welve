from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends

from app.core.security import requerir_rol
from app.schemas.citas import CitaResponse, CrearCitaAdminRequest
from app.schemas.pagos import ConfirmarPagoRequest, CrearPagoRequest, PagoResponse
from app.schemas.personal import (
    ActualizarPersonalRequest,
    CrearDisponibilidadRequest,
    CrearPersonalRequest,
    DisponibilidadPersonalResponse,
    PersonalResponse,
)
from app.services import citas_service, pagos_service, personal_service

router = APIRouter()

_admin = Depends(requerir_rol("admin"))


# ── Citas ──────────────────────────────────────────────────────────────────────

@router.get("/citas", response_model=list[CitaResponse])
async def listar_citas(
    fecha: date | None = None,
    estado: str | None = None,
    usuario: dict = _admin,
) -> list[CitaResponse]:
    citas_data = await citas_service.listar_todas_con_nombres(fecha, estado)
    return [CitaResponse.model_validate(d) for d in citas_data]


@router.post("/citas", response_model=CitaResponse, status_code=201)
async def crear_cita_admin(body: CrearCitaAdminRequest, usuario: dict = _admin) -> CitaResponse:
    cita = await citas_service.crear_para_admin(body)
    return CitaResponse.model_validate(cita.model_dump())


@router.get("/citas/{cita_id}/pagos", response_model=list[PagoResponse])
async def pagos_por_cita(cita_id: UUID, usuario: dict = _admin) -> list[PagoResponse]:
    pagos = await pagos_service.listar_por_cita(cita_id)
    return [PagoResponse.model_validate(p.model_dump()) for p in pagos]


# ── Pagos ──────────────────────────────────────────────────────────────────────

@router.post("/pagos", response_model=PagoResponse, status_code=201)
async def crear_pago(body: CrearPagoRequest, usuario: dict = _admin) -> PagoResponse:
    pago = await pagos_service.crear(body, UUID(usuario["sub"]))
    return PagoResponse.model_validate(pago.model_dump())


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
    pago = await pagos_service.confirmar(pago_id, body, UUID(usuario["sub"]))
    return PagoResponse.model_validate(pago.model_dump())


@router.patch("/pagos/{pago_id}/rechazar", response_model=PagoResponse)
async def rechazar_pago(
    pago_id: UUID,
    body: ConfirmarPagoRequest,
    usuario: dict = _admin,
) -> PagoResponse:
    pago = await pagos_service.rechazar(pago_id, UUID(usuario["sub"]), body.nota_admin)
    return PagoResponse.model_validate(pago.model_dump())


@router.patch("/pagos/{pago_id}/reembolsar", response_model=PagoResponse)
async def reembolsar_pago(
    pago_id: UUID,
    body: ConfirmarPagoRequest,
    usuario: dict = _admin,
) -> PagoResponse:
    pago = await pagos_service.reembolsar(pago_id, UUID(usuario["sub"]), body.nota_admin)
    return PagoResponse.model_validate(pago.model_dump())


# ── Personal ───────────────────────────────────────────────────────────────────

@router.get("/personal", response_model=list[PersonalResponse])
async def listar_personal(usuario: dict = _admin) -> list[PersonalResponse]:
    personal = await personal_service.listar_todos_con_usuario()
    return [PersonalResponse.model_validate(p) for p in personal]


@router.post("/personal", response_model=PersonalResponse, status_code=201)
async def crear_personal(body: CrearPersonalRequest, usuario: dict = _admin) -> PersonalResponse:
    personal = await personal_service.crear(body)
    return PersonalResponse.model_validate(personal.model_dump())


@router.patch("/personal/{personal_id}", response_model=PersonalResponse)
async def actualizar_personal(
    personal_id: UUID,
    body: ActualizarPersonalRequest,
    usuario: dict = _admin,
) -> PersonalResponse:
    data = await personal_service.actualizar(personal_id, body)
    return PersonalResponse.model_validate(data)


@router.get("/personal/{personal_id}/disponibilidad", response_model=list[DisponibilidadPersonalResponse])
async def listar_disponibilidad(
    personal_id: UUID,
    usuario: dict = _admin,
) -> list[DisponibilidadPersonalResponse]:
    disps = await personal_service.listar_disponibilidades(personal_id)
    return [DisponibilidadPersonalResponse.model_validate(d.model_dump()) for d in disps]


@router.post(
    "/personal/{personal_id}/disponibilidad",
    response_model=DisponibilidadPersonalResponse,
    status_code=201,
)
async def agregar_disponibilidad(
    personal_id: UUID,
    body: CrearDisponibilidadRequest,
    usuario: dict = _admin,
) -> DisponibilidadPersonalResponse:
    body.personal_id = personal_id  # el path manda sobre el body
    disp = await personal_service.agregar_disponibilidad(body)
    return DisponibilidadPersonalResponse.model_validate(disp.model_dump())


@router.delete("/personal/{personal_id}/disponibilidad/{disp_id}", status_code=204)
async def eliminar_disponibilidad(
    personal_id: UUID,
    disp_id: UUID,
    usuario: dict = _admin,
) -> None:
    await personal_service.eliminar_disponibilidad(disp_id)
