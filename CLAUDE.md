# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Sistema web fullstack para gestión de citas de **Eunoia Beauty Salon** (Lima, Perú). Tres roles: Administrador, Trabajador, Cliente. Auth dual: **Magic Link por WhatsApp** para clientes, **email + contraseña** para admin/trabajador.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | FastAPI (Python 3.11+), Beanie/Motor, MongoDB Atlas |
| Queue | Redis + Celery |
| Auth | Clientes: Magic Link vía WhatsApp (UUID, 1h, un solo uso) → JWT. Staff: email + contraseña → JWT |
| Notificaciones | WhatsApp Business API (Meta Cloud API) |
| Frontend | React + TypeScript, Zustand, Tailwind CSS, React Router v7 |
| HTTP client | Axios con interceptores JWT |
| Forms | React Hook Form + Zod |
| UI | Framer Motion, lucide-react (shadcn/ui planeado pero no instalado aún) |
| Dev env | GitHub Codespaces, Docker Compose (Redis local; MongoDB es Atlas externo) |

---

## Comandos de Desarrollo

Todos los comandos de backend deben ejecutarse desde `backend/` (el módulo `app` es relativo a ese directorio y el `.env` se carga desde ahí).

### Backend

```bash
# Instalar dependencias
cd backend && pip install -r requirements.txt

# Iniciar servidor de desarrollo
cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Iniciar worker de Celery
cd backend && celery -A app.tasks worker --loglevel=info

# Iniciar scheduler de Celery (tareas periódicas como no-show automático)
cd backend && celery -A app.tasks beat --loglevel=info

# Poblar la base de datos con datos de demostración (limpia y repuebla)
cd backend && python seed.py

# Ejecutar tests (directorio tests/ aún vacío — por escribir)
cd backend && pytest

# Lint
cd backend && ruff check app/
```

### Frontend

```bash
# Instalar dependencias
cd frontend && npm install

# Servidor de desarrollo
cd frontend && npm run dev

# Build de producción (incluye type check)
cd frontend && npm run build

# Type check sin build
cd frontend && npx tsc --noEmit

# Lint
cd frontend && npm run lint
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
MONGODB_URL=          # mongodb+srv://...
DATABASE_NAME=welve
SECRET_KEY=           # openssl rand -hex 32
ACCESS_TOKEN_EXPIRE_MINUTES=60
REDIS_URL=redis://localhost:6379
WHATSAPP_TOKEN=       # Meta Cloud API token
WHATSAPP_PHONE_ID=    # ID del número de WhatsApp Business
APP_URL=              # URL pública del frontend (usada en el magic link enviado por WhatsApp)
ENVIRONMENT=development
```

### `.env` del frontend

```env
VITE_API_URL=         # URL pública del backend, ej. https://*.app.github.dev
```

En Codespaces, el CORS del backend ya acepta `*.app.github.dev` via regex; solo ajustar `VITE_API_URL` y `APP_URL` al tunnel activo.

### Credenciales de desarrollo (tras ejecutar `seed.py`)

```
Admin:    correo admin@eunoia.pe / contraseña welve2026  (POST /auth/login)
Workers:  sofia@eunoia.pe, valeria@eunoia.pe, camila@eunoia.pe / contraseña welve2026
Clientes: magic link via WhatsApp — sin contraseña
```

---

## Arquitectura

### Backend (`backend/app/`)

- `main.py` — registra routers, inicializa Beanie, configura CORS
- `core/` — config (Settings desde `.env`), security (JWT + `requerir_rol(*roles)`), database (init Beanie)
- `models/` — documentos Beanie con UUID como PK
- `schemas/` — Pydantic schemas separados de los modelos (request vs response); `usuario.py` contiene los schemas de perfil usados por `GET/PATCH /auth/perfil`
- `routers/` — solo reciben request, llaman al service, devuelven response
- `services/` — toda la lógica de negocio aquí (validaciones, reglas RN01–RN15); archivos: `auth_service`, `citas_service`, `clientes_service`, `fidelizacion_service`, `pagos_service`, `personal_service` (CRUD de personal + disponibilidad), `servicios_service`
- `tasks/` — Celery app en `__init__.py` (incluye configuración del beat schedule); `no_show.py` corre cada 5min via beat; `recordatorios.py` envía WhatsApp 24h y 2h antes
- `utils/` — `timezone.py` (helpers `ahora_lima()`, `a_lima()`), `whatsapp.py` (cliente Meta Cloud API)

