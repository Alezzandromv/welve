from fastapi import APIRouter, Depends

from app.core.security import obtener_usuario_actual
from app.schemas.auth import (
    LoginStaffRequest,
    PerfilResponse,
    RegistroStaffRequest,
    SolicitarAccesoRequest,
    SolicitarAccesoResponse,
    TokenResponse,
    VerificarTokenResponse,
)
from app.services import auth_service

router = APIRouter()


@router.post("/solicitar-acceso", response_model=SolicitarAccesoResponse)
async def solicitar_acceso(body: SolicitarAccesoRequest) -> SolicitarAccesoResponse:
    resultado = await auth_service.solicitar_magic_link(body.telefono)
    return SolicitarAccesoResponse(**resultado)


@router.get("/verificar", response_model=VerificarTokenResponse)
async def verificar_token(token: str) -> VerificarTokenResponse:
    resultado = await auth_service.verificar_magic_link(token)
    return VerificarTokenResponse(**resultado)


@router.post("/registrar", response_model=TokenResponse, status_code=201)
async def registrar(body: RegistroStaffRequest) -> TokenResponse:
    resultado = await auth_service.registrar_staff(
        nombre_completo=body.nombre_completo,
        correo=body.correo,
        contrasena=body.contrasena,
        rol=body.rol,
    )
    return TokenResponse(**resultado)


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginStaffRequest) -> TokenResponse:
    resultado = await auth_service.login_staff(
        correo=body.correo,
        contrasena=body.contrasena,
    )
    return TokenResponse(**resultado)


@router.get("/perfil", response_model=PerfilResponse)
async def perfil(usuario: dict = Depends(obtener_usuario_actual)) -> PerfilResponse:
    usuario_db = await auth_service.obtener_perfil(usuario["sub"])
    return PerfilResponse(
        id=usuario_db.id,
        nombre_completo=usuario_db.nombre_completo,
        telefono=usuario_db.telefono,
        correo=usuario_db.correo,
        rol=usuario_db.rol,
        foto_perfil_url=usuario_db.foto_perfil_url,
        acepta_whatsapp=usuario_db.acepta_whatsapp,
    )
