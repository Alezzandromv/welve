from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import RecompensaTipo, ScopeDescuento, TipoDescuento


class CrearDescuentoRequest(BaseModel):
    nombre: str
    descripcion: str | None = None
    tipo: TipoDescuento
    scope: ScopeDescuento = ScopeDescuento.publico
    codigo: str | None = None
    valor: float = Field(gt=0)
    monto_minimo: float = 0.0
    max_usos_global: int | None = None
    max_usos_por_cliente: int = 1
    vigente_desde: datetime | None = None
    vigente_hasta: datetime | None = None


class DescuentoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    nombre: str
    descripcion: str | None
    tipo: str
    scope: str
    codigo: str | None
    valor: float
    monto_minimo: float
    max_usos_global: int | None
    max_usos_por_cliente: int
    vigente_desde: datetime | None
    vigente_hasta: datetime | None
    esta_activo: bool


class AplicarDescuentoRequest(BaseModel):
    codigo: str


class CrearRetoRequest(BaseModel):
    nombre: str
    descripcion_visible: str
    visitas_requeridas: int = Field(gt=0)
    dias_ventana: int = Field(gt=0)
    recompensa_tipo: RecompensaTipo
    recompensa_valor: float = Field(gt=0)
    vigente_hasta: datetime | None = None


class RetoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    nombre: str
    descripcion_visible: str
    visitas_requeridas: int
    dias_ventana: int
    recompensa_tipo: str
    recompensa_valor: float
    esta_activo: bool
    vigente_hasta: datetime | None


class DescuentoUsoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    descuento_id: UUID
    cliente_id: UUID
    cita_id: UUID
    reto_origen_id: UUID | None
    fecha_canje: datetime
