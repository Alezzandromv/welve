from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class SolicitarAccesoRequest(BaseModel):
    telefono: str


class SolicitarAccesoResponse(BaseModel):
    mensaje: str


class VerificarTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    rol: str
    nombre: str


class LoginStaffRequest(BaseModel):
    correo: EmailStr
    contrasena: str


class RegistroStaffRequest(BaseModel):
    nombre_completo: str
    correo: EmailStr
    contrasena: str
    rol: Literal["admin", "trabajador"]


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    rol: str
    nombre_completo: str
    usuario_id: str


class PerfilResponse(BaseModel):
    id: UUID
    nombre_completo: str
    telefono: str | None
    correo: str | None
    rol: str
    foto_perfil_url: str | None
    acepta_whatsapp: bool
    fecha_creacion: datetime | None = None
    ultimo_acceso: datetime | None = None


class ActualizarPerfilRequest(BaseModel):
    nombre_completo: str | None = None
    correo: EmailStr | None = None
    telefono: str | None = None


class CambiarPasswordRequest(BaseModel):
    password_actual: str
    password_nueva: str = Field(min_length=8)
