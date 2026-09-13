from uuid import UUID

import structlog

from app.models.cita import Cita
from app.models.cliente import Cliente
from app.models.usuario import Usuario
from app.tasks import celery_app
from app.tasks._utils import run_async
from app.tasks.db import get_task_sessionmaker
from app.utils.whatsapp import enviar_mensaje

logger = structlog.get_logger(__name__)


async def _enviar_recordatorio(cita_id: str, horas: int) -> None:
    Session = get_task_sessionmaker()
    async with Session() as session:
        cita = await session.get(Cita, UUID(cita_id))
        if not cita:
            logger.info("recordatorio.cita_no_encontrada", cita_id=cita_id, horas=horas)
            return
        if cita.estado not in ("pendiente", "confirmada"):
            logger.info("recordatorio.omitido_estado", cita_id=cita_id, horas=horas, estado=cita.estado)
            return

        cliente = await session.get(Cliente, cita.cliente_id)
        if not cliente:
            logger.warning("recordatorio.cliente_no_encontrado", cita_id=cita_id, horas=horas)
            return

        usuario = await session.get(Usuario, cliente.usuario_id)
        if not usuario or not usuario.acepta_whatsapp or not usuario.telefono:
            logger.info("recordatorio.omitido_sin_whatsapp", cita_id=cita_id, horas=horas)
            return

        hora_str = cita.programada_en.strftime("%H:%M")
        fecha_str = cita.programada_en.strftime("%d/%m/%Y")
        mensaje = (
            f"Hola {usuario.nombre_completo.split()[0]}! 🌸 "
            f"Te recordamos tu cita en Eunoia Beauty Salon "
            f"el {fecha_str} a las {hora_str}. "
            f"¿Necesitas cancelar o reagendar? Contáctanos con anticipación."
        )
        enviado = await enviar_mensaje(usuario.telefono, mensaje)
        logger.info("recordatorio.resultado", cita_id=cita_id, horas=horas, enviado=enviado)


@celery_app.task(
    name="app.tasks.recordatorios.recordatorio_24h",
    bind=True, autoretry_for=(Exception,), retry_backoff=True, retry_backoff_max=600, max_retries=3,
)
def recordatorio_24h(self, cita_id: str) -> None:
    run_async(_enviar_recordatorio(cita_id, horas=24))


@celery_app.task(
    name="app.tasks.recordatorios.recordatorio_2h",
    bind=True, autoretry_for=(Exception,), retry_backoff=True, retry_backoff_max=600, max_retries=3,
)
def recordatorio_2h(self, cita_id: str) -> None:
    run_async(_enviar_recordatorio(cita_id, horas=2))
