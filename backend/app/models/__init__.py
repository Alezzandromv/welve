from app.models.auth import MagicLink
from app.models.cita import Cita, CitaServicio
from app.models.cliente import Cliente, FichaSalud
from app.models.fidelizacion import Descuento, DescuentoUso, Reto
from app.models.pago import Pago
from app.models.personal import DisponibilidadPersonal, Personal
from app.models.servicio import Categoria, Servicio
from app.models.usuario import Usuario

__all__ = [
    "Categoria",
    "Cita",
    "CitaServicio",
    "Cliente",
    "Descuento",
    "DescuentoUso",
    "DisponibilidadPersonal",
    "FichaSalud",
    "MagicLink",
    "Pago",
    "Personal",
    "Reto",
    "Servicio",
    "Usuario",
]
