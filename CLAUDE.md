# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Sistema web fullstack para gestión de citas de **Eunoia Beauty Salon** (Lima, Perú). Tres roles: Administrador, Trabajador, Cliente. Autenticación sin contraseña via **Magic Link por WhatsApp**.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | FastAPI (Python 3.11+), Beanie/Motor, MongoDB Atlas |
| Queue | Redis + Celery |
| Auth | Magic Link (UUID, 1h, un solo uso) + JWT |
| Notificaciones | WhatsApp Business API (Meta Cloud API) |
| Frontend | React + TypeScript, Zustand, Tailwind CSS, React Router v6 |
| HTTP client | Axios con interceptores JWT |
| Forms | React Hook Form + Zod |
| UI | shadcn/ui, Framer Motion |
| Dev env | GitHub Codespaces, Docker Compose (Redis local; MongoDB es Atlas externo) |

---

## Comandos de Desarrollo

### Backend

```bash
# Instalar dependencias
cd backend && pip install -r requirements.txt

# Iniciar servidor de desarrollo
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Iniciar worker de Celery
celery -A app.tasks worker --loglevel=info

# Iniciar scheduler de Celery (tareas periódicas como no-show automático)
celery -A app.tasks beat --loglevel=info

# Ejecutar tests
pytest

# Ejecutar un test específico
pytest tests/test_citas.py::test_cancelacion_tardia -v

# Lint
ruff check app/
```

### Frontend

```bash
# Instalar dependencias
cd frontend && npm install

# Servidor de desarrollo
npm run dev

# Build de producción
npm run build

# Type check
npm run type-check

# Lint
npm run lint
```

### Infraestructura

```bash
# Levantar Redis local
docker compose up -d redis

# Variables de entorno — copiar y completar antes de iniciar
cp backend/.env.example backend/.env
```

### `.env` del backend

```env
MONGODB_URL=          # mongodb+srv://aleformateo22_db_user:GWTfTTkoTQOScfXh@welve.29ofesy.mongodb.net/?appName=welve
DATABASE_NAME=welve
SECRET_KEY=           # openssl rand -hex 32
ACCESS_TOKEN_EXPIRE_MINUTES=60
REDIS_URL=redis://localhost:6379
WHATSAPP_TOKEN=       # Meta Cloud API token
WHATSAPP_PHONE_ID=    # ID del número de WhatsApp Business
ENVIRONMENT=development
```

---

## Arquitectura

### Backend (`backend/app/`)

- `main.py` — registra routers, inicializa Beanie, configura CORS
- `core/` — config (Settings desde `.env`), security (JWT), database (init Beanie)
- `models/` — documentos Beanie con UUID como PK
- `schemas/` — Pydantic schemas separados de los modelos (request vs response)
- `routers/` — solo reciben request, llaman al service, devuelven response
- `services/` — toda la lógica de negocio aquí (validaciones, reglas RN01–RN15)
- `tasks/` — Celery tasks: recordatorios WhatsApp (24h, 2h), no-show automático (RN05)
- `utils/` — timezone helpers (`America/Lima`), cliente WhatsApp API

### Frontend (`frontend/src/`)

- `pages/admin/`, `pages/worker/`, `pages/client/` — vistas separadas por rol
- `store/use{Nombre}Store.ts` — Zustand stores
- `services/{recurso}.service.ts` — llamadas Axios a la API
- `types/` — interfaces TypeScript con prefijo `I` (`ICliente`, `ICita`)
- Axios interceptor adjunta JWT en cada request y redirige a login si expira

### Flujo de autenticación

1. Cliente solicita acceso con su teléfono → `POST /api/v1/auth/solicitar-acceso`
2. Backend genera token UUID, lo persiste (TTL 1h), envía link por WhatsApp
3. Cliente abre el link → `GET /api/v1/auth/verificar?token=xxx`
4. Backend valida token (no expirado, no usado), lo marca como `usado=true`, devuelve JWT
5. Frontend almacena JWT en Zustand + localStorage, lo incluye en cada request via interceptor

---

## Modelos de Datos

Las relaciones se manejan con referencias UUID (no referencias nativas Beanie) para mantener consistencia con el diseño original.

