"""Mixins compartidos entre schemas de distintos módulos de dominio."""
from pydantic import model_validator


class RechazaCredencialesMixin:
    """Los campos correo/password solo se modifican vía /api/v1/admin/usuarios/{id}/correo
    y /password — nunca mezclados en el payload de actualización de Cliente o Personal."""

    @model_validator(mode="before")
    @classmethod
    def rechazar_credenciales(cls, v: object) -> object:
        if isinstance(v, dict) and ("correo" in v or "password" in v or "contrasena" in v):
            raise ValueError(
                "Los campos correo y contraseña solo se modifican desde /api/v1/admin/usuarios"
            )
        return v
