import uuid

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Categoria(Base):
    __tablename__ = "categorias"
    __table_args__ = (
        sa.UniqueConstraint("nombre", name="uq_categorias_nombre"),
    )

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre: Mapped[str] = mapped_column(sa.String, nullable=False)
    descripcion: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    icono_url: Mapped[str | None] = mapped_column(sa.String, nullable=True)
    color_hex: Mapped[str] = mapped_column(sa.String, default="#000000", nullable=False)
    orden_visualizacion: Mapped[int] = mapped_column(sa.Integer, default=0, nullable=False)
    esta_activo: Mapped[bool] = mapped_column(sa.Boolean, default=True, nullable=False)


class Servicio(Base):
    __tablename__ = "servicios"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    categoria_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), sa.ForeignKey("categorias.id"), nullable=False
    )
    nombre: Mapped[str] = mapped_column(sa.String, nullable=False)
    descripcion_tecnica: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    duracion_minutos: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    precio: Mapped[float] = mapped_column(sa.Numeric(10, 2, asdecimal=False), nullable=False)
    monto_deposito: Mapped[float] = mapped_column(sa.Numeric(10, 2, asdecimal=False), nullable=False)
    requiere_ficha_salud: Mapped[bool] = mapped_column(sa.Boolean, default=False, nullable=False)
    horas_cancelacion_sin_penalidad: Mapped[int] = mapped_column(sa.Integer, default=5, nullable=False)
    imagen_referencia_url: Mapped[str | None] = mapped_column(sa.String, nullable=True)
    esta_activo: Mapped[bool] = mapped_column(sa.Boolean, default=True, nullable=False)
