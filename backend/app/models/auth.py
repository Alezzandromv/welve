from datetime import datetime
from uuid import UUID, uuid4
from zoneinfo import ZoneInfo

from beanie import Document
from pydantic import Field

LIMA_TZ = ZoneInfo("America/Lima")


class MagicLink(Document):
    id: UUID = Field(default_factory=uuid4)
    usuario_id: UUID
    token: UUID = Field(default_factory=uuid4)
    expira_en: datetime  # now(Lima) + 1h
    usado: bool = False
    fecha_creacion: datetime = Field(default_factory=lambda: datetime.now(LIMA_TZ))

    class Settings:
        name = "magic_links"
