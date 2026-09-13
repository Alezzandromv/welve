import uuid
from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.enums import RecompensaTipo, ScopeDescuento, TipoDescuento
from app.models.mixins import TimestampMixin


class Descuento(TimestampMixin, Base):
    __tablename__ = "descuentos"
    __table_args__ = (
        sa.Index(
            "ux_descuentos_codigo", "codigo", unique=True,
            postgresql_where=sa.text("codigo IS NOT NULL"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre: Mapped[str] = mapped_column(sa.String, nullable=False)
    descripcion: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    tipo: Mapped[TipoDescuento] = mapped_column(
        sa.Enum(TipoDescuento, name="tipo_descuento", native_enum=False, validate_strings=True,
                values_callable=lambda e: [x.value for x in e]),
        nullable=False,
    )
    scope: Mapped[ScopeDescuento] = mapped_column(
        sa.Enum(ScopeDescuento, name="scope_descuento", native_enum=False, validate_strings=True,
                values_callable=lambda e: [x.value for x in e]),
        default=ScopeDescuento.publico, nullable=False,
    )
    codigo: Mapped[str | None] = mapped_column(sa.String, nullable=True)  # único cuando presente
    valor: Mapped[float] = mapped_column(sa.Numeric(10, 2, asdecimal=False), nullable=False)
    monto_minimo: Mapped[float] = mapped_column(sa.Numeric(10, 2, asdecimal=False), default=0.0, nullable=False)
    max_usos_global: Mapped[int | None] = mapped_column(sa.Integer, nullable=True)
    max_usos_por_cliente: Mapped[int] = mapped_column(sa.Integer, default=1, nullable=False)
    vigente_desde: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    vigente_hasta: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    esta_activo: Mapped[bool] = mapped_column(sa.Boolean, default=True, nullable=False)


class Reto(TimestampMixin, Base):
    __tablename__ = "retos"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre: Mapped[str] = mapped_column(sa.String, nullable=False)
    descripcion_visible: Mapped[str] = mapped_column(sa.Text, nullable=False)
    visitas_requeridas: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    dias_ventana: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    recompensa_tipo: Mapped[RecompensaTipo] = mapped_column(
        sa.Enum(RecompensaTipo, name="recompensa_tipo", native_enum=False, validate_strings=True,
                values_callable=lambda e: [x.value for x in e]),
        nullable=False,
    )
    recompensa_valor: Mapped[float] = mapped_column(sa.Numeric(10, 2, asdecimal=False), nullable=False)
    esta_activo: Mapped[bool] = mapped_column(sa.Boolean, default=True, nullable=False)
    vigente_hasta: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)


class DescuentoUso(Base):
    __tablename__ = "descuento_usos"
    __table_args__ = (
        sa.UniqueConstraint(
            "descuento_id", "cliente_id", "cita_id",
            name="uq_descuento_uso_cliente_cita",
        ),
        sa.Index("ix_descuento_usos_cliente_id", "cliente_id"),
        sa.Index("ix_descuento_usos_cita_id", "cita_id"),
        sa.Index("ix_descuento_usos_reto_origen_id", "reto_origen_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    descuento_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), sa.ForeignKey("descuentos.id"), nullable=False
    )
    cliente_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), sa.ForeignKey("clientes.id"), nullable=False
    )
    cita_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), sa.ForeignKey("citas.id"), nullable=False
    )
    reto_origen_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), sa.ForeignKey("retos.id"), nullable=True
    )
    fecha_canje: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False)
