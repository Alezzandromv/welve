import asyncio
from uuid import UUID

from app.models.cita import Cita
from app.models.cliente import Cliente
from app.models.usuario import Usuario
from app.tasks import celery_app
from app.tasks.db import get_task_sessionmaker
from app.utils.whatsapp import enviar_mensaje


async def _enviar_recordatorio(cita_id: str, horas: int) -> None:
    Session = get_task_sessionmaker()
    async with Session() as session:
        cita = await session.get(Cita, UUID(cita_id))
        if not cita or cita.estado not in ("pendiente", "confirmada"):
            return

        cliente = await session.get(Cliente, cita.cliente_id)
        if not cliente:
            return

        usuario = await session.get(Usuario, cliente.usuario_id)
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
