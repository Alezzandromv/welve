from datetime import datetime
from uuid import UUID, uuid4

from beanie import Document
from pydantic import Field


class Descuento(Document):
    id: UUID = Field(default_factory=uuid4)
    nombre: str
    descripcion: str | None = None
    tipo: str  # 'porcentaje' | 'monto_fijo'
    scope: str = "publico"  # 'publico' | 'privado' | 'reto'
    codigo: str | None = None
    valor: float
    monto_minimo: float = 0.0
    max_usos_global: int | None = None
    max_usos_por_cliente: int = 1
    vigente_desde: datetime | None = None
    vigente_hasta: datetime | None = None
    esta_activo: bool = True

    class Settings:
        name = "descuentos"


class Reto(Document):
    id: UUID = Field(default_factory=uuid4)
    nombre: str
    descripcion_visible: str
    visitas_requeridas: int
    dias_ventana: int
    recompensa_tipo: str  # 'descuento' | 'servicio_gratis' | 'credito'
    recompensa_valor: float
    esta_activo: bool = True
    vigente_hasta: datetime | None = None

    class Settings:
        name = "retos"


class DescuentoUso(Document):
    id: UUID = Field(default_factory=uuid4)
    descuento_id: UUID
    cliente_id: UUID
    cita_id: UUID
    reto_origen_id: UUID | None = None
    fecha_canje: datetime

    class Settings:
        name = "descuento_usos"
