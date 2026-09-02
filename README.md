# Welve

Sistema web fullstack de gestión de citas para **Eunoia Beauty Salon** (Lima, Perú). Tres
roles — Administrador, Trabajador, Cliente — con auth dual: magic link por WhatsApp para
clientes, email + contraseña para staff.

## Empezar

```bash
# Backend
cd backend
pip install -r requirements.txt
cp .env.example .env   # completar DATABASE_URL (Supabase), SECRET_KEY, etc.
alembic upgrade head
python seed.py
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend (en otra terminal)
cd frontend
npm install
npm run dev
```

Ver `CLAUDE.md` para el detalle completo de comandos, variables de entorno, y convenciones de
código.

## Documentación

- **[`CLAUDE.md`](./CLAUDE.md)** — referencia técnica operativa: stack, arquitectura de código,
  endpoints, reglas de negocio, convenciones. El punto de partida para trabajar en el código.
- **[`docs/`](./docs/README.md)** — producto, sistema de diseño, casos de uso, roles y
  permisos, roadmap de fases, y la especificación de los módulos planeados (asesoría de belleza
  con IA, fidelización avanzada con catálogo exclusivo y pasarela de pago).

## Stack

FastAPI + SQLAlchemy 2.0 async + Alembic sobre Supabase Postgres · Redis + Celery ·
React + TypeScript + Zustand + Tailwind CSS + React Router v7. Detalle completo en
`CLAUDE.md`.
