import uuid
from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.enums import EstadoPago, MetodoPago, TipoPago
from app.models.mixins import TimestampMixin


class Pago(TimestampMixin, Base):
    __tablename__ = "pagos"
    __table_args__ = (
        sa.Index("ix_pagos_cita_id", "cita_id"),
        sa.Index("ix_pagos_cliente_id", "cliente_id"),
        sa.Index("ix_pagos_confirmado_por", "confirmado_por"),
    )

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cita_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), sa.ForeignKey("citas.id"), nullable=False
    )
    cliente_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), sa.ForeignKey("clientes.id"), nullable=False
    )
    tipo: Mapped[TipoPago] = mapped_column(
        sa.Enum(TipoPago, name="tipo_pago", native_enum=False, validate_strings=True,
                values_callable=lambda e: [x.value for x in e]),
        nullable=False,
    )
    metodo: Mapped[MetodoPago] = mapped_column(
        sa.Enum(MetodoPago, name="metodo_pago", native_enum=False, validate_strings=True,
                values_callable=lambda e: [x.value for x in e]),
        nullable=False,
    )
    estado: Mapped[EstadoPago] = mapped_column(
        sa.Enum(EstadoPago, name="estado_pago", native_enum=False, validate_strings=True,
                values_callable=lambda e: [x.value for x in e]),
        default=EstadoPago.pendiente, nullable=False,
    )
    monto: Mapped[float] = mapped_column(sa.Numeric(10, 2, asdecimal=False), nullable=False)
    referencia_externa: Mapped[str | None] = mapped_column(sa.String, nullable=True)
    comprobante_url: Mapped[str | None] = mapped_column(sa.String, nullable=True)
    confirmado_por: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), sa.ForeignKey("usuarios.id"), nullable=True
    )
    fecha_confirmacion: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    nota_admin: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
