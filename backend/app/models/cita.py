import uuid
from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.enums import EstadoCita
from app.utils.timezone import ahora_lima


class Cita(Base):
    __tablename__ = "citas"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cliente_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), sa.ForeignKey("clientes.id"), nullable=False
    )
    personal_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), sa.ForeignKey("personal.id"), nullable=False
    )
    programada_en: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), nullable=False)
    termina_en: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), nullable=False)
    estado: Mapped[EstadoCita] = mapped_column(
        sa.Enum(EstadoCita, name="estado_cita", native_enum=False, validate_strings=True,
                values_callable=lambda e: [x.value for x in e]),
        default=EstadoCita.pendiente, nullable=False,
    )
    hora_llegada_real: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    notas_cliente: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    notas_especialista: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    motivo_cancelacion: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    fecha_cancelacion: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    penalizacion_aplicada: Mapped[bool] = mapped_column(sa.Boolean, default=False, nullable=False)
    creada_en: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), default=ahora_lima, nullable=False)


class CitaServicio(Base):
    __tablename__ = "cita_servicios"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cita_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), sa.ForeignKey("citas.id"), nullable=False
    )
    servicio_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), sa.ForeignKey("servicios.id"), nullable=False
    )
    precio_unitario: Mapped[float] = mapped_column(sa.Numeric(10, 2, asdecimal=False), nullable=False)
    duracion_minutos: Mapped[int] = mapped_column(sa.Integer, nullable=False)
