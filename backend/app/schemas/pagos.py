from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class ConfirmarPagoRequest(BaseModel):
    referencia_externa: str | None = None
    nota_admin: str | None = None


class PagoResponse(BaseModel):
    id: UUID
    cita_id: UUID
    cliente_id: UUID
    tipo: str
    metodo: str
    estado: str
    monto: float
    referencia_externa: str | None
    confirmado_por: UUID | None
    fecha_confirmacion: datetime | None