### Frontend (`frontend/src/`)

- `pages/auth/` — `LoginPage.tsx` (solicitar magic link), `RegistroPage.tsx` (primer acceso)
- `pages/` (raíz) — `VerificarTokenPage.tsx` (ruta `/auth?token=xxx`), `UnauthorizedPage.tsx`, `LoginPage.tsx` (scaffold legacy — usa `pages/auth/LoginPage.tsx`)
- `pages/admin/` — rutas anidadas bajo `AdminLayout` (usa `<Outlet />`); incluye Dashboard, Agenda, Clientes, Servicios, Pagos, Fidelización, Personal, Perfil, Configuración
- `pages/worker/` — solo `Agenda.tsx`; accesible por rol `trabajador` y `admin`
- `pages/client/` — `MisCitas.tsx` y `Reservar.tsx`; solo rol `cliente`
- `components/ProtectedRoute.tsx` — guarda por token + rol; redirige a `/login` o `/unauthorized`
- `components/admin/CalendarioModerno.tsx` — componente de calendario para AgendaPage
- `store/useAuthStore.ts` — Zustand con `persist`; JWT en localStorage bajo clave `welve-auth`
- `store/useDashboardStore.ts` — Zustand sin persist; carga en paralelo citas, pagos pendientes y personal activo para el dashboard admin
- `services/api.ts` — instancia Axios con interceptor JWT (adjunta `Bearer` token y redirige a login en 401)
- `services/{recurso}.service.ts` — llamadas Axios a la API (auth, citas, clientes, fidelizacion, pagos, personal, servicios)
- `types/index.ts` — interfaces globales con prefijo `I` (`IUsuario`, `ICita`, `IServicio`, `Rol`, etc.); `types/auth.ts` para tipos del flujo de auth; resto en archivos de dominio: `types/citas.ts`, `types/clientes.ts`, `types/pagos.ts`, `types/personal.ts`, `types/servicios.ts`, `types/fidelizacion.ts`
- Path alias `@/` → `./src/` (configurado en `vite.config.ts`)

### Flujo de autenticación

**Clientes (magic link):**
1. Solicita acceso con su teléfono → `POST /api/v1/auth/solicitar-acceso`
2. Backend genera token UUID, lo persiste (TTL 1h), envía `APP_URL/auth?token=xxx` por WhatsApp
3. Usuario abre el link → `VerificarTokenPage` llama `GET /api/v1/auth/verificar?token=xxx`
4. Backend valida token (no expirado, no usado), lo marca `usado=true`, devuelve JWT
5. Frontend llama `setAuth(token, usuario)` en el store; redirige según rol

**Staff (admin / trabajador — email + contraseña):**
1. `POST /api/v1/auth/login` con `{ correo, contrasena }` → JWT directo
2. Registro inicial via `POST /api/v1/auth/registrar` (solo crea usuarios con rol `admin` o `trabajador`)

### JWT payload

```json
{ "sub": "<UUID del usuario>", "rol": "admin|trabajador|cliente", "nombre": "...", "exp": ... }
```

En los services el dict `usuario` del `Depends(obtener_usuario_actual)` tiene exactamente esas claves.

---

## Sistema de Diseño

Los tokens visuales están definidos como CSS custom properties en `frontend/src/index.css`. **Nunca usar valores de color arbitrarios** — siempre usar las variables del sistema.

### Variables clave

