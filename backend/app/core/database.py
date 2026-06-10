import motor.motor_asyncio
from beanie import init_beanie

from app.core.config import settings
from app.models import (
    Cita,
    CitaServicio,
    Categoria,
    Cliente,
    DescuentoUso,
    Descuento,
    DisponibilidadPersonal,
    FichaSalud,
    MagicLink,
    Pago,
    Personal,
    Reto,
    Servicio,
    Usuario,
)


async def init_db() -> None:
    client = motor.motor_asyncio.AsyncIOMotorClient(settings.mongodb_url)
    await init_beanie(
        database=client[settings.database_name],
        document_models=[
            Usuario,
            Personal,
            DisponibilidadPersonal,
            Cliente,
            FichaSalud,
            Categoria,
            Servicio,
            Cita,
            CitaServicio,
            Pago,
            Descuento,
            Reto,
            DescuentoUso,
            MagicLink,
        ],
    )
