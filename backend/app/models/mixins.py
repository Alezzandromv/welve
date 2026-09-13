"""Mixins reutilizables entre modelos."""
from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func


class TimestampMixin:
    """Timestamps de auditoría a nivel de servidor (`server_default`/`onupdate` con
    `func.now()`, no `default=` de Python) — así quedan correctos incluso si algo inserta
    o actualiza sin pasar por el ORM (migraciones de datos, SQL directo)."""

    creado_en: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), server_default=func.now(), nullable=False)
    actualizado_en: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
