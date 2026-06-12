from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class CrearCategoriaRequest(BaseModel):
    nombre: str
    descripcion: str | None = None
    icono_url: str | None = None
    color_hex: str = "#000000"
    orden_visualizacion: int = 0


class CategoriaResponse(BaseModel):
    id: UUID
    nombre: str
    descripcion: str | None
    icono_url: str | None
    color_hex: str
    orden_visualizacion: int
    esta_activo: bool


class ActualizarCategoriaRequest(BaseModel):
    nombre: str | None = None
    descripcion: str | None = None
    orden_visualizacion: int | None = None
    esta_activo: bool | None = None


class CrearServicioRequest(BaseModel):
    categoria_id: UUID
    nombre: str
    descripcion_tecnica: str | None = None
    duracion_minutos: int = Field(gt=0)
    precio: float = Field(gt=0)
    monto_deposito: float = Field(ge=0)
    requiere_ficha_salud: bool = False
    horas_cancelacion_sin_penalidad: int = 5
    imagen_referencia_url: str | None = None


class ActualizarServicioRequest(BaseModel):
    nombre: str | None = None
    descripcion_tecnica: str | None = None
    duracion_minutos: int | None = Field(default=None, gt=0)
    precio: float | None = Field(default=None, gt=0)
    monto_deposito: float | None = Field(default=None, ge=0)
    requiere_ficha_salud: bool | None = None
    horas_cancelacion_sin_penalidad: int | None = None
    imagen_referencia_url: str | None = None
    esta_activo: bool | None = None


class ServicioResponse(BaseModel):
    id: UUID
    categoria_id: UUID
    nombre: str
    descripcion_tecnica: str | None
    duracion_minutos: int
    precio: float
    monto_deposito: float
    requiere_ficha_salud: bool
    horas_cancelacion_sin_penalidad: int
    imagen_referencia_url: str | None
    esta_activo: bool


class HorarioDisponible(BaseModel):
    inicio: datetime
    fin: datetime


class DisponibilidadResponse(BaseModel):
    personal_id: UUID
    horarios: list[HorarioDisponible]
