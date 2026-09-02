from datetime import date
from datetime import time as _Time
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class CrearPersonalRequest(BaseModel):
    usuario_id: UUID
    especialidad: str
    biografia: str | None = None
    color_agenda: str = "#6366f1"
    comision_porcentaje: float = Field(default=0.0, ge=0, le=100)
    tipo_contrato: str = "planilla"
    fecha_ingreso: date | None = None


class ActualizarPersonalRequest(BaseModel):
    especialidad: str | None = None
    biografia: str | None = None
    color_agenda: str | None = None
    comision_porcentaje: float | None = Field(default=None, ge=0, le=100)
    tipo_contrato: str | None = None
    esta_activo: bool | None = None
    nombre_completo: str | None = None
    telefono: str | None = None

    @model_validator(mode="before")
    @classmethod
    def rechazar_credenciales(cls, v: object) -> object:
        if isinstance(v, dict) and ("correo" in v or "password" in v or "contrasena" in v):
            raise ValueError(
                "Los campos correo y contraseña solo se modifican desde /api/v1/admin/usuarios"
            )
        return v


class PersonalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    usuario_id: UUID
    especialidad: str
    biografia: str | None
    color_agenda: str
    comision_porcentaje: float
    tipo_contrato: str
    fecha_ingreso: date | None
    esta_activo: bool
    # Enriched from usuario
    nombre_completo: str | None = None
    correo: str | None = None
    telefono: str | None = None


class CrearDisponibilidadRequest(BaseModel):
    personal_id: UUID
    dia_semana: int = Field(ge=0, le=6)
    hora_inicio: str  # "HH:MM"
    hora_fin: str     # "HH:MM"
    minutos_buffer: int = Field(default=10, ge=0)

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


class DisponibilidadPersonalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    personal_id: UUID
    dia_semana: int
    hora_inicio: str
    hora_fin: str
    minutos_buffer: int
    esta_activo: bool
