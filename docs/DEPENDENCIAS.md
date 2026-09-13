# Dependencias — Estado y Política de Actualización

Última verificación completa: **2026-09-02**, contra el Supabase real configurado en
`backend/.env` (no un sustituto local). Política acordada: **conservadora** — últimas
versiones estables, sin saltos de versión mayor que rompan patrones existentes.

## Backend (`backend/requirements.txt`)

Antes de esta ronda, todas las dependencias usaban pisos abiertos (`>=`) sin techo — un
`pip install` limpio en otra máquina podía traer versiones distintas a las probadas. Se fijaron
(`==`) a las últimas estables disponibles en PyPI en la fecha de verificación, cada una
confirmada contra la suite de tests real:

| Paquete | Versión fijada |
|---|---|
| fastapi | 0.141.1 |
| bcrypt | 5.0.0 |
| uvicorn[standard] | 0.52.4 |
| sqlalchemy[asyncio] | 2.0.52 |
| asyncpg | 0.31.0 |
| alembic | 1.19.1 |
| pydantic (+email) | 2.13.5 |
| pydantic-settings | 2.15.0 |
| python-jose[cryptography] | 3.5.0 |
| python-multipart | 0.0.32 |
| celery | 5.6.3 |
| redis | 8.1.0 |
| httpx | 0.28.1 |
| python-dotenv | 1.2.3 |
| ruff | 0.16.5 |
| pytest / pytest-asyncio | 9.1.1 / 1.4.0 |
| structlog | 26.1.0 |
| slowapi | 0.1.10 |

**Verificación realizada** (no solo "instala sin error" — ejecución real de principio a fin):

1. Conectividad real a Supabase confirmada (`SELECT version()` vía el engine de la app).
2. `alembic upgrade head` — aplicado limpio; `alembic check` confirma "No new upgrade
   operations detected" (los modelos y el esquema real coinciden).
3. `python seed.py` — puebla datos demo sin excepciones.
4. Backend levantado con `uvicorn`, smoke test manual: `/health`, `POST /auth/login` (admin
   sembrado), `GET /servicios`, `GET /admin/citas` con JWT — incluyendo verificación de que
   `enriquecer_cita()` resuelve nombres correctamente contra Postgres real.
5. Suite de tests nueva (`backend/tests/`, antes vacía) — 11/11 en verde, cubriendo auth
   (login, magic link con rechazo de reuso) y reglas de negocio RN01/RN02/RT01/RT03/RT04/RT05.
   Los tests corren en transacciones que se revierten al final (no ensucian los datos de seed).
6. Redis levantado (`docker compose up -d redis`) y la tarea de Celery `verificar_no_show`
   (RN04) ejecutada directamente sin excepciones.
7. `ruff check app/` limpio — se agregó `backend/pyproject.toml` (no existía configuración de
   ruff antes) con dos ajustes deliberados, no arbitrarios:
   - `extend-immutable-calls` para `Depends`/`Query`/etc. de FastAPI — sin esto, ruff marca
     como error cada endpoint del proyecto (falso positivo conocido de `flake8-bugbear` sobre
     el patrón idiomático de FastAPI).
   - `line-length = 150` — el estilo ya establecido en el proyecto usa one-liners densos en
     routers/services (línea más larga real: 143 caracteres); forzar 88/120 hubiera exigido
     reformatear el archivo entero sin ganancia funcional.
8. Se corrigieron durante esta verificación (bugs reales encontrados, no solo estilo):
   - Un `raise ... from None` faltante en dos lugares (`core/security.py`,
     `services/auth_service.py`) — cosmético, sin impacto funcional.
   - Un `if` anidado simplificable en `usuarios_service.py` — sin cambio de comportamiento.
   - **Un bug real introducido por un auto-fix de ruff** (`--unsafe-fixes`) que reescribió
     `MagicLink.usado == False` como `not MagicLink.usado` en un `.where(...)` de SQLAlchemy —
     eso evalúa la negación en Python (siempre `False` como constante) en vez de generar
     `NOT usado` en SQL, lo que habría roto la verificación de magic link para todo token
     válido. Se corrigió a `MagicLink.usado.is_(False)` (el idiom correcto) y se verificó con
     el test `test_magic_link_flujo_completo` antes de aceptar el resto del auto-fix. Los otros
     16 hallazgos del mismo tipo (`Columna == True` → `Columna` a secas) sí eran seguros y se
     mantienen.

