import uuid
from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.enums import RolUsuario
from app.utils.timezone import ahora_lima


class Usuario(Base):
    __tablename__ = "usuarios"
    __table_args__ = (
        sa.Index(
            "ux_usuarios_correo", "correo", unique=True,
            postgresql_where=sa.text("correo IS NOT NULL"),
        ),
        sa.Index(
            "ux_usuarios_telefono", "telefono", unique=True,
            postgresql_where=sa.text("telefono IS NOT NULL"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    telefono: Mapped[str | None] = mapped_column(sa.String, nullable=True)
    nombre_completo: Mapped[str] = mapped_column(sa.String, nullable=False)
    correo: Mapped[str | None] = mapped_column(sa.String, nullable=True)
    hashed_password: Mapped[str | None] = mapped_column(sa.String, nullable=True)
    correo_verificado: Mapped[bool] = mapped_column(sa.Boolean, default=False, nullable=False)
    rol: Mapped[RolUsuario] = mapped_column(
        sa.Enum(RolUsuario, name="rol_usuario", native_enum=False, validate_strings=True,
                values_callable=lambda e: [x.value for x in e]),
        nullable=False,
    )
    esta_activo: Mapped[bool] = mapped_column(sa.Boolean, default=True, nullable=False)
    foto_perfil_url: Mapped[str | None] = mapped_column(sa.String, nullable=True)
    acepta_whatsapp: Mapped[bool] = mapped_column(sa.Boolean, default=True, nullable=False)
    ultimo_acceso: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    fecha_creacion: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), default=ahora_lima, nullable=False)
    actualizado_en: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), default=ahora_lima, nullable=False)
