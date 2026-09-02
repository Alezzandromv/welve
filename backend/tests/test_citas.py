"""Tests de reglas de negocio del módulo de citas: RN01/RN02 (cancelación con/sin
penalidad), RN09 (ficha crítica al iniciar cita) y RN13 (buffer/solapamiento)."""
import uuid
from datetime import timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cliente import FichaSalud
from app.models.enums import SeveridadFicha
from app.utils.timezone import ahora_lima
from tests.conftest import crear_personal_activo, crear_servicio_test, crear_usuario_cliente, token_para


async def _crear_cita(
    client: AsyncClient, cliente_token: str, personal_id, servicio_id, programada_en
) -> dict:
    respuesta = await client.post(
        "/api/v1/citas",
        json={
            "personal_id": str(personal_id),
            "servicio_ids": [str(servicio_id)],
            "programada_en": programada_en.isoformat(),
        },
        headers={"Authorization": f"Bearer {cliente_token}"},
    )
    assert respuesta.status_code == 201, respuesta.text
    return respuesta.json()


@pytest.mark.asyncio
async def test_cancelacion_a_tiempo_sin_penalidad(client: AsyncClient, db_session: AsyncSession) -> None:
    """RN01: cancela con >= horas_cancelacion_sin_penalidad del servicio → cancelada, sin penalidad."""
    cliente = await crear_usuario_cliente(db_session, telefono="+51900111001")
    personal = await crear_personal_activo(db_session, nombre="Especialista RN01")
    servicio = await crear_servicio_test(db_session, nombre="Servicio RN01", horas_cancelacion_sin_penalidad=5)
    cliente_token = token_para(cliente.usuario_id, "cliente")

    programada_en = ahora_lima() + timedelta(hours=6)
    cita = await _crear_cita(client, cliente_token, personal.id, servicio.id, programada_en)

    respuesta = await client.patch(
        f"/api/v1/citas/{cita['id']}/cancelar",
        json={"motivo_cancelacion": "cambio de planes"},
        headers={"Authorization": f"Bearer {cliente_token}"},
    )
    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["estado"] == "cancelada"
    assert cuerpo["penalizacion_aplicada"] is False


@pytest.mark.asyncio
async def test_cancelacion_tardia_con_penalidad(client: AsyncClient, db_session: AsyncSession) -> None:
    """RN02: cancela con < horas_cancelacion_sin_penalidad → cancelada_tardia, pierde depósito."""
    cliente = await crear_usuario_cliente(db_session, telefono="+51900111002")
    personal = await crear_personal_activo(db_session, nombre="Especialista RN02")
    servicio = await crear_servicio_test(db_session, nombre="Servicio RN02", horas_cancelacion_sin_penalidad=5)
    cliente_token = token_para(cliente.usuario_id, "cliente")

    programada_en = ahora_lima() + timedelta(hours=2)
    cita = await _crear_cita(client, cliente_token, personal.id, servicio.id, programada_en)

    respuesta = await client.patch(
        f"/api/v1/citas/{cita['id']}/cancelar",
        json={"motivo_cancelacion": "ya no puedo asistir"},
        headers={"Authorization": f"Bearer {cliente_token}"},
    )
    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["estado"] == "cancelada_tardia"
    assert cuerpo["penalizacion_aplicada"] is True


@pytest.mark.asyncio
async def test_ficha_critica_bloquea_inicio_sin_confirmar(client: AsyncClient, db_session: AsyncSession) -> None:
    """RN09: iniciar cita (→ en_curso) con ficha crítica activa sin `confirmar_ficha_critica`
    debe devolver 422 con codigo FICHA_CRITICA; reintentar confirmando debe permitir avanzar."""
    cliente = await crear_usuario_cliente(db_session, telefono="+51900111003")
    personal = await crear_personal_activo(db_session, nombre="Especialista RN09")
    servicio = await crear_servicio_test(db_session, nombre="Servicio RN09")
    cliente_token = token_para(cliente.usuario_id, "cliente")
    admin_token = token_para(uuid.uuid4(), "admin")  # admin puede operar cualquier cita, sin importar el asignado

    db_session.add(FichaSalud(
        cliente_id=cliente.id,
        tipo_restriccion="alergia",
        descripcion="Alergia severa a tinte capilar",
        severidad=SeveridadFicha.critica,
    ))
    await db_session.flush()

    programada_en = ahora_lima() + timedelta(hours=3)
    cita = await _crear_cita(client, cliente_token, personal.id, servicio.id, programada_en)

    # confirmar primero (pendiente -> confirmada) para poder pasar a en_curso
    confirmar = await client.patch(
        f"/api/v1/citas/{cita['id']}/estado",
        json={"estado": "confirmada"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert confirmar.status_code == 200

    bloqueado = await client.patch(
        f"/api/v1/citas/{cita['id']}/estado",
        json={"estado": "en_curso"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert bloqueado.status_code == 422
    detalle = bloqueado.json()["detail"]
    assert detalle["codigo"] == "FICHA_CRITICA"

    permitido = await client.patch(
        f"/api/v1/citas/{cita['id']}/estado",
        json={"estado": "en_curso", "confirmar_ficha_critica": True},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert permitido.status_code == 200
    assert permitido.json()["estado"] == "en_curso"


@pytest.mark.asyncio
async def test_solapamiento_de_horario_rechazado(client: AsyncClient, db_session: AsyncSession) -> None:
    """RN13: dos citas en el mismo horario para la misma especialista deben chocar (409)."""
    cliente1 = await crear_usuario_cliente(db_session, telefono="+51900111004")
    cliente2 = await crear_usuario_cliente(db_session, telefono="+51900111005")
    personal = await crear_personal_activo(db_session, nombre="Especialista RN13")
    servicio = await crear_servicio_test(db_session, nombre="Servicio RN13", duracion_minutos=60)

    token1 = token_para(cliente1.usuario_id, "cliente")
    token2 = token_para(cliente2.usuario_id, "cliente")

    programada_en = ahora_lima() + timedelta(days=3)
    await _crear_cita(client, token1, personal.id, servicio.id, programada_en)

    respuesta = await client.post(
        "/api/v1/citas",
        json={
            "personal_id": str(personal.id),
            "servicio_ids": [str(servicio.id)],
            "programada_en": programada_en.isoformat(),
        },
        headers={"Authorization": f"Bearer {token2}"},
    )
    assert respuesta.status_code == 409
