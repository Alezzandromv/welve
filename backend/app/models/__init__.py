from app.models.auth import MagicLink
from app.models.cliente import Cliente, FichaSalud
from app.models.cita import Cita, CitaServicio
from app.models.fidelizacion import Descuento, DescuentoUso, Reto
from app.models.pago import Pago
from app.models.personal import DisponibilidadPersonal, Personal
from app.models.servicio import Categoria, Servicio
from app.models.usuario import Usuario

__all__ = [
    "Usuario",
    "Personal",
    "DisponibilidadPersonal",
    "Cliente",
    "FichaSalud",
    "Categoria",
    "Servicio",
    "Cita",
    "CitaServicio",
    "Pago",
    "Descuento",
    "Reto",
    "DescuentoUso",
    "MagicLink",
]