## Ronda de optimización del backend (2026-09-12)

Se agregaron dos dependencias nuevas al backend (mismas versiones que la tabla de arriba),
como parte de una ronda de hardening/performance/observabilidad — no solo verificadas contra
`pytest`, sino ejercitadas de punta a punta:

- **`structlog`**: `core/logging.py` configura JSON en `ENVIRONMENT=production` y consola
  legible en desarrollo; se probó imprimiendo un evento real con `configurar_logging("production")`
  y confirmando una línea JSON válida (`{"usuario_id": ..., "event": ..., "level": ...,
  "timestamp": ...}`). El middleware `RequestIDMiddleware` en `main.py` liga cada request a un
  `request_id` propagado a los logs vía contextvars, devuelto también en el header
  `X-Request-ID` — verificado con `curl -D -`.
- **`slowapi`**: rate limiting en `POST /auth/login` (5/min) y `POST /auth/solicitar-acceso`
  (3/min), respaldado por el mismo Redis que ya usa Celery (`storage_uri=settings.redis_url`,
  no memoria local — así el límite se comparte entre workers/procesos uvicorn). Verificado con
  un test real (`tests/test_auth.py::test_rate_limit_login`, que reactiva el limiter fuera de
  la fixture `client` — la fixture lo desactiva por default para no romper el resto de la
  suite bajo el mismo contador de Redis) y manualmente con 6 requests seguidas → la 6ª devuelve
  429.

Otros cambios de esta ronda, verificados de punta a punta contra Supabase real (no solo con
mocks): índice compuesto `(personal_id, programada_en)` en `citas` confirmado con `EXPLAIN`
(pasó de *Seq Scan* a *Index Scan*); N+1 resuelto en `calcular_disponibilidad` (de 2 queries
por especialista a 2 queries totales, mismo resultado antes/después); exception handler global
de `IntegrityError`→409 probado con 2 requests concurrentes reales (`asyncio.gather`) sin dar
500; recordatorios de WhatsApp activados vía Celery `apply_async(eta=...)` y confirmados con
`celery -A app.tasks inspect scheduled` mostrando el ETA correcto en hora Lima. Detalle completo
en `CLAUDE.md` (arquitectura) y `docs/FASES.md`.

## Frontend (`frontend/package.json`)

Ya estaba en una generación reciente (React 19.2, Vite 8, ESLint 10, TypeScript 6.0) antes de
esta ronda. Acciones tomadas:

1. `npm audit fix` — resolvió 9 vulnerabilidades (7 altas, 1 moderada, 1 baja) en axios,
   brace-expansion, browserslist, form-data, nanoid, postcss, postcss-selector-parser y
   react-router, todas dentro de los rangos semver ya declarados en `package.json` (sin saltos
   de versión mayor).
2. `npm update` — actualizó dentro de los rangos ya declarados (ej. react 19.2.6 → 19.2.8,
   axios → 1.20.0, react-router-dom → 7.18.3, zustand → 5.0.15, etc.).
3. `npx tsc --noEmit` — limpio.
4. `npm run lint` — se corrigieron bugs reales preexistentes (no introducidos por esta
   actualización, confirmado comparando la versión exacta de `eslint-plugin-react-hooks`
   antes/después: sin cambios, 7.1.1 en ambos casos):
   - `LoginPage.tsx` y `RegistroPage.tsx` llamaban a `useForm()` **después** de un `return`
     condicional — violación real de rules-of-hooks (el orden de hooks podía variar entre
     renders). Se movió la llamada a `useForm()` antes del `if`.
   - 6 componentes (`MisCitas`, `Reservar`, `Agenda` de trabajador, `PagosPage`,
     `FidelizacionPage`, `ConfiguracionPage`, `Dashboard`) leían `useRef(fn()).current` en el
     cuerpo del render para memoizar `prefers-reduced-motion` — la regla `react-hooks/refs` (ya
     endurecida en `eslint-plugin-react-hooks` v7) prohíbe leer un ref durante el render. Se
     reemplazó por `useState(() => fn())[0]`, el patrón correcto para "calcular una vez sin
     re-render".
   - Una variable de `catch (error)` sin usar en `useDashboardStore.ts`.
