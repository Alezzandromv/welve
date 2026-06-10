from uuid import UUID

from fastapi import APIRouter, Depends

from app.core.security import obtener_usuario_actual
from app.services import fidelizacion_service

router = APIRouter()


@router.get("/mis-retos")
async def mis_retos(usuario: dict = Depends(obtener_usuario_actual)) -> list:
    return await fidelizacion_service.progreso_retos(UUID(usuario["sub"]))


@router.get("/mis-descuentos")
async def mis_descuentos(usuario: dict = Depends(obtener_usuario_actual)) -> list:
    descuentos = await fidelizacion_service.descuentos_disponibles(UUID(usuario["sub"]))
    return [
        {
            "id": str(d.id),
            "nombre": d.nombre,
            "tipo": d.tipo,
            "valor": d.valor,
            "codigo": d.codigo,
            "vigente_hasta": d.vigente_hasta.isoformat() if d.vigente_hasta else None,
        }
        for d in descuentos
    ]
