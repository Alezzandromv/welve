from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class CrearCitaRequest(BaseModel):
    personal_id: UUID
    servicio_ids: list[UUID]
    programada_en: datetime
    notas_cliente: str | None = None


class CancelarCitaRequest(BaseModel):
    motivo_cancelacion: str | None = None


class CambiarEstadoRequest(BaseModel):
    estado: str
    notas_especialista: str | None = None


class CitaResponse(BaseModel):
    id: UUID
    cliente_id: UUID
    personal_id: UUID
    programada_en: datetime
    termina_en: datetime
    estado: str
    notas_cliente: str | None
    notas_especialista: str | None
    penalizacion_aplicada: bool
