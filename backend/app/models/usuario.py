from datetime import datetime
from uuid import UUID, uuid4
from zoneinfo import ZoneInfo

from beanie import Document
from pydantic import Field
from pymongo import ASCENDING, IndexModel

LIMA_TZ = ZoneInfo("America/Lima")


class Usuario(Document):
    id: UUID = Field(default_factory=uuid4)
    telefono: str | None = None
    nombre_completo: str
    correo: str | None = None
    hashed_password: str | None = None
    correo_verificado: bool = False
    rol: str  # 'cliente' | 'trabajador' | 'admin'
    esta_activo: bool = True
    foto_perfil_url: str | None = None
    acepta_whatsapp: bool = True
    ultimo_acceso: datetime | None = None
    fecha_creacion: datetime = Field(default_factory=lambda: datetime.now(LIMA_TZ))
    actualizado_en: datetime = Field(default_factory=lambda: datetime.now(LIMA_TZ))

    class Settings:
        name = "usuarios"
        indexes = [
            IndexModel([("correo", ASCENDING)], unique=True, sparse=True),
            IndexModel([("telefono", ASCENDING)], unique=True, sparse=True),
        ]
