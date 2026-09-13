from datetime import timedelta
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cita import Cita
from app.models.enums import ScopeDescuento, TipoDescuento
from app.models.fidelizacion import Descuento, DescuentoUso, Reto
from app.schemas.fidelizacion import CrearDescuentoRequest, CrearRetoRequest
from app.services._comunes import cliente_por_usuario_id
from app.utils.timezone import ahora_lima


async def progreso_retos(session: AsyncSession, usuario_id: UUID) -> list[dict]:
    try:
        cliente = await cliente_por_usuario_id(session, usuario_id)
    except HTTPException:
        return []

    ahora = ahora_lima()
    retos = (await session.execute(select(Reto).where(Reto.esta_activo))).scalars().all()
    resultado = []

    for reto in retos:
        if reto.vigente_hasta and reto.vigente_hasta < ahora:
            continue

        ventana_inicio = ahora - timedelta(days=reto.dias_ventana)
        stmt = select(func.count()).select_from(Cita).where(
            Cita.cliente_id == cliente.id,
            Cita.estado == "completada",
            Cita.programada_en >= ventana_inicio,
        )
        visitas = (await session.execute(stmt)).scalar_one()

        resultado.append({
            "reto_id": str(reto.id),
            "nombre": reto.nombre,
            "descripcion": reto.descripcion_visible,
            "visitas_requeridas": reto.visitas_requeridas,
            "visitas_completadas": min(visitas, reto.visitas_requeridas),
            "completado": visitas >= reto.visitas_requeridas,
            "recompensa_tipo": reto.recompensa_tipo,
            "recompensa_valor": reto.recompensa_valor,
        })

    return resultado


async def descuentos_disponibles(session: AsyncSession, usuario_id: UUID) -> list[Descuento]:
    try:
        cliente = await cliente_por_usuario_id(session, usuario_id)
    except HTTPException:
        return []

    ahora = ahora_lima()
    descuentos = (
        await session.execute(select(Descuento).where(Descuento.esta_activo))
    ).scalars().all()
    disponibles = []

    for desc in descuentos:
        if desc.scope not in ("publico", "reto"):
            continue
        if desc.vigente_hasta and desc.vigente_hasta < ahora:
            continue
        if desc.vigente_desde and desc.vigente_desde > ahora:
            continue

        # RN14: verificar max_usos_por_cliente
        stmt = select(func.count()).select_from(DescuentoUso).where(
            DescuentoUso.descuento_id == desc.id,
            DescuentoUso.cliente_id == cliente.id,
        )
        usos = (await session.execute(stmt)).scalar_one()

        if usos < desc.max_usos_por_cliente:
            disponibles.append(desc)

    return disponibles


async def aplicar_descuento(session: AsyncSession, codigo: str, cita_id: UUID, usuario_id: UUID) -> DescuentoUso:
    """RN14: valida uso previo y límites antes de registrar el canje."""
    cliente = await cliente_por_usuario_id(session, usuario_id)

    ahora = ahora_lima()

    # SELECT ... FOR UPDATE: serializa el conteo+insert de aplicaciones concurrentes del
    # mismo código por el mismo cliente (protege RN14 bajo carga concurrente).
    descuento = (
        await session.execute(
            select(Descuento)
            .where(Descuento.codigo == codigo, Descuento.esta_activo)
            .with_for_update()
        )
    ).scalar_one_or_none()
    if not descuento:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Código de descuento inválido o inactivo")

    if descuento.vigente_desde and descuento.vigente_desde > ahora:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="El descuento aún no está vigente")
    if descuento.vigente_hasta and descuento.vigente_hasta < ahora:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="El descuento ha expirado")

    # Verificar max_usos_global
    if descuento.max_usos_global is not None:
        stmt = select(func.count()).select_from(DescuentoUso).where(DescuentoUso.descuento_id == descuento.id)
        usos_totales = (await session.execute(stmt)).scalar_one()
        if usos_totales >= descuento.max_usos_global:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Este descuento ya alcanzó el límite máximo de usos",
            )

    # RN14: verificar max_usos_por_cliente (default=1)
    stmt = select(func.count()).select_from(DescuentoUso).where(
        DescuentoUso.descuento_id == descuento.id,
        DescuentoUso.cliente_id == cliente.id,
    )
    usos_cliente = (await session.execute(stmt)).scalar_one()
    if usos_cliente >= descuento.max_usos_por_cliente:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Ya utilizaste este descuento el máximo de veces permitido",
        )

    uso = DescuentoUso(
        descuento_id=descuento.id,
        cliente_id=cliente.id,
        cita_id=cita_id,
    )
    session.add(uso)
    await session.flush()
    return uso


