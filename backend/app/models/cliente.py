import uuid
from datetime import date, datetime

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.enums import SeveridadFicha
from app.models.mixins import TimestampMixin


class Cliente(TimestampMixin, Base):
    __tablename__ = "clientes"
    __table_args__ = (
        sa.UniqueConstraint("usuario_id", name="uq_clientes_usuario_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    usuario_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), sa.ForeignKey("usuarios.id"), nullable=False
    )
    fecha_nacimiento: Mapped[date | None] = mapped_column(sa.Date, nullable=True)
    canal_captacion: Mapped[str | None] = mapped_column(sa.String, nullable=True)
    etiquetas: Mapped[list[str]] = mapped_column(ARRAY(sa.String), default=list, nullable=False)
    notas_internas: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    esta_bloqueada: Mapped[bool] = mapped_column(sa.Boolean, default=False, nullable=False)
    motivo_bloqueo: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    fecha_bloqueo: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)


class FichaSalud(TimestampMixin, Base):
    __tablename__ = "fichas_salud"
    __table_args__ = (
        sa.Index("ix_fichas_salud_cliente_id", "cliente_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cliente_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), sa.ForeignKey("clientes.id"), nullable=False
    )
    tipo_restriccion: Mapped[str] = mapped_column(sa.String, nullable=False)
    descripcion: Mapped[str] = mapped_column(sa.Text, nullable=False)
    severidad: Mapped[SeveridadFicha] = mapped_column(
        sa.Enum(SeveridadFicha, name="severidad_ficha", native_enum=False, validate_strings=True,
                values_callable=lambda e: [x.value for x in e]),
        default=SeveridadFicha.informativa, nullable=False,
    )
    esta_activo: Mapped[bool] = mapped_column(sa.Boolean, default=True, nullable=False)
