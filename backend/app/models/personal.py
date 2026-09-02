import uuid
from datetime import date, time

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.enums import TipoContrato


class Personal(Base):
    __tablename__ = "personal"
    __table_args__ = (
        sa.UniqueConstraint("usuario_id", name="uq_personal_usuario_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    usuario_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), sa.ForeignKey("usuarios.id"), nullable=False
    )
    especialidad: Mapped[str] = mapped_column(sa.String, nullable=False)
    biografia: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    color_agenda: Mapped[str] = mapped_column(sa.String, default="#6366f1", nullable=False)
    comision_porcentaje: Mapped[float] = mapped_column(
        sa.Numeric(5, 2, asdecimal=False), default=0.0, nullable=False
    )  # 0–100
    tipo_contrato: Mapped[TipoContrato] = mapped_column(
        sa.Enum(TipoContrato, name="tipo_contrato", native_enum=False, validate_strings=True,
                values_callable=lambda e: [x.value for x in e]),
        default=TipoContrato.planilla, nullable=False,
    )
    fecha_ingreso: Mapped[date | None] = mapped_column(sa.Date, nullable=True)
    esta_activo: Mapped[bool] = mapped_column(sa.Boolean, default=True, nullable=False)


class DisponibilidadPersonal(Base):
    __tablename__ = "disponibilidad_personal"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    personal_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), sa.ForeignKey("personal.id"), nullable=False
    )
    dia_semana: Mapped[int] = mapped_column(sa.Integer, nullable=False)  # 0=domingo … 6=sábado
    hora_inicio: Mapped[time] = mapped_column(sa.Time, nullable=False)
    hora_fin: Mapped[time] = mapped_column(sa.Time, nullable=False)
    minutos_buffer: Mapped[int] = mapped_column(sa.Integer, default=10, nullable=False)
    esta_activo: Mapped[bool] = mapped_column(sa.Boolean, default=True, nullable=False)
