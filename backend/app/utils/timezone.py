from datetime import datetime
from zoneinfo import ZoneInfo

LIMA_TZ = ZoneInfo("America/Lima")


def ahora_lima() -> datetime:
    return datetime.now(LIMA_TZ)


def a_lima(dt: datetime) -> datetime:
    """Convierte a America/Lima. Si es naive, asume UTC."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=ZoneInfo("UTC"))
    return dt.astimezone(LIMA_TZ)
