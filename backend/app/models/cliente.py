from datetime import date, datetime
from typing import Literal
from uuid import UUID, uuid4

from beanie import Document
from pydantic import Field, field_validator

from app.utils.timezone import a_lima


class Cliente(Document):
    id: UUID = Field(default_factory=uuid4)
    usuario_id: UUID
    fecha_nacimiento: date | None = None
    canal_captacion: str | None = None
    etiquetas: list[str] = []
    notas_internas: str | None = None
    esta_bloqueada: bool = False
    motivo_bloqueo: str | None = None
    fecha_bloqueo: datetime | None = None

    @field_validator("fecha_bloqueo", mode="before")
    @classmethod
    def _normalizar_tz(cls, v: object) -> object:
        if isinstance(v, datetime) and v.tzinfo is None:
            return a_lima(v)
        return v

    class Settings:
        name = "clientes"


class FichaSalud(Document):
    id: UUID = Field(default_factory=uuid4)
    cliente_id: UUID
    tipo_restriccion: str
    descripcion: str
    severidad: Literal["informativa", "moderada", "critica"] = "informativa"
    esta_activo: bool = True

    class Settings:
        name = "fichas_salud"
