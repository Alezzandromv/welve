from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UsuarioAdminResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

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


class CrearUsuarioRequest(BaseModel):
    nombre_completo: str = Field(min_length=2)
    rol: Literal["admin", "trabajador", "cliente"]
    correo: EmailStr | None = None
    telefono: str | None = None
    password: str | None = None
