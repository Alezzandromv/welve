from datetime import timedelta
from uuid import UUID

from app.models.cita import Cita
from app.models.cliente import Cliente
from app.models.fidelizacion import Descuento, DescuentoUso, Reto
from app.utils.timezone import ahora_lima


async def progreso_retos(cliente_id: UUID) -> list[dict]:
    cliente = await Cliente.find_one(Cliente.usuario_id == cliente_id)
    ahora = ahora_lima()
    retos = await Reto.find(Reto.esta_activo == True).to_list()
    resultado = []

    for reto in retos:
        if reto.vigente_hasta and reto.vigente_hasta < ahora:
            continue

        ventana_inicio = ahora - timedelta(days=reto.dias_ventana)
        cliente_doc_id = cliente.id if cliente else cliente_id

        citas = await Cita.find(
            Cita.cliente_id == cliente_doc_id,
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


async def descuentos_disponibles(cliente_id: UUID) -> list[Descuento]:
    ahora = ahora_lima()

    descuentos = await Descuento.find(
        Descuento.esta_activo == True,
    ).to_list()

    disponibles = []
    for desc in descuentos:
        if desc.scope not in ("publico", "reto"):
            continue
        if desc.vigente_hasta and desc.vigente_hasta < ahora:
            continue
        if desc.vigente_desde and desc.vigente_desde > ahora:
            continue

        # RN14: verificar max_usos_por_cliente
        usos = await DescuentoUso.find(
            DescuentoUso.descuento_id == desc.id,
            DescuentoUso.cliente_id == cliente_id,
        ).count()

        if usos < desc.max_usos_por_cliente:
            disponibles.append(desc)

    return disponibles


async def verificar_retos_completados(cliente_id: UUID) -> None:
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

        # Verificar si ya se otorgó el premio con código único por cliente+reto
        codigo = f"RETO-{str(reto.id)[:8]}-{str(cliente_id)[:8]}"
        existe = await Descuento.find_one(Descuento.codigo == codigo)
        if existe:
            continue

        premio = Descuento(
            nombre=f"Premio: {reto.nombre}",
            tipo="porcentaje" if reto.recompensa_tipo == "descuento" else "monto_fijo",
            scope="reto",
            codigo=codigo,
            valor=reto.recompensa_valor,
            max_usos_global=1,
            max_usos_por_cliente=1,
            vigente_desde=ahora,
            vigente_hasta=ahora + timedelta(days=90),
        )
        await premio.insert()
