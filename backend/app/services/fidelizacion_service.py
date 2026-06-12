from datetime import timedelta
from uuid import UUID

from fastapi import HTTPException, status

from app.models.cita import Cita
from app.models.cliente import Cliente
from app.models.fidelizacion import Descuento, DescuentoUso, Reto
from app.schemas.fidelizacion import CrearDescuentoRequest, CrearRetoRequest
from app.utils.timezone import ahora_lima


async def progreso_retos(usuario_id: UUID) -> list[dict]:
    cliente = await Cliente.find_one(Cliente.usuario_id == usuario_id)
    if not cliente:
        return []

    ahora = ahora_lima()
    retos = await Reto.find(Reto.esta_activo == True).to_list()
    resultado = []

    for reto in retos:
        if reto.vigente_hasta and reto.vigente_hasta < ahora:
            continue

        ventana_inicio = ahora - timedelta(days=reto.dias_ventana)
        citas = await Cita.find(
            Cita.cliente_id == cliente.id,
            Cita.estado == "completada",
            Cita.programada_en >= ventana_inicio,
        ).to_list()

        visitas = len(citas)
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


async def descuentos_disponibles(usuario_id: UUID) -> list[Descuento]:
    cliente = await Cliente.find_one(Cliente.usuario_id == usuario_id)
    if not cliente:
        return []

    ahora = ahora_lima()
    descuentos = await Descuento.find(Descuento.esta_activo == True).to_list()
    disponibles = []

    for desc in descuentos:
        if desc.scope not in ("publico", "reto"):
            continue
        if desc.vigente_hasta and desc.vigente_hasta < ahora:
            continue
        if desc.vigente_desde and desc.vigente_desde > ahora:
            continue

        # RN14: verificar max_usos_por_cliente usando el ID del documento Cliente
        usos = await DescuentoUso.find(
            DescuentoUso.descuento_id == desc.id,
            DescuentoUso.cliente_id == cliente.id,
        ).count()

        if usos < desc.max_usos_por_cliente:
            disponibles.append(desc)

    return disponibles


async def aplicar_descuento(codigo: str, cita_id: UUID, usuario_id: UUID) -> DescuentoUso:
    """RN14: valida uso previo y límites antes de registrar el canje."""
    cliente = await Cliente.find_one(Cliente.usuario_id == usuario_id)
    if not cliente:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Perfil de cliente no encontrado")

    ahora = ahora_lima()

    descuento = await Descuento.find_one(
        Descuento.codigo == codigo,
        Descuento.esta_activo == True,
    )
    if not descuento:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Código de descuento inválido o inactivo")

    if descuento.vigente_desde and descuento.vigente_desde > ahora:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="El descuento aún no está vigente")
    if descuento.vigente_hasta and descuento.vigente_hasta < ahora:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="El descuento ha expirado")

    # Verificar max_usos_global
    if descuento.max_usos_global is not None:
        usos_totales = await DescuentoUso.find(DescuentoUso.descuento_id == descuento.id).count()
        if usos_totales >= descuento.max_usos_global:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Este descuento ya alcanzó el límite máximo de usos",
            )

    # RN14: verificar max_usos_por_cliente (default=1)
    usos_cliente = await DescuentoUso.find(
        DescuentoUso.descuento_id == descuento.id,
        DescuentoUso.cliente_id == cliente.id,
    ).count()
    if usos_cliente >= descuento.max_usos_por_cliente:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Ya utilizaste este descuento el máximo de veces permitido",
        )

    uso = DescuentoUso(
        descuento_id=descuento.id,
        cliente_id=cliente.id,
        cita_id=cita_id,
    )
    await uso.insert()
    return uso


async def verificar_retos_completados(cliente_id: UUID) -> None:
    """Llamada internamente al completar una cita. cliente_id es el ID del documento Cliente."""
    ahora = ahora_lima()
    retos = await Reto.find(Reto.esta_activo == True).to_list()

    for reto in retos:
        if reto.vigente_hasta and reto.vigente_hasta < ahora:
            continue

        ventana_inicio = ahora - timedelta(days=reto.dias_ventana)
        citas = await Cita.find(
            Cita.cliente_id == cliente_id,
            Cita.estado == "completada",
            Cita.programada_en >= ventana_inicio,
        ).to_list()

        if len(citas) < reto.visitas_requeridas:
            continue

        # Premio único por cliente+reto — código compuesto garantiza idempotencia
        codigo_premio = f"RETO-{str(reto.id)[:8]}-{str(cliente_id)[:8]}"
        if await Descuento.find_one(Descuento.codigo == codigo_premio):
            continue

        premio = Descuento(
            nombre=f"Premio: {reto.nombre}",
            tipo="porcentaje" if reto.recompensa_tipo == "descuento" else "monto_fijo",
            scope="reto",
            codigo=codigo_premio,
            valor=reto.recompensa_valor,
            max_usos_global=1,
            max_usos_por_cliente=1,
            vigente_desde=ahora,
            vigente_hasta=ahora + timedelta(days=90),
        )
        await premio.insert()


# ── Admin ─────────────────────────────────────────────────────────────────────

async def crear_descuento(body: CrearDescuentoRequest) -> Descuento:
    if body.codigo:
        existente = await Descuento.find_one(Descuento.codigo == body.codigo)
        if existente:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ya existe un descuento con ese código",
            )

    descuento = Descuento(**body.model_dump())
    await descuento.insert()
    return descuento


async def crear_reto(body: CrearRetoRequest) -> Reto:
    reto = Reto(**body.model_dump())
    await reto.insert()
    return reto


async def listar_descuentos() -> list[Descuento]:
    return await Descuento.find_all().to_list()


async def listar_retos() -> list[Reto]:
    return await Reto.find_all().to_list()
