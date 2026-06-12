from datetime import date, time as _Time
from typing import Literal
from uuid import UUID, uuid4

from beanie import Document
from pydantic import Field, field_validator


class Personal(Document):
    id: UUID = Field(default_factory=uuid4)
    usuario_id: UUID
    especialidad: str
    biografia: str | None = None
    color_agenda: str = "#6366f1"
    comision_porcentaje: float = 0.0  # 0–100
    tipo_contrato: Literal["planilla", "honorarios"] = "planilla"
    fecha_ingreso: date | None = None
    esta_activo: bool = True

    class Settings:
        name = "personal"


class DisponibilidadPersonal(Document):
    id: UUID = Field(default_factory=uuid4)
    personal_id: UUID
    dia_semana: int  # 0=domingo … 6=sábado
    hora_inicio: str  # "HH:MM"
    hora_fin: str     # "HH:MM"
    minutos_buffer: int = 10
    esta_activo: bool = True

    @field_validator("hora_inicio", "hora_fin", mode="before")
    @classmethod
    def _normalizar_hora(cls, v: object) -> str:
        if isinstance(v, _Time):
            return f"{v.hour:02d}:{v.minute:02d}"
        if isinstance(v, str):
            partes = v.split(":")
            if len(partes) >= 2:
                return f"{int(partes[0]):02d}:{int(partes[1]):02d}"
        raise ValueError(f"Formato de hora inválido: {v!r}")

    class Settings:
        name = "disponibilidad_personal"
