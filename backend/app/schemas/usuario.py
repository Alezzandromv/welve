from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class UsuarioResponse(BaseModel):
    id: UUID
    nombre_completo: str
    telefono: str | None
    correo: str | None
    rol: str
    esta_activo: bool
    foto_perfil_url: str | None
    acepta_whatsapp: bool
    fecha_creacion: datetime


class ActualizarPerfilRequest(BaseModel):
    nombre_completo: str | None = None
    correo: str | None = None
    foto_perfil_url: str | None = None
    acepta_whatsapp: bool | None = None
