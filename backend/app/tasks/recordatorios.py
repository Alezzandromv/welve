import asyncio

import motor.motor_asyncio
from beanie import init_beanie

from app.core.config import settings
from app.tasks import celery_app


async def _enviar_recordatorio(cita_id: str, horas: int) -> None:
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
    from app.utils.whatsapp import enviar_mensaje
    from uuid import UUID

    client = motor.motor_asyncio.AsyncIOMotorClient(settings.mongodb_url)
    await init_beanie(
        database=client[settings.database_name],
        document_models=[
            Usuario, Personal, DisponibilidadPersonal, Cliente, FichaSalud,
            Categoria, Servicio, Cita, CitaServicio, Pago,
            Descuento, Reto, DescuentoUso, MagicLink,
        ],
    )

    cita = await Cita.get(UUID(cita_id))
    if not cita or cita.estado not in ("pendiente", "confirmada"):
        return

    cliente = await Cliente.get(cita.cliente_id)
    if not cliente:
        return

    usuario = await Usuario.get(cliente.usuario_id)
    if not usuario or not usuario.acepta_whatsapp or not usuario.telefono:
        return

    hora_str = cita.programada_en.strftime("%H:%M")
    fecha_str = cita.programada_en.strftime("%d/%m/%Y")
    mensaje = (
        f"Hola {usuario.nombre_completo.split()[0]}! 🌸 "
        f"Te recordamos tu cita en Eunoia Beauty Salon "
        f"el {fecha_str} a las {hora_str}. "
        f"¿Necesitas cancelar o reagendar? Contáctanos con anticipación."
    )
    await enviar_mensaje(usuario.telefono, mensaje)


def _run_async(coro) -> None:
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(name="app.tasks.recordatorios.recordatorio_24h")
def recordatorio_24h(cita_id: str) -> None:
    _run_async(_enviar_recordatorio(cita_id, horas=24))


@celery_app.task(name="app.tasks.recordatorios.recordatorio_2h")
def recordatorio_2h(cita_id: str) -> None:
    _run_async(_enviar_recordatorio(cita_id, horas=2))
