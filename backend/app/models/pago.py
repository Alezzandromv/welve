from datetime import datetime
from uuid import UUID, uuid4

from beanie import Document
from pydantic import Field


class Pago(Document):
    id: UUID = Field(default_factory=uuid4)
    cita_id: UUID
    cliente_id: UUID
    tipo: str  # 'deposito' | 'saldo' | 'total' | 'penalizacion' | 'reembolso'
    metodo: str  # 'efectivo' | 'transferencia' | 'yape' | 'plin' | 'tarjeta'
    estado: str = "pendiente"  # 'pendiente' | 'confirmado' | 'rechazado' | 'reembolsado'
    monto: float
    referencia_externa: str | None = None
    comprobante_url: str | None = None
    confirmado_por: UUID | None = None  # ref Usuario admin
    fecha_confirmacion: datetime | None = None
    nota_admin: str | None = None

    class Settings:
        name = "pagos"
