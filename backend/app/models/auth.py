import uuid
from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.utils.timezone import ahora_lima


class MagicLink(Base):
    __tablename__ = "magic_links"
    __table_args__ = (
        sa.Index("ux_magic_links_token", "token", unique=True),
    )

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    usuario_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), sa.ForeignKey("usuarios.id"), nullable=False
    )
    token: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), default=uuid.uuid4, nullable=False)
    expira_en: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), nullable=False)
    usado: Mapped[bool] = mapped_column(sa.Boolean, default=False, nullable=False)
    fecha_creacion: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), default=ahora_lima, nullable=False)