```css
/* Superficies */
--surface-bg           /* fondo general (Blue Chalk claro ~oklch(0.97)) */
--surface-sidebar      /* sidebar oscuro (Haiti ~oklch(0.12)) */

/* Acento primario */
--accent               /* Electric Violet — acciones primarias, estado activo */
--turbo                /* Amarillo — solo alertas de alta energía y recompensas */

/* Texto */
--ink-strong / --ink-base / --ink-muted / --ink-subtle
--sidebar-ink-strong / --sidebar-ink-base / --sidebar-ink-muted

/* Bordes */
--border-subtle / --border-base / --border-strong / --sidebar-border

/* Espaciado (escala 4px) */
--space-1 (0.25rem) … --space-16 (4rem)

/* Tipografía */
--text-xs … --text-3xl   /* escala de tamaños */
--font-regular … --font-bold  /* pesos 400–700 */
--tracking-tight / --leading-tight  /* métricas para display bold */

/* Estados de cita (pares sólido + fondo 15% opacidad) */
--estado-pendiente / --estado-pendiente-bg
--estado-confirmada / --estado-confirmada-bg
--estado-en-curso / --estado-en-curso-bg
--estado-completada / --estado-completada-bg
--estado-cancelada / --estado-cancelada-bg
--estado-cancelada-tardia / --estado-cancelada-tardia-bg
--estado-no-show / --estado-no-show-bg

/* Z-index */
--z-dropdown: 100  --z-sticky: 200  --z-modal: 400  --z-toast: 500
```

Fuente: `Geist` (sans-serif). Métricas clave en display bold grande; tablas en `text-sm`; labels en `text-xs muted`.

Layout: sidebar fijo `--sidebar-width: 240px`. El contenido no usa grillas uniformes — elementos importantes ocupan más espacio.

---

## Filosofía de Diseño

Welve no es un SaaS genérico — es la herramienta operativa de un salón premium. Referencia de feeling: la precisión de Linear, la calidez de una boutique, la confianza de un dashboard financiero moderno.

**Contexto físico por rol:**
- **Admin** — escritorio en el back-office; densidad informativa bienvenida, las métricas deben impactar de un vistazo
- **Trabajador** — tablet entre tratamientos; vista limpia y de consulta rápida, sin ruido financiero
- **Cliente** — móvil desde casa; experiencia premium y fluida, sin fricción de contraseñas

**Anti-referencias** (lo que Welve explícitamente no es):
- Fresha / Booksy: marketplaces coloridos y busy
- Calendly genérico: scheduling sin identidad
- SaaS-cream: fondo beige / border-radius exagerado / gradiente lila generado por IA
- Tres cards iguales en fila — nunca en Welve

**Principios aplicados:**
1. Los números grandes mandan — KPIs en display bold, legibles de un vistazo
2. Layout asimétrico con propósito — la grilla sirve al contenido, no al revés
3. Movimiento que informa — animaciones de Framer Motion existen para mostrar estado, no decorar
4. Violet con intención — `--accent` solo para acciones primarias y estado activo; `--turbo` solo para alertas y recompensas

**Accesibilidad:** WCAG 2.1 AA — contraste mínimo 4.5:1 para cuerpo, 3:1 para texto grande y UI. Soporte `prefers-reduced-motion`.

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
| RN05 | Cita en estado `confirmada` con `programada_en + 15min < now()` sin `hora_llegada_real` | Celery beat (cada 5min) marca `no_show` automáticamente. Las citas en estado `pendiente` no son afectadas |
| RN08 | `servicio.requiere_ficha_salud=true` | No confirmar cita sin ficha registrada |
| RN09 | Ficha con `severidad='critica'` al iniciar cita | API devuelve 422 con `codigo: "FICHA_CRITICA"` y lista de fichas; el caller debe reenviar con `confirmar_ficha_critica: true` para proceder |
| RN11 | `cliente.esta_bloqueada=true` | Rechazar reserva con mensaje genérico |
| RN13 | Buffer entre citas | Disponibilidad: `termina_en + personal.minutos_buffer` |
| RN14 | `max_usos_por_cliente=1` (default) | Validar uso previo antes de aplicar descuento |
| RN15 | Al completar cita | `fidelizacion_service.verificar_retos_completados` se llama automáticamente desde `cambiar_estado` |

**N horas cancelación:** siempre leer `servicio.horas_cancelacion_sin_penalidad` — nunca hardcodear 5h.
**Depósito:** siempre leer `servicio.monto_deposito` — nunca usar valor global fijo.

Transiciones de estado válidas en `services/citas_service.py:20` (`_TRANSICIONES_VALIDAS`).

---

## Endpoints Principales

