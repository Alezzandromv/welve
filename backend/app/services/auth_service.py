from datetime import timedelta
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import crear_access_token, hash_password, verificar_password
from app.models.auth import MagicLink
from app.models.cliente import Cliente
from app.models.enums import RolUsuario
from app.models.usuario import Usuario
from app.utils.timezone import ahora_lima
from app.utils.whatsapp import enviar_mensaje


async def solicitar_magic_link(session: AsyncSession, telefono: str) -> dict:
    usuario = (await session.execute(select(Usuario).where(Usuario.telefono == telefono))).scalar_one_or_none()
    if not usuario:
        usuario = Usuario(
            telefono=telefono,
            nombre_completo=telefono,
            rol=RolUsuario.cliente,
        )
        session.add(usuario)
        try:
            await session.flush()
            session.add(Cliente(usuario_id=usuario.id))
            await session.flush()
        except IntegrityError:
            # Carrera: otro request registró el mismo teléfono primero.
            await session.rollback()
            usuario = (await session.execute(select(Usuario).where(Usuario.telefono == telefono))).scalar_one()

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
    session.add(link)
    await session.flush()

    url = f"{settings.app_url}/auth?token={link.token}"
    if usuario.acepta_whatsapp:
        mensaje = (
            f"Hola! Aquí tu enlace de acceso a Eunoia Beauty Salon "
            f"(válido 1 hora):\n{url}"
        )
        await enviar_mensaje(telefono, mensaje)

    return {"mensaje": "Enlace enviado por WhatsApp"}


async def verificar_magic_link(session: AsyncSession, token_str: str) -> dict:
    try:
        token_uuid = UUID(token_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token inválido",
        ) from None

    link = (await session.execute(select(MagicLink).where(MagicLink.token == token_uuid))).scalar_one_or_none()
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

    # UPDATE atómico condicionado a usado=false — evita reuso concurrente del mismo token
    # (equivalente relacional del antiguo patrón read-then-write).
    resultado = await session.execute(
        update(MagicLink)
        .where(MagicLink.id == link.id, MagicLink.usado.is_(False))
        .values(usado=True)
        .returning(MagicLink.usuario_id)
    )
    fila = resultado.first()
    if fila is None:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Token ya utilizado")
    usuario_id = fila.usuario_id

    usuario = await session.get(Usuario, usuario_id)
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado",
        )

    token = crear_access_token(usuario.id, usuario.rol.value, usuario.nombre_completo)
    return {
        "access_token": token,
        "token_type": "bearer",
        "rol": usuario.rol.value,
        "nombre": usuario.nombre_completo,
    }


async def registrar_staff(
    session: AsyncSession,
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

    existente = (await session.execute(select(Usuario).where(Usuario.correo == correo))).scalar_one_or_none()
    if existente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El correo ya está registrado",
        )

    usuario = Usuario(
        nombre_completo=nombre_completo,
        correo=correo,
        hashed_password=hash_password(contrasena),
        rol=RolUsuario(rol),
    )
    session.add(usuario)
    await session.flush()

    token = crear_access_token(usuario.id, usuario.rol.value, usuario.nombre_completo)
    return {
        "access_token": token,
        "token_type": "bearer",
        "rol": usuario.rol.value,
        "nombre_completo": usuario.nombre_completo,
        "usuario_id": str(usuario.id),
    }


async def login_staff(session: AsyncSession, correo: str, contrasena: str) -> dict:
    usuario = (await session.execute(select(Usuario).where(Usuario.correo == correo))).scalar_one_or_none()

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

    token = crear_access_token(usuario.id, usuario.rol.value, usuario.nombre_completo)
    return {
        "access_token": token,
        "token_type": "bearer",
        "rol": usuario.rol.value,
        "nombre_completo": usuario.nombre_completo,
        "usuario_id": str(usuario.id),
    }


async def obtener_perfil(session: AsyncSession, user_id: str) -> Usuario:
    usuario = await session.get(Usuario, UUID(user_id))
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado",
        )
    return usuario


async def actualizar_perfil(
    session: AsyncSession, user_id: UUID, nombre_completo: str | None, correo: str | None, telefono: str | None
) -> Usuario:
    usuario = await session.get(Usuario, user_id)
    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    if nombre_completo is not None:
        usuario.nombre_completo = nombre_completo.strip()

    if correo is not None:
        existente = (await session.execute(select(Usuario).where(Usuario.correo == correo))).scalar_one_or_none()
        if existente and existente.id != user_id:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El correo ya está registrado por otro usuario")
        usuario.correo = correo

    if telefono is not None:
        telefono_val = telefono.strip() or None
        if telefono_val:
            existente = (await session.execute(select(Usuario).where(Usuario.telefono == telefono_val))).scalar_one_or_none()
            if existente and existente.id != user_id:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El teléfono ya está registrado por otro usuario")
        usuario.telefono = telefono_val

    usuario.actualizado_en = ahora_lima()
    await session.flush()
    return usuario


async def cambiar_password(session: AsyncSession, user_id: UUID, password_actual: str, password_nueva: str) -> dict:
    usuario = await session.get(Usuario, user_id)
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
    await session.flush()
    return {"mensaje": "Contraseña actualizada correctamente"}
