from uuid import UUID, uuid4

from beanie import Document
from pydantic import Field


class Categoria(Document):
    id: UUID = Field(default_factory=uuid4)
    nombre: str
    descripcion: str | None = None
    icono_url: str | None = None
    color_hex: str = "#000000"
    orden_visualizacion: int = 0
    esta_activo: bool = True

    class Settings:
        name = "categorias"


class Servicio(Document):
    id: UUID = Field(default_factory=uuid4)
    categoria_id: UUID
    nombre: str
    descripcion_tecnica: str | None = None
    duracion_minutos: int
    precio: float
    monto_deposito: float
    requiere_ficha_salud: bool = False
    horas_cancelacion_sin_penalidad: int = 5
    imagen_referencia_url: str | None = None
    esta_activo: bool = True

    class Settings:
        name = "servicios"
