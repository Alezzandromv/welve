"""RN13: solapamiento de citas con buffer entre ellas.

Única fuente de verdad para la fórmula de solapamiento — antes duplicada de forma
independiente en `services/citas_service.py` (validación real al crear una cita) y
`services/servicios_service.py` (cálculo de disponibilidad mostrado al cliente). Si la regla
se ajustaba en un solo lugar, ambos flujos podían divergir silenciosamente.
"""
from datetime import datetime, timedelta


def se_solapa(inicio_a: datetime, fin_a: datetime, inicio_b: datetime, fin_b: datetime, buffer_minutos: int) -> bool:
    """Dos intervalos [inicio_a, fin_a) y [inicio_b, fin_b) se solapan (considerando un
    buffer de `buffer_minutos` entre citas) si cada uno empieza antes de que el otro
    termine + buffer."""
    buffer = timedelta(minutes=buffer_minutos)
    return inicio_a < (fin_b + buffer) and inicio_b < (fin_a + buffer)