5. **No resuelto en esta ronda** (documentado en `docs/FASES.md`, Fase 5): 5 errores
   `react-hooks` de tipo "Calling setState synchronously within an effect" en `AgendaPage.tsx`
   y `Dashboard.tsx` — patrón de carga de datos extendido en el archivo, no roto en la
   práctica, pero que requiere revisión caso por caso (y frontend no tiene suite de tests
   propia para verificar que un cambio no altera el comportamiento).
6. `npm run build` (a diferencia de `npx tsc --noEmit` suelto, este corre `tsc -b` en modo
   composite/project-references) reveló ~25 errores de TypeScript que ningún comando anterior
   había atrapado — es decir, **el build de producción estaba roto antes de esta ronda**,
   independientemente de cualquier dependencia tocada aquí. Causas y fixes, todos verificados
   con `npm run build` limpio al final:
   - `PagosPage.tsx` usaba datos mock (`const PAGOS: IPagoRow[] = [...]`, nunca conectados a
     `pagosService` — sigue sin conectarse, ver nota abajo) con nombres de campo en camelCase
     (`citaId`, `referenciaExterna`, `confirmadoPor`, `fechaConfirmacion`) que no coinciden con
     `IPago` (snake_case, alineado al JSON real del backend) y le faltaban los campos
     `comprobante_url`/`nota_admin`. Se corrigieron los nombres y se completaron los campos
     faltantes con `null`, sin cambiar el comportamiento (sigue siendo una vista con datos de
     ejemplo, no conectada al backend — pendiente de conectar en una fase futura, no es un bug
     introducido aquí).
   - `ServiciosPage.tsx` usaba la sintaxis de Zod v3 (`{ invalid_type_error: '...' }`) aunque
     `zod` ya estaba en v4 desde antes de esta sesión (el bump de esta ronda fue solo
     4.4.3→4.5.4, un patch) — se migró a la sintaxis v4 (`{ error: '...' }`).
   - `RegistroPage.tsx` usaba `errorMap` (API de Zod v3) en un `z.enum(...)` — se migró a
     `{ error: '...' }`.
   - `LoginPage.tsx`/`RegistroPage.tsx` construían un `IUsuarioPerfil` parcial sin
     `fecha_creacion`/`ultimo_acceso` — se completaron con `null`, mismo patrón defensivo que
     ya usaban para `telefono`/`foto_perfil_url`.
   - `UsuariosPage.tsx` comparaba contra un campo `usuarioActual?.usuario_id` que nunca existió
     en `IUsuarioPerfil` (siempre `undefined`, comparación muerta) — se limpió, dejando solo la
     comparación real por `.id`. Además, `usuarios.service.ts` tipaba `telefono?: string` en
     `actualizarUsuario()` cuando el código ya enviaba `null` deliberadamente para borrar el
     teléfono (y el backend lo acepta, `ActualizarUsuarioRequest.telefono: str | None`) — se
     amplió el tipo a `string | null` en vez de cambiar el valor enviado, para no alterar el
     comportamiento real de "borrar teléfono".
   - `vite.config.ts` usaba `__dirname` (advertencia de compatibilidad futura de Vite) — se
     reemplazó por `import.meta.dirname`.

## Saltos de versión mayor pospuestos (candidatos para una ronda futura, no conservadora)

| Paquete | Actual | Disponible | Por qué se pospuso |
|---|---|---|---|
| tailwindcss | 3.4.19 | 4.x | Cambio de arquitectura de configuración (CSS-first) — no es un bump conservador. |
| typescript | 6.0.3 | 7.x | Mayor, sin verificar compatibilidad con el resto del toolchain todavía. |
| framer-motion | 12.43.0 | 13.x | Mayor — el proyecto depende de su API de animación en componentes clave (`CalendarioModerno`, etc.); requiere probar visualmente antes de saltar. |
| @types/node | 24.13.3 | 26.x | Mayor, bajo impacto pero sin necesidad urgente. |
