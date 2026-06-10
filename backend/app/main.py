from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import init_db
from app.routers import admin, auth, citas, clientes, fidelizacion, servicios, trabajador


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="Welve API",
    description="Sistema de gestión de citas — Eunoia Beauty Salon",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"https://.*\.app\.github\.dev",
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


@app.get("/health")
async def health():
    return {"status": "ok"}
