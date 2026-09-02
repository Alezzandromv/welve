from datetime import date
from uuid import UUID

from pydantic import BaseModel, ConfigDict, model_validator


class FichaSaludRequest(BaseModel):
    tipo_restriccion: str
    descripcion: str
    severidad: str = "informativa"


class FichaSaludResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tipo_restriccion: str
    descripcion: str
    severidad: str
    esta_activo: bool


class ClienteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

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

    @model_validator(mode="before")
    @classmethod
    def rechazar_credenciales(cls, v: object) -> object:
        if isinstance(v, dict) and ("correo" in v or "password" in v or "contrasena" in v):
            raise ValueError(
                "Los campos correo y contraseña solo se modifican desde /api/v1/admin/usuarios"
            )
        return v


class BloquearClienteRequest(BaseModel):
    motivo_bloqueo: str