```
POST   /api/v1/auth/solicitar-acceso             # clientes: magic link por WhatsApp
GET    /api/v1/auth/verificar                    # ?token=xxx → JWT
POST   /api/v1/auth/login                        # staff: email + contraseña → JWT
POST   /api/v1/auth/registrar                    # crear usuario admin o trabajador
GET    /api/v1/auth/perfil
PATCH  /api/v1/auth/perfil
POST   /api/v1/auth/cambiar-password

GET    /api/v1/servicios
GET    /api/v1/servicios/categorias
GET    /api/v1/servicios/{id}/disponibilidad
POST   /api/v1/servicios/categorias          # admin
POST   /api/v1/servicios                     # admin
PATCH  /api/v1/servicios/{id}               # admin

POST   /api/v1/citas
GET    /api/v1/citas/mis-citas
PATCH  /api/v1/citas/{id}/cancelar
PATCH  /api/v1/citas/{id}/estado               # admin/trabajador
PATCH  /api/v1/citas/{id}/llegada              # admin/trabajador — registra hora_llegada_real sin cambiar estado
GET    /api/v1/citas/{id}/servicios            # admin/trabajador

GET    /api/v1/admin/citas
POST   /api/v1/admin/citas
GET    /api/v1/admin/citas/{id}/pagos
POST   /api/v1/admin/pagos
GET    /api/v1/admin/pagos/pendientes
PATCH  /api/v1/admin/pagos/{id}/confirmar
PATCH  /api/v1/admin/pagos/{id}/rechazar
PATCH  /api/v1/admin/pagos/{id}/reembolsar
GET    /api/v1/admin/personal
POST   /api/v1/admin/personal
PATCH  /api/v1/admin/personal/{id}
GET    /api/v1/admin/personal/{id}/disponibilidad
POST   /api/v1/admin/personal/{id}/disponibilidad
DELETE /api/v1/admin/personal/{id}/disponibilidad/{disp_id}

GET    /api/v1/trabajador/agenda

GET    /api/v1/clientes                          # admin
GET    /api/v1/clientes/{id}                     # admin
PATCH  /api/v1/clientes/{id}                     # admin
GET    /api/v1/clientes/{id}/historial
GET    /api/v1/clientes/{id}/fichas-salud
POST   /api/v1/clientes/{id}/fichas-salud
PATCH  /api/v1/clientes/{id}/bloquear            # admin
PATCH  /api/v1/clientes/{id}/desbloquear         # admin

GET    /api/v1/fidelizacion/mis-retos
GET    /api/v1/fidelizacion/mis-descuentos
POST   /api/v1/fidelizacion/aplicar-descuento
GET    /api/v1/fidelizacion/descuentos           # admin
POST   /api/v1/fidelizacion/descuentos           # admin
GET    /api/v1/fidelizacion/retos                # admin
POST   /api/v1/fidelizacion/retos                # admin

GET    /health                                   # health check sin auth
```

Swagger UI disponible en `http://localhost:8000/docs` cuando el backend está corriendo.

---

## Convenciones

### General
- Todo código, variables, funciones, comentarios y commits en **español**
- IDs: UUID v4 en todos los documentos
- Toda fecha/hora: `datetime` aware con `America/Lima` (nunca naive); usar `ahora_lima()` y `a_lima()` de `utils/timezone.py`

### Python
- Type hints siempre; `snake_case` vars/funciones; `PascalCase` clases/modelos
- Lógica de negocio solo en `services/` — routers solo enrutan
- Errores con `HTTPException` + código HTTP descriptivo
- Proteger endpoints con `Depends(requerir_rol("admin"))` o `Depends(obtener_usuario_actual)` de `core/security.py`

### TypeScript
- Nunca `any`; `PascalCase` componentes/tipos; `camelCase` vars/funciones
- Interfaces con prefijo `I`: `ICliente`, `ICita`
- Un componente por archivo
- Nuevos tipos de dominio van en su archivo de dominio (`types/citas.ts`, etc.), no en `types/index.ts`

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
- Frontend: usar siempre las CSS variables del sistema de diseño (`var(--accent)`, `var(--surface-sidebar)`, etc.) — no valores de color hardcodeados
- `pages/LoginPage.tsx` (raíz) es un scaffold sin estilos del sistema — la página activa es `pages/auth/LoginPage.tsx`
