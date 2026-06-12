from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class UsuarioAdminResponse(BaseModel):
    id: UUID
    nombre_completo: str
    correo: str | None
    telefono: str | None
    rol: str
    esta_activo: bool
    correo_verificado: bool
    fecha_creacion: datetime | None = None


class ActualizarUsuarioRequest(BaseModel):
    nombre_completo: str | None = None
    telefono: str | None = None
    esta_activo: bool | None = None


class CambiarCorreoRequest(BaseModel):
    correo: EmailStr


class ResetearPasswordRequest(BaseModel):
    password_nueva: str = Field(min_length=8)


class CambiarEstadoRequest(BaseModel):
    esta_activo: bool
