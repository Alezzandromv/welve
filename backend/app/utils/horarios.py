"""Helpers de conversión hora <-> string "HH:MM".

`DisponibilidadPersonal.hora_inicio`/`hora_fin` se almacenan como `time` nativo de Postgres,
pero el contrato HTTP (schemas) sigue exponiendo strings "HH:MM" como antes de la migración —
estos helpers viven en el borde service <-> schema.
"""
from datetime import time


def parse_hhmm(s: str) -> time:
    """Convierte "HH:MM" o "HH:MM:SS" a `datetime.time`."""
    partes = s.split(":")
    return time(hour=int(partes[0]), minute=int(partes[1]))


def hhmm(t: time) -> str:
    """Convierte `datetime.time` a string "HH:MM"."""
    return f"{t.hour:02d}:{t.minute:02d}"
