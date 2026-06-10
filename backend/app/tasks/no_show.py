import asyncio

import motor.motor_asyncio
from beanie import init_beanie

from app.core.config import settings
from app.tasks import celery_app


async def _verificar_no_show_async() -> None:
    from datetime import timedelta

    from app.models import (
        Categoria,
        Cita,
        CitaServicio,
        Cliente,
        Descuento,
        DescuentoUso,
        DisponibilidadPersonal,
        FichaSalud,
        MagicLink,
        Pago,
        Personal,
        Reto,
        Servicio,
        Usuario,
    )
    from app.utils.timezone import ahora_lima

    client = motor.motor_asyncio.AsyncIOMotorClient(settings.mongodb_url)
    await init_beanie(
        database=client[settings.database_name],
        document_models=[
            Usuario, Personal, DisponibilidadPersonal, Cliente, FichaSalud,
            Categoria, Servicio, Cita, CitaServicio, Pago,
            Descuento, Reto, DescuentoUso, MagicLink,
        ],
    )

    ahora = ahora_lima()
    umbral = ahora - timedelta(minutes=15)

    # RN05: citas confirmadas que pasaron 15min sin hora_llegada_real
    citas = await Cita.find(
        Cita.estado == "confirmada",
        Cita.programada_en <= umbral,
    ).to_list()

    for cita in citas:
        if cita.hora_llegada_real is not None:
            continue
        cita.estado = "no_show"
        cita.penalizacion_aplicada = True
        await cita.save()


@celery_app.task(name="app.tasks.no_show.verificar_no_show")
def verificar_no_show() -> None:
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(_verificar_no_show_async())
    finally:
        loop.close()
