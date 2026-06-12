from datetime import datetime
from typing import Literal
from uuid import UUID, uuid4

from beanie import Document
from pydantic import Field, field_validator
from pymongo import ASCENDING, IndexModel

from app.utils.timezone import a_lima, ahora_lima


class Usuario(Document):
    id: UUID = Field(default_factory=uuid4)
    telefono: str | None = None
    nombre_completo: str
    correo: str | None = None
    hashed_password: str | None = None
    correo_verificado: bool = False
    rol: Literal["cliente", "trabajador", "admin"]
    esta_activo: bool = True
    foto_perfil_url: str | None = None
    acepta_whatsapp: bool = True
    ultimo_acceso: datetime | None = None
    fecha_creacion: datetime = Field(default_factory=ahora_lima)
    actualizado_en: datetime = Field(default_factory=ahora_lima)

    @field_validator("ultimo_acceso", "fecha_creacion", "actualizado_en", mode="before")
    @classmethod
    def _normalizar_tz(cls, v: object) -> object:
        if isinstance(v, datetime) and v.tzinfo is None:
            return a_lima(v)
        return v

    class Settings:
        name = "usuarios"
        indexes = [
            IndexModel(
                [("correo", ASCENDING)],
                unique=True,
                partialFilterExpression={"correo": {"$type": "string"}},
            ),
            IndexModel(
                [("telefono", ASCENDING)],
                unique=True,
                partialFilterExpression={"telefono": {"$type": "string"}},
            ),
        ]
