from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security import requerir_rol
from app.schemas.citas import CitaResponse
from app.services import citas_service

router = APIRouter()

_trabajador = Depends(requerir_rol("trabajador", "admin"))


@router.get("/agenda", response_model=list[CitaResponse])
async def agenda(
    fecha: date | None = None,
    usuario: dict = _trabajador,
    session: AsyncSession = Depends(get_session),
) -> list[CitaResponse]:
    citas = await citas_service.agenda_trabajador(session, UUID(usuario["sub"]), fecha)
    return [CitaResponse.model_validate(c) for c in citas]