```
Usuario       id, telefono(único), nombre_completo, correo, rol, esta_activo, acepta_whatsapp
Personal      id, usuario_id→Usuario, especialidad, color_agenda(hex), comision_porcentaje, tipo_contrato
Disponibilidad id, personal_id→Personal, dia_semana(0=dom), hora_inicio, hora_fin, minutos_buffer(def 10)
Cliente       id, usuario_id→Usuario, etiquetas[], notas_internas, esta_bloqueada, motivo_bloqueo
FichaSalud    id, cliente_id→Cliente, tipo_restriccion, descripcion, severidad(informativa|moderada|critica)
Categoria     id, nombre(único), orden_visualizacion, esta_activo
Servicio      id, categoria_id→Categoria, nombre, duracion_minutos, precio, monto_deposito,
              requiere_ficha_salud, horas_cancelacion_sin_penalidad(def 5)
Cita          id, cliente_id→Cliente, personal_id→Personal, programada_en(aware Lima), termina_en,
              estado(pendiente|confirmada|en_curso|completada|cancelada|cancelada_tardia|no_show),
              hora_llegada_real, penalizacion_aplicada(bool)
CitaServicio  id, cita_id→Cita, servicio_id→Servicio, precio_unitario, duracion_minutos
Pago          id, cita_id, cliente_id, tipo(deposito|saldo|total|penalizacion|reembolso),
              metodo(efectivo|transferencia|yape|plin|tarjeta), estado(pendiente|confirmado|rechazado|reembolsado),
              monto, confirmado_por→Usuario, fecha_confirmacion
Descuento     id, tipo(porcentaje|monto_fijo), scope(publico|privado|reto), codigo(único opt),
              max_usos_global, max_usos_por_cliente, vigente_desde, vigente_hasta
Reto          id, visitas_requeridas, dias_ventana, recompensa_tipo(descuento|servicio_gratis|credito)
DescuentoUso  id, descuento_id, cliente_id, cita_id, reto_origen_id(opt), fecha_canje
MagicLink     id, usuario_id→Usuario, token(UUID único), expira_en(now+1h), usado(bool)
```

---

## Reglas de Negocio Críticas

| ID | Condición | Consecuencia |
|----|-----------|--------------|
| RN01 | Cancela con ≥ N horas (N = `servicio.horas_cancelacion_sin_penalidad`) | Estado → `cancelada`, reembolso completo |
| RN02 | Cancela con < N horas | Estado → `cancelada_tardia`, pierde depósito, `penalizacion_aplicada=true` |
| RN03 | No-show | Estado → `no_show`, pierde depósito, `penalizacion_aplicada=true` |
| RN05 | `programada_en + 15min < now()` sin `hora_llegada_real` | Celery task marca `no_show` automáticamente |
| RN08 | `servicio.requiere_ficha_salud=true` | No confirmar cita sin ficha registrada |
| RN09 | Ficha con `severidad='critica'` | Alertar a especialista antes de iniciar |
| RN11 | `cliente.esta_bloqueada=true` | Rechazar reserva con mensaje genérico |
| RN13 | Buffer entre citas | Disponibilidad: `termina_en + personal.minutos_buffer` |
| RN14 | `max_usos_por_cliente=1` (default) | Validar uso previo antes de aplicar descuento |

**N horas cancelación:** siempre leer `servicio.horas_cancelacion_sin_penalidad` — nunca hardcodear 5h.
**Depósito:** siempre leer `servicio.monto_deposito` — nunca usar valor global fijo.

---

## Endpoints Principales

```
POST   /api/v1/auth/solicitar-acceso
GET    /api/v1/auth/verificar                    # ?token=xxx → JWT
GET    /api/v1/auth/perfil

GET    /api/v1/servicios
GET    /api/v1/servicios/{id}/disponibilidad

POST   /api/v1/citas
GET    /api/v1/citas/mis-citas
PATCH  /api/v1/citas/{id}/cancelar
PATCH  /api/v1/citas/{id}/estado               # admin/trabajador

GET    /api/v1/admin/citas
GET    /api/v1/admin/pagos/pendientes
PATCH  /api/v1/admin/pagos/{id}/confirmar

GET    /api/v1/trabajador/agenda

GET    /api/v1/clientes/{id}/historial
POST   /api/v1/clientes/{id}/fichas-salud

GET    /api/v1/fidelizacion/mis-retos
GET    /api/v1/fidelizacion/mis-descuentos
```

---

## Convenciones

### General
- Todo código, variables, funciones, comentarios y commits en **español**
- IDs: UUID v4 en todos los documentos
- Toda fecha/hora: `datetime` aware con `America/Lima` (nunca naive)

### Python
- Type hints siempre; `snake_case` vars/funciones; `PascalCase` clases/modelos
- Lógica de negocio solo en `services/` — routers solo enrutan
- Errores con `HTTPException` + código HTTP descriptivo
- Verificar rol del JWT en cada endpoint protegido

### TypeScript
- Nunca `any`; `PascalCase` componentes/tipos; `camelCase` vars/funciones
- Interfaces con prefijo `I`: `ICliente`, `ICita`
- Un componente por archivo

### Commits
```
feat: agregar módulo de reservas
fix: corregir validación de magic link vencido
refactor: extraer lógica de cancelación a service
chore: actualizar dependencias
```

---

## Notas para el Agente

- Validar solapamiento de citas en backend antes de crear (`programada_en` vs `termina_en + buffer`)
- WhatsApp: enviar solo si `usuario.acepta_whatsapp = true`
- Magic link: marcar como `usado=true` al verificar; nunca reutilizar tokens
- Rol del trabajador: no exponer datos financieros ni citas de otras especialistas
- Comisión (RN15): solo registrar al completar cita, no implementar pago
