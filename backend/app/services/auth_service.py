from datetime import timedelta
from uuid import UUID

from fastapi import HTTPException, status

from app.core.config import settings
from app.core.security import crear_access_token, hash_password, verificar_password
from app.models.auth import MagicLink
from app.models.usuario import Usuario
from app.utils.timezone import ahora_lima
from app.utils.whatsapp import enviar_mensaje


async def solicitar_magic_link(telefono: str) -> dict:
    usuario = await Usuario.find_one(Usuario.telefono == telefono)
    if not usuario:
        usuario = Usuario(
            telefono=telefono,
            nombre_completo=telefono,
            rol="cliente",
        )
        await usuario.insert()

    if not usuario.esta_activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cuenta inactiva",
        )

    ahora = ahora_lima()
    link = MagicLink(
        usuario_id=usuario.id,
        expira_en=ahora + timedelta(hours=1),
    )
    await link.insert()

    url = f"{settings.app_url}/auth?token={link.token}"
    if usuario.acepta_whatsapp:
        mensaje = (
            f"Hola! Aquí tu enlace de acceso a Eunoia Beauty Salon "
            f"(válido 1 hora):\n{url}"
        )
        await enviar_mensaje(telefono, mensaje)

    return {"mensaje": "Enlace enviado por WhatsApp"}


async def verificar_magic_link(token_str: str) -> dict:
    try:
        token_uuid = UUID(token_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token inválido",
        )

    link = await MagicLink.find_one(MagicLink.token == token_uuid)
    if not link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token no encontrado",
        )

    if link.usado:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Token ya utilizado",
        )

    if link.expira_en < ahora_lima():
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Token expirado",
        )

    # Marcar como usado — nunca reutilizar
    link.usado = True
    await link.save()

    usuario = await Usuario.get(link.usuario_id)
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado",
        )

    token = crear_access_token(usuario.id, usuario.rol, usuario.nombre_completo)
    return {
        "access_token": token,
        "token_type": "bearer",
        "rol": usuario.rol,
        "nombre": usuario.nombre_completo,
    }


async def registrar_staff(
    nombre_completo: str,
    correo: str,
    contrasena: str,
    rol: str,
) -> dict:
    if rol not in ("admin", "trabajador"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo se puede registrar personal con rol admin o trabajador",
        )

    existente = await Usuario.find_one(Usuario.correo == correo)
    if existente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El correo ya está registrado",
        )

    usuario = Usuario(
        nombre_completo=nombre_completo,
        correo=correo,
        hashed_password=hash_password(contrasena),
        rol=rol,
    )
    await usuario.insert()

    token = crear_access_token(usuario.id, usuario.rol, usuario.nombre_completo)
    return {
        "access_token": token,
        "token_type": "bearer",
        "rol": usuario.rol,
        "nombre_completo": usuario.nombre_completo,
        "usuario_id": str(usuario.id),
    }


async def login_staff(correo: str, contrasena: str) -> dict:
    usuario = await Usuario.find_one(Usuario.correo == correo)

    if not usuario or usuario.hashed_password is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
        )

    if not verificar_password(contrasena, usuario.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
        )

    if not usuario.esta_activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cuenta inactiva",
        )

    token = crear_access_token(usuario.id, usuario.rol, usuario.nombre_completo)
    return {
        "access_token": token,
        "token_type": "bearer",
        "rol": usuario.rol,
        "nombre_completo": usuario.nombre_completo,
        "usuario_id": str(usuario.id),
    }


async def obtener_perfil(user_id: str) -> Usuario:
    usuario = await Usuario.get(UUID(user_id))
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado",
        )
    return usuario


async def actualizar_perfil(user_id: UUID, nombre_completo: str | None, correo: str | None, telefono: str | None) -> Usuario:
    usuario = await Usuario.get(user_id)
    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    if nombre_completo is not None:
        usuario.nombre_completo = nombre_completo.strip()

    if correo is not None:
        existente = await Usuario.find_one(Usuario.correo == correo)
        if existente and existente.id != user_id:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El correo ya está registrado por otro usuario")
        usuario.correo = correo

    if telefono is not None:
        telefono_val = telefono.strip() or None
        if telefono_val:
            existente = await Usuario.find_one(Usuario.telefono == telefono_val)
            if existente and existente.id != user_id:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El teléfono ya está registrado por otro usuario")
        usuario.telefono = telefono_val

    usuario.actualizado_en = ahora_lima()
    await usuario.save()
    return usuario


async def cambiar_password(user_id: UUID, password_actual: str, password_nueva: str) -> dict:
    usuario = await Usuario.get(user_id)
    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    if not usuario.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esta cuenta usa magic link y no tiene contraseña configurada",
        )

    if not verificar_password(password_actual, usuario.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Contraseña actual incorrecta")

    usuario.hashed_password = hash_password(password_nueva)
    usuario.actualizado_en = ahora_lima()
    await usuario.save()
    return {"mensaje": "Contraseña actualizada correctamente"}
