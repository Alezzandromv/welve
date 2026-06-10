from datetime import datetime
from uuid import UUID, uuid4

from beanie import Document
from pydantic import Field


class Cita(Document):
    id: UUID = Field(default_factory=uuid4)
    cliente_id: UUID
    personal_id: UUID
    programada_en: datetime  # aware Lima
    termina_en: datetime  # aware Lima
    estado: str = "pendiente"
    # estados: pendiente | confirmada | en_curso | completada | cancelada | cancelada_tardia | no_show
    hora_llegada_real: datetime | None = None
    notas_cliente: str | None = None
    notas_especialista: str | None = None
    motivo_cancelacion: str | None = None
    fecha_cancelacion: datetime | None = None
    penalizacion_aplicada: bool = False

    class Settings:
        name = "citas"


class CitaServicio(Document):
    id: UUID = Field(default_factory=uuid4)
    cita_id: UUID
    servicio_id: UUID
    precio_unitario: float
    duracion_minutos: int

    class Settings:
        name = "cita_servicios"