async def verificar_retos_completados(session: AsyncSession, cliente_id: UUID) -> None:
    """Llamada internamente al completar una cita. cliente_id es el ID del documento Cliente."""
    ahora = ahora_lima()
    retos = (await session.execute(select(Reto).where(Reto.esta_activo))).scalars().all()

    for reto in retos:
        if reto.vigente_hasta and reto.vigente_hasta < ahora:
            continue

        ventana_inicio = ahora - timedelta(days=reto.dias_ventana)
        stmt = select(func.count()).select_from(Cita).where(
            Cita.cliente_id == cliente_id,
            Cita.estado == "completada",
            Cita.programada_en >= ventana_inicio,
        )
        visitas = (await session.execute(stmt)).scalar_one()

        if visitas < reto.visitas_requeridas:
            continue

        # Premio único por cliente+reto — código compuesto (mismo esquema que antes).
        codigo_premio = f"RETO-{str(reto.id)[:8]}-{str(cliente_id)[:8]}"

        # INSERT ... ON CONFLICT DO NOTHING sobre el UNIQUE parcial de `descuentos.codigo`:
        # idempotente a nivel de DB, elimina la condición de carrera del antiguo
        # check-then-insert (find_one + insert).
        stmt_insert = (
            pg_insert(Descuento)
            .values(
                nombre=f"Premio: {reto.nombre}",
                tipo=(TipoDescuento.porcentaje if reto.recompensa_tipo == "descuento" else TipoDescuento.monto_fijo).value,
                scope=ScopeDescuento.reto.value,
                codigo=codigo_premio,
                valor=reto.recompensa_valor,
                max_usos_global=1,
                max_usos_por_cliente=1,
                vigente_desde=ahora,
                vigente_hasta=ahora + timedelta(days=90),
            )
            .on_conflict_do_nothing(index_elements=["codigo"], index_where=text("codigo IS NOT NULL"))
        )
        await session.execute(stmt_insert)


# ── Admin ─────────────────────────────────────────────────────────────────────

async def crear_descuento(session: AsyncSession, body: CrearDescuentoRequest) -> Descuento:
    if body.codigo:
        existente = (await session.execute(select(Descuento).where(Descuento.codigo == body.codigo))).scalar_one_or_none()
        if existente:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ya existe un descuento con ese código",
            )

    descuento = Descuento(**body.model_dump())
    session.add(descuento)
    try:
        await session.flush()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe un descuento con ese código") from None
    return descuento


async def crear_reto(session: AsyncSession, body: CrearRetoRequest) -> Reto:
    reto = Reto(**body.model_dump())
    session.add(reto)
    await session.flush()
    return reto


async def listar_descuentos(session: AsyncSession, limit: int = 50, offset: int = 0) -> list[Descuento]:
    stmt = select(Descuento).order_by(Descuento.creado_en.desc()).limit(limit).offset(offset)
    return list((await session.execute(stmt)).scalars().all())


async def listar_retos(session: AsyncSession, limit: int = 50, offset: int = 0) -> list[Reto]:
    stmt = select(Reto).order_by(Reto.creado_en.desc()).limit(limit).offset(offset)
    return list((await session.execute(stmt)).scalars().all())
