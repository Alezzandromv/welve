from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CrearPagoRequest(BaseModel):
    cita_id: UUID
    tipo: str  # 'deposito' | 'saldo' | 'total' | 'penalizacion' | 'reembolso'
    metodo: str  # 'efectivo' | 'transferencia' | 'yape' | 'plin' | 'tarjeta'
    monto: float = Field(gt=0)
    referencia_externa: str | None = None


class ConfirmarPagoRequest(BaseModel):
    referencia_externa: str | None = None
    nota_admin: str | None = None


class PagoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    cita_id: UUID
    cliente_id: UUID
    tipo: str
    metodo: str
    estado: str
    monto: float
    referencia_externa: str | None
    comprobante_url: str | None
    confirmado_por: UUID | None
    fecha_confirmacion: datetime | None
    nota_admin: str | None
