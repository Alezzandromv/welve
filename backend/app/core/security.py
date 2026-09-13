from datetime import datetime, timedelta
from uuid import UUID

import bcrypt as _bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_session
from app.models.cliente import Cliente
from app.models.usuario import Usuario
from app.utils.timezone import LIMA_TZ

ALGORITHM = "HS256"

bearer_scheme = HTTPBearer()


def hash_password(password: str) -> str:
    return _bcrypt.hashpw(password.encode(), _bcrypt.gensalt()).decode()


def verificar_password(plain: str, hashed: str) -> bool:
    return _bcrypt.checkpw(plain.encode(), hashed.encode())


def crear_access_token(user_id: UUID, rol: str, nombre: str) -> str:
    expira = datetime.now(LIMA_TZ) + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {
        "sub": str(user_id),
        "rol": rol,
        "nombre": nombre,
        "exp": expira,
    }
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def decodificar_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
        ) from None


async def obtener_usuario_actual(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Decodifica el JWT y revalida contra la DB que la cuenta siga activa (y, para
    clientes, no bloqueada) — sin esto, desactivar/bloquear a un usuario no tiene efecto
    hasta que su token expire (hasta `access_token_expire_minutes`)."""
    payload = decodificar_token(credentials.credentials)

    usuario = await session.get(Usuario, UUID(payload["sub"]))
    if not usuario or not usuario.esta_activo:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Cuenta inactiva o inexistente")
    if usuario.rol.value != payload.get("rol"):
        # El rol cambió desde que se emitió el token (ej. admin lo reasignó) — forzar re-login.
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token desactualizado, vuelve a iniciar sesión")

    if payload.get("rol") == "cliente":
        cliente = (await session.execute(select(Cliente).where(Cliente.usuario_id == usuario.id))).scalar_one_or_none()
        if cliente and cliente.esta_bloqueada:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cuenta bloqueada")

    return payload


def requerir_rol(*roles: str):
    async def dependencia(usuario: dict = Depends(obtener_usuario_actual)) -> dict:
        if usuario.get("rol") not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acceso no autorizado",
            )
        return usuario

    return dependencia
