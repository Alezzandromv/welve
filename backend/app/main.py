import uuid
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from sqlalchemy.exc import IntegrityError
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings
from app.core.database import engine, verificar_conexion
from app.core.logging import configurar_logging
from app.core.ratelimit import limiter
from app.routers import (
    admin,
    auth,
    citas,
    clientes,
    fidelizacion,
    servicios,
    trabajador,
    usuarios,
)

configurar_logging(settings.environment)
logger = structlog.get_logger(__name__)


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Asigna un `request_id` (propio o del header `X-Request-ID` del caller) a cada
    request y lo propaga a los logs vía contextvars de structlog — permite correlacionar
    todos los eventos de un mismo request en logs estructurados."""

    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=request_id, path=request.url.path, method=request.method)
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    await verificar_conexion()
    yield
    await engine.dispose()


_es_produccion = settings.environment == "production"

app = FastAPI(
    title="Welve API",
    description="Sistema de gestión de citas — Eunoia Beauty Salon",
    version="0.1.0",
    lifespan=lifespan,
    docs_url=None if _es_produccion else "/docs",
    redoc_url=None if _es_produccion else "/redoc",
    openapi_url=None if _es_produccion else "/openapi.json",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(RequestIDMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    # El regex de Codespaces solo tiene sentido en desarrollo — en producción aceptaría
    # con credenciales cualquier subdominio *.app.github.dev de cualquier usuario de GitHub.
    allow_origin_regex=None if _es_produccion else r"https://.*\.app\.github\.dev",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(servicios.router, prefix="/api/v1/servicios", tags=["servicios"])
app.include_router(citas.router, prefix="/api/v1/citas", tags=["citas"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["admin"])
app.include_router(trabajador.router, prefix="/api/v1/trabajador", tags=["trabajador"])
app.include_router(clientes.router, prefix="/api/v1/clientes", tags=["clientes"])
app.include_router(fidelizacion.router, prefix="/api/v1/fidelizacion", tags=["fidelizacion"])
app.include_router(usuarios.router, prefix="/api/v1/admin/usuarios", tags=["usuarios"])


@app.exception_handler(IntegrityError)
async def integrity_error_handler(request: Request, exc: IntegrityError) -> JSONResponse:
    """Red de seguridad transversal: cualquier violación de restricción única que no haya
    sido capturada explícitamente en el service (ver los try/except puntuales en
    usuarios_service, personal_service, servicios_service, fidelizacion_service) cae aquí
    en vez de propagar un 500 genérico bajo requests concurrentes."""
    logger.warning("integrity_error", path=request.url.path, detalle=str(exc.orig))
    return JSONResponse(
        status_code=409,
        content={"detail": "El recurso ya existe o viola una restricción de unicidad"},
    )


@app.exception_handler(Exception)
async def excepcion_no_manejada_handler(request: Request, exc: Exception) -> JSONResponse:
    """Cualquier excepción no anticipada queda registrada con stacktrace antes de devolver
    un 500 genérico — sin esto, un fallo en producción no dejaba ningún rastro."""
    logger.exception("excepcion_no_manejada", path=request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Error interno del servidor"})


@app.get("/health")
async def health():
    try:
        await verificar_conexion()
    except Exception:
        logger.exception("health_check_failed")
        return JSONResponse(status_code=503, content={"status": "degraded", "database": "down"})
    return {"status": "ok", "database": "up"}
