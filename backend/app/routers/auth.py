from uuid import UUID

from fastapi import APIRouter, Depends

from app.core.security import obtener_usuario_actual
from app.schemas.auth import (
    ActualizarPerfilRequest,
    CambiarPasswordRequest,
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
    u = await auth_service.obtener_perfil(usuario["sub"])
    return PerfilResponse(
        id=u.id,
        nombre_completo=u.nombre_completo,
        telefono=u.telefono,
        correo=u.correo,
        rol=u.rol,
        foto_perfil_url=u.foto_perfil_url,
        acepta_whatsapp=u.acepta_whatsapp,
        fecha_creacion=u.fecha_creacion,
        ultimo_acceso=u.ultimo_acceso,
    )


@router.patch("/perfil", response_model=PerfilResponse)
async def actualizar_perfil(
    body: ActualizarPerfilRequest,
    usuario: dict = Depends(obtener_usuario_actual),
) -> PerfilResponse:
    u = await auth_service.actualizar_perfil(
        user_id=UUID(usuario["sub"]),
        nombre_completo=body.nombre_completo,
        correo=body.correo,
        telefono=body.telefono,
    )
    return PerfilResponse(
        id=u.id,
        nombre_completo=u.nombre_completo,
        telefono=u.telefono,
        correo=u.correo,
        rol=u.rol,
        foto_perfil_url=u.foto_perfil_url,
        acepta_whatsapp=u.acepta_whatsapp,
        fecha_creacion=u.fecha_creacion,
        ultimo_acceso=u.ultimo_acceso,
    )


@router.post("/cambiar-password")
async def cambiar_password(
    body: CambiarPasswordRequest,
    usuario: dict = Depends(obtener_usuario_actual),
) -> dict:
    return await auth_service.cambiar_password(
        user_id=UUID(usuario["sub"]),
        password_actual=body.password_actual,
        password_nueva=body.password_nueva,
    )
