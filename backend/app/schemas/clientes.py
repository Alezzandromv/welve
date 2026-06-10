from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel


class FichaSaludRequest(BaseModel):
    tipo_restriccion: str
    descripcion: str
    severidad: str = "informativa"


class FichaSaludResponse(BaseModel):
    id: UUID
    tipo_restriccion: str
    descripcion: str
    severidad: str
    esta_activo: bool


class ClienteResponse(BaseModel):
    id: UUID
    usuario_id: UUID
    fecha_nacimiento: date | None
    canal_captacion: str | None
    etiquetas: list[str]
    esta_bloqueada: bool


class BloquearClienteRequest(BaseModel):
    motivo_bloqueo: str
