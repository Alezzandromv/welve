from datetime import timedelta

import structlog
from sqlalchemy import update

from app.models.cita import Cita
from app.models.enums import EstadoCita
from app.tasks import celery_app
from app.tasks._utils import run_async
from app.tasks.db import get_task_sessionmaker
from app.utils.timezone import ahora_lima

logger = structlog.get_logger(__name__)


async def _verificar_no_show_async() -> None:
    umbral = ahora_lima() - timedelta(minutes=15)

    # RN05: citas confirmadas que pasaron 15min sin hora_llegada_real — colapsado a un
    # solo UPDATE (antes: fetch + loop + save por cada Cita).
    Session = get_task_sessionmaker()
    async with Session() as session:
        resultado = await session.execute(
            update(Cita)
            .where(
                Cita.estado == EstadoCita.confirmada,
                Cita.programada_en <= umbral,
                Cita.hora_llegada_real.is_(None),
            )
            .values(estado=EstadoCita.no_show, penalizacion_aplicada=True)
        )
        await session.commit()
        if resultado.rowcount:
            logger.info("no_show.marcadas", cantidad=resultado.rowcount)


@celery_app.task(
    name="app.tasks.no_show.verificar_no_show",
    bind=True, autoretry_for=(Exception,), retry_backoff=True, retry_backoff_max=600, max_retries=3,
)
def verificar_no_show(self) -> None:
    run_async(_verificar_no_show_async())
