from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class CategoriaResponse(BaseModel):
    id: UUID
    nombre: str
    descripcion: str | None
    icono_url: str | None
    color_hex: str
    orden_visualizacion: int


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


class HorarioDisponible(BaseModel):
    inicio: datetime
    fin: datetime


class DisponibilidadResponse(BaseModel):
    personal_id: UUID
    horarios: list[HorarioDisponible]
