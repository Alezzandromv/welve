import asyncio
from datetime import timedelta

from sqlalchemy import update

from app.models.cita import Cita
from app.models.enums import EstadoCita
from app.tasks import celery_app
from app.tasks.db import get_task_sessionmaker
from app.utils.timezone import ahora_lima


async def _verificar_no_show_async() -> None:
    umbral = ahora_lima() - timedelta(minutes=15)

    # RN05: citas confirmadas que pasaron 15min sin hora_llegada_real — colapsado a un
    # solo UPDATE (antes: fetch + loop + save por cada Cita).
    Session = get_task_sessionmaker()
    async with Session() as session:
        await session.execute(
            update(Cita)
            .where(
                Cita.estado == EstadoCita.confirmada,
                Cita.programada_en <= umbral,
                Cita.hora_llegada_real.is_(None),
            )
            .values(estado=EstadoCita.no_show, penalizacion_aplicada=True)
        )
        await session.commit()


@celery_app.task(name="app.tasks.no_show.verificar_no_show")
def verificar_no_show() -> None:
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(_verificar_no_show_async())
    finally:
        loop.close()
