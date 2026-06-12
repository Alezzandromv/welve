from datetime import datetime
from typing import Literal
from uuid import UUID, uuid4

from beanie import Document
from pydantic import Field, field_validator

from app.utils.timezone import a_lima, ahora_lima


class Descuento(Document):
    id: UUID = Field(default_factory=uuid4)
    nombre: str
    descripcion: str | None = None
    tipo: Literal["porcentaje", "monto_fijo"]
    scope: Literal["publico", "privado", "reto"] = "publico"
    codigo: str | None = None      # único cuando presente; None en descuentos automáticos
    valor: float
    monto_minimo: float = 0.0
    max_usos_global: int | None = None
    max_usos_por_cliente: int = 1
    vigente_desde: datetime | None = None
    vigente_hasta: datetime | None = None
    esta_activo: bool = True

    @field_validator("vigente_desde", "vigente_hasta", mode="before")
    @classmethod
    def _normalizar_tz(cls, v: object) -> object:
        if isinstance(v, datetime) and v.tzinfo is None:
            return a_lima(v)
        return v

    class Settings:
        name = "descuentos"


class Reto(Document):
    id: UUID = Field(default_factory=uuid4)
    nombre: str
    descripcion_visible: str
    visitas_requeridas: int
    dias_ventana: int
    recompensa_tipo: Literal["descuento", "servicio_gratis", "credito"]
    recompensa_valor: float
    esta_activo: bool = True
    vigente_hasta: datetime | None = None

    @field_validator("vigente_hasta", mode="before")
    @classmethod
    def _normalizar_tz(cls, v: object) -> object:
        if isinstance(v, datetime) and v.tzinfo is None:
            return a_lima(v)
        return v

    class Settings:
        name = "retos"


class DescuentoUso(Document):
    id: UUID = Field(default_factory=uuid4)
    descuento_id: UUID
    cliente_id: UUID
    cita_id: UUID
    reto_origen_id: UUID | None = None
    fecha_canje: datetime = Field(default_factory=ahora_lima)

    @field_validator("fecha_canje", mode="before")
    @classmethod
    def _normalizar_tz(cls, v: object) -> object:
        if isinstance(v, datetime) and v.tzinfo is None:
            return a_lima(v)
        return v

    class Settings:
        name = "descuento_usos"
