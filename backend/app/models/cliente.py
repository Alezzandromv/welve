from datetime import date, datetime
from uuid import UUID, uuid4

from beanie import Document
from pydantic import Field


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

    class Settings:
        name = "clientes"


class FichaSalud(Document):
    id: UUID = Field(default_factory=uuid4)
    cliente_id: UUID
    tipo_restriccion: str
    descripcion: str
    severidad: str = "informativa"  # 'informativa' | 'moderada' | 'critica'
    esta_activo: bool = True

    class Settings:
        name = "fichas_salud"
