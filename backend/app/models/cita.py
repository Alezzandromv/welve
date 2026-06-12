from datetime import datetime
from typing import Literal
from uuid import UUID, uuid4

from beanie import Document
from pydantic import Field, field_validator

from app.utils.timezone import a_lima, ahora_lima

EstadoCita = Literal[
    "pendiente",
    "confirmada",
    "en_curso",
    "completada",
    "cancelada",
    "cancelada_tardia",
    "no_show",
]


class Cita(Document):
    id: UUID = Field(default_factory=uuid4)
    cliente_id: UUID
    personal_id: UUID
    programada_en: datetime   # aware Lima
    termina_en: datetime      # aware Lima
    estado: EstadoCita = "pendiente"
    hora_llegada_real: datetime | None = None
    notas_cliente: str | None = None
    notas_especialista: str | None = None
    motivo_cancelacion: str | None = None
    fecha_cancelacion: datetime | None = None
    penalizacion_aplicada: bool = False
    creada_en: datetime = Field(default_factory=ahora_lima)

    @field_validator(
        "programada_en", "termina_en", "hora_llegada_real", "fecha_cancelacion", "creada_en",
        mode="before",
    )
    @classmethod
    def _normalizar_tz(cls, v: object) -> object:
        if isinstance(v, datetime) and v.tzinfo is None:
            return a_lima(v)
        return v

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
