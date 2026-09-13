from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.enums import EstadoCita


class CrearCitaRequest(BaseModel):
    personal_id: UUID
    servicio_ids: list[UUID]
    programada_en: datetime
    notas_cliente: str | None = None


class CrearCitaAdminRequest(BaseModel):
    cliente_id: UUID
    personal_id: UUID
    servicio_ids: list[UUID]
    programada_en: datetime
    notas_cliente: str | None = None
    # Backfill administrativo (ej. registrar una cita walk-in ya ocurrida) — sin este flag
    # explícito, crear_para_admin exige fecha futura igual que la reserva de cliente.
    permitir_fecha_pasada: bool = False


class CancelarCitaRequest(BaseModel):
    motivo_cancelacion: str | None = None


class CambiarEstadoCitaRequest(BaseModel):
    estado: EstadoCita
    notas_especialista: str | None = None
    confirmar_ficha_critica: bool = False  # RN09: True cuando el especialista ya fue alertado


class RegistrarLlegadaRequest(BaseModel):
    hora_llegada_real: datetime


class CitaServicioResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    servicio_id: UUID
    precio_unitario: float
    duracion_minutos: int


class CitaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    cliente_id: UUID
    personal_id: UUID
    programada_en: datetime
    termina_en: datetime
    estado: str
    hora_llegada_real: datetime | None
    notas_cliente: str | None
    notas_especialista: str | None
    motivo_cancelacion: str | None
    fecha_cancelacion: datetime | None
    penalizacion_aplicada: bool
    creada_en: datetime
    # Campos enriquecidos para vistas de administración
    nombre_cliente: str | None = None
    nombre_especialista: str | None = None
    nombre_servicio: str | None = None
