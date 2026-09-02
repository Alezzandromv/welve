"""Tests de reglas de negocio de fidelización: RN14 (max_usos_por_cliente) y
RN15 (reto completado al pasar una cita a `completada` genera descuento idempotente)."""
from datetime import timedelta

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cita import Cita, CitaServicio
from app.models.enums import EstadoCita
from app.models.fidelizacion import Descuento, DescuentoUso, Reto
from app.services import fidelizacion_service
from app.utils.timezone import ahora_lima
from tests.conftest import crear_personal_activo, crear_servicio_test, crear_usuario_cliente


async def _crear_cita_directa(db_session: AsyncSession, cliente_id, personal_id) -> Cita:
    ahora = ahora_lima()
    cita = Cita(
        cliente_id=cliente_id,
        personal_id=personal_id,
        programada_en=ahora + timedelta(days=1),
        termina_en=ahora + timedelta(days=1, minutes=60),
    )
    db_session.add(cita)
    await db_session.flush()
    return cita


@pytest.mark.asyncio
async def test_rn14_max_usos_por_cliente(db_session: AsyncSession) -> None:
    """Un descuento con max_usos_por_cliente=1 no puede aplicarse dos veces al mismo cliente,
    incluso contra citas distintas (aísla la regla del unique constraint por cita)."""
    from fastapi import HTTPException

    cliente = await crear_usuario_cliente(db_session, telefono="+51900222001")
    personal = await crear_personal_activo(db_session, nombre="Especialista RN14")
    cita_1 = await _crear_cita_directa(db_session, cliente.id, personal.id)
    cita_2 = await _crear_cita_directa(db_session, cliente.id, personal.id)

    descuento = Descuento(
        nombre="Descuento único",
        tipo="porcentaje",
        scope="publico",
        codigo="UNICO2026",
        valor=10.0,
        monto_minimo=0.0,
        max_usos_por_cliente=1,
    )
    db_session.add(descuento)
    await db_session.flush()

    primer_uso = await fidelizacion_service.aplicar_descuento(
        db_session, codigo="UNICO2026", cita_id=cita_1.id, usuario_id=cliente.usuario_id
    )
    assert primer_uso is not None

    with pytest.raises(HTTPException) as exc_info:
        await fidelizacion_service.aplicar_descuento(
            db_session, codigo="UNICO2026", cita_id=cita_2.id, usuario_id=cliente.usuario_id
        )
    assert exc_info.value.status_code == 422


@pytest.mark.asyncio
async def test_rn15_reto_completado_genera_descuento_idempotente(db_session: AsyncSession) -> None:
    """Al completar suficientes citas dentro de la ventana del reto, se genera un
    descuento premio; verificar dos veces no debe duplicarlo (ON CONFLICT DO NOTHING)."""
    cliente = await crear_usuario_cliente(db_session, telefono="+51900222002")
    personal = await crear_personal_activo(db_session, nombre="Especialista RN15")
    servicio = await crear_servicio_test(db_session, nombre="Servicio RN15")

    reto = Reto(
        nombre="3 visitas en 30 días",
        descripcion_visible="Completa 3 citas en 30 días y gana un descuento",
        visitas_requeridas=3,
        dias_ventana=30,
        recompensa_tipo="descuento",
        recompensa_valor=15.0,
    )
    db_session.add(reto)
    await db_session.flush()

    ahora = ahora_lima()
    for i in range(3):
        cita = Cita(
            cliente_id=cliente.id,
            personal_id=personal.id,
            programada_en=ahora - timedelta(days=i + 1),
            termina_en=ahora - timedelta(days=i + 1) + timedelta(minutes=60),
            estado=EstadoCita.completada,
        )
        db_session.add(cita)
        await db_session.flush()
        db_session.add(CitaServicio(
            cita_id=cita.id, servicio_id=servicio.id, precio_unitario=100.0, duracion_minutos=60,
        ))
    await db_session.flush()

    await fidelizacion_service.verificar_retos_completados(db_session, cliente.id)
    await fidelizacion_service.verificar_retos_completados(db_session, cliente.id)  # debe ser idempotente

    codigo_premio = f"RETO-{str(reto.id)[:8]}-{str(cliente.id)[:8]}"
    premios = (
        await db_session.execute(select(Descuento).where(Descuento.codigo == codigo_premio))
    ).scalars().all()
    assert len(premios) == 1
    assert premios[0].scope == "reto"
