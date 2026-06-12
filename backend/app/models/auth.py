from datetime import datetime
from uuid import UUID, uuid4

from beanie import Document
from pydantic import Field, field_validator

from app.utils.timezone import a_lima, ahora_lima


class MagicLink(Document):
    id: UUID = Field(default_factory=uuid4)
    usuario_id: UUID
    token: UUID = Field(default_factory=uuid4)
    expira_en: datetime  # fijado por auth_service: ahora_lima() + timedelta(hours=1)
    usado: bool = False
    fecha_creacion: datetime = Field(default_factory=ahora_lima)

    @field_validator("expira_en", "fecha_creacion", mode="before")
    @classmethod
    def _normalizar_tz(cls, v: object) -> object:
        if isinstance(v, datetime) and v.tzinfo is None:
            return a_lima(v)
        return v

    class Settings:
        name = "magic_links"
