from datetime import date, time
from uuid import UUID, uuid4

from beanie import Document
from pydantic import Field


class Personal(Document):
    id: UUID = Field(default_factory=uuid4)
    usuario_id: UUID
    especialidad: str
    biografia: str | None = None
    color_agenda: str = "#6366f1"
    comision_porcentaje: float = 0.0  # 0-100
    tipo_contrato: str = "planilla"  # 'planilla' | 'honorarios'
    fecha_ingreso: date | None = None
    esta_activo: bool = True

    class Settings:
        name = "personal"


class DisponibilidadPersonal(Document):
    id: UUID = Field(default_factory=uuid4)
    personal_id: UUID
    dia_semana: int  # 0=domingo … 6=sábado
    hora_inicio: time
    hora_fin: time
    minutos_buffer: int = 10
    esta_activo: bool = True

    class Settings:
        name = "disponibilidad_personal"
