from datetime import datetime
from typing import Literal
from uuid import UUID, uuid4

from beanie import Document
from pydantic import Field, field_validator

from app.utils.timezone import a_lima

TipoPago = Literal["deposito", "saldo", "total", "penalizacion", "reembolso"]
MetodoPago = Literal["efectivo", "transferencia", "yape", "plin", "tarjeta"]
EstadoPago = Literal["pendiente", "confirmado", "rechazado", "reembolsado"]


class Pago(Document):
    id: UUID = Field(default_factory=uuid4)
    cita_id: UUID
    cliente_id: UUID
    tipo: TipoPago
    metodo: MetodoPago
    estado: EstadoPago = "pendiente"
    monto: float
    referencia_externa: str | None = None
    comprobante_url: str | None = None
    confirmado_por: UUID | None = None   # ref Usuario admin
    fecha_confirmacion: datetime | None = None
    nota_admin: str | None = None

    @field_validator("fecha_confirmacion", mode="before")
    @classmethod
    def _normalizar_tz(cls, v: object) -> object:
        if isinstance(v, datetime) and v.tzinfo is None:
            return a_lima(v)
        return v

    class Settings:
        name = "pagos"
