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
    notas_internas: str | None
    esta_bloqueada: bool
    motivo_bloqueo: str | None
    nombre_completo: str | None = None
    correo: str | None = None
    telefono: str | None = None


class ActualizarClienteRequest(BaseModel):
    fecha_nacimiento: date | None = None
    canal_captacion: str | None = None
    etiquetas: list[str] | None = None
    notas_internas: str | None = None
    nombre_completo: str | None = None
    telefono: str | None = None


class BloquearClienteRequest(BaseModel):
    motivo_bloqueo: str
