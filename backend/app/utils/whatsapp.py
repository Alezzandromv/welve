import httpx

from app.core.config import settings


async def enviar_mensaje(telefono: str, mensaje: str) -> bool:
    """Envía mensaje de texto via Meta Cloud API. Retorna True si exitoso."""
    if not settings.whatsapp_token or not settings.whatsapp_phone_id:
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

    async with httpx.AsyncClient() as cliente:
        respuesta = await cliente.post(url, json=payload, headers=headers)
        return respuesta.status_code == 200
