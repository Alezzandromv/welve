import httpx
import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)


async def enviar_mensaje(telefono: str, mensaje: str) -> bool:
    """Envía mensaje de texto via Meta Cloud API. Retorna True si exitoso.

    Nota: se abre un `httpx.AsyncClient` por llamada (no uno cacheado a nivel de módulo)
    porque esta función se invoca tanto desde el loop de asyncio de uvicorn como desde un
    loop nuevo por invocación creado por las tasks de Celery (`tasks/_utils.py::run_async`)
    — un cliente cacheado quedaría atado al loop en que se creó y fallaría en la siguiente
    invocación desde un loop distinto ya cerrado."""
    if not settings.whatsapp_token or not settings.whatsapp_phone_id:
        logger.warning("whatsapp.no_configurado", telefono=telefono)
        return False

    url = f"https://graph.facebook.com/v20.0/{settings.whatsapp_phone_id}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "to": telefono,
        "type": "text",
        "text": {"body": mensaje},
    }
    headers = {
        "Authorization": f"Bearer {settings.whatsapp_token}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(10.0, connect=5.0)) as cliente:
            respuesta = await cliente.post(url, json=payload, headers=headers)
    except httpx.RequestError as exc:
        logger.error("whatsapp.error_red", telefono=telefono, error=str(exc))
        return False

    if respuesta.status_code == 429:
        logger.warning("whatsapp.rate_limited", telefono=telefono, retry_after=respuesta.headers.get("Retry-After"))
        return False
    if respuesta.status_code != 200:
        logger.error("whatsapp.fallo", telefono=telefono, status=respuesta.status_code, body=respuesta.text[:500])
        return False

    logger.info("whatsapp.enviado", telefono=telefono)
    return True
