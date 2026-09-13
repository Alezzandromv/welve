# Fases del Proyecto — Welve

Roadmap completo: qué está hecho, qué se cerró en esta ronda, y qué queda como trabajo futuro.
Cada fase lista objetivo, entregables, criterios de aceptación y dependencias.

## Fase 0 — Scaffold inicial ✅ (hecha)

- **Objetivo**: tener un esqueleto funcional de backend (FastAPI + MongoDB/Beanie en su
  versión original) y frontend (React + Vite) con los tres roles y el flujo de auth dual.
- **Entregables**: modelos de dominio iniciales, routers y services base, layout de frontend
  por rol, sistema de diseño inicial.
- **Estado**: completa (commits `Scaffold Inicial`, `Nuevos módulos añadidos`).

## Fase 1 — Migración MongoDB → Supabase Postgres ✅ (hecha, cerrada en esta ronda)

- **Objetivo**: reemplazar Beanie/Motor/MongoDB por SQLAlchemy 2.0 async + Alembic + Supabase
  Postgres, con integridad referencial real (FKs nativas) en vez de referencias manuales.
- **Entregables**: 14 modelos SQLAlchemy declarativos, migración inicial de Alembic, engine
  configurado para el connection pooler de Supabase (`statement_cache_size=0`), `seed.py`
  reescrito, servicios reescritos a queries SQL async, `tasks/db.py` con sessionmaker perezoso
  para Celery.
- **Criterios de aceptación**:
  - ✅ `alembic upgrade head` aplica limpio contra Supabase real y es idempotente
    (`alembic check` → "No new upgrade operations detected").
  - ✅ `seed.py` puebla datos demo sin excepciones.
  - ✅ Backend arriba, smoke test de endpoints clave (login, servicios, citas admin con
    `enriquecer_cita()`) contra la base real.
  - ✅ Suite de tests (`backend/tests/`) cubriendo auth, RN01/RN02/RT01/RT03, RT04/RT05 —
    11/11 en verde, corriendo con transacciones que se revierten (no ensucian los datos de
    seed).
  - ✅ Tarea de Celery `verificar_no_show` (RN04) ejecutada sin excepciones contra Redis local.
- **Dependencias**: proyecto Supabase real con `DATABASE_URL` accesible desde el entorno de
  desarrollo — ya configurado en `backend/.env`.

## Fase 2 — Consolidación: documentación, dependencias, limpieza ✅ (esta ronda)

- **Objetivo**: dejar la base de código y su documentación en estado "de producción de
  referencia" antes de construir los módulos nuevos — sin deuda de documentación ni
  dependencias sin fijar.
- **Entregables**:
  - Documentación de contexto reorganizada en `docs/` (este archivo incluido), completada
    donde estaba truncada o superficial (`DESIGN.md`, `PRODUCT.md`).
  - Especificación completa de los dos módulos nuevos (`MODULO_ASESORIA_IA.md`,
    `MODULO_FIDELIZACION_AVANZADA.md`) y de la matriz de roles (`ROLES_Y_PERMISOS.md`).
  - Dependencias de backend fijadas (`==`) a versiones estables verificadas; dependencias de
    frontend actualizadas conservadoramente.
  - Pasada de limpieza (`ruff`, `eslint --fix`) sin cambios de comportamiento.
- **Criterios de aceptación**: suite de tests en verde tras el bump de dependencias; `ruff
  check` y `npm run build`/`tsc --noEmit`/`npm run lint` limpios.
- **Pendiente explícito para una fase futura** (fuera de alcance de esta ronda, solo
  documentado): revisar la falta de guarda de rol en `POST /auth/registrar` (ver
  `docs/ROLES_Y_PERMISOS.md`); completar CRUD (editar/eliminar) de `Descuento`/`Reto`.
- **Pendiente de la revisión de casos de uso** (renumeración completa a `CUS01`–`CUS34`, ya
  reflejada en `docs/CASOS_DE_USO.md` y en los seis documentos de `docs/tesis/` que la citan),
  solo documentado por ahora, sin cambios de código: implementar el endpoint de reprogramación
  de cita (`CUS06` — no existe hoy en `backend/app/routers/citas.py`); ampliar
  `requerir_rol("admin")` a `requerir_rol("admin", "trabajador")` en
  `GET /clientes/{id}/fichas-salud` y `GET /clientes/{id}/historial` (`CUS12`/`CUS14`, ver
  `docs/ROLES_Y_PERMISOS.md`).

## Fase 2.5 — Optimización de backend: performance, seguridad y observabilidad ✅ (esta ronda)

- **Objetivo**: aplicar mejores prácticas y patrones al backend ya existente (sin agregar
  features nuevas) para que quede modularizado, más rápido y observable en producción — a
  partir de una auditoría completa de `core/`, `models/`, `schemas/`, `services/`, `routers/`,
  `tasks/` y `utils/`.
- **Entregables**:
  - **Fundamentos compartidos**: `services/_comunes.py` (get-or-404, lookups de
    Cliente/Personal por `usuario_id`, chequeo de unicidad correo/teléfono, mapper de citas,
    resolución de servicios) y `utils/disponibilidad.py` (`se_solapa`, única fuente de verdad
    de RT03 — antes duplicada de forma independiente en `citas_service` y `servicios_service`).
  - **Seguridad**: `core/security.py::obtener_usuario_actual` ahora revalida `esta_activo`/
    `esta_bloqueada`/`rol` contra la DB en cada request — antes un usuario desactivado o
    bloqueado seguía autenticado con su JWT viejo hasta que expirara. `secret_key` con
    validación mínima de longitud (rotado en `.env` de desarrollo, quedó por debajo del mínimo).
    `ENVIRONMENT=production` ahora oculta `/docs`/`/redoc` y desactiva el regex de CORS de
    Codespaces.
  - **Performance**: índice compuesto `(personal_id, programada_en)` en `citas` (la validación
    de solapamiento pasó de *Seq Scan* a *Index Scan*, confirmado con `EXPLAIN`) más índices en
    todas las FK que antes no tenían ninguno; N+1 resuelto en
    `servicios_service.calcular_disponibilidad` (2 queries totales en vez de 2 por
    especialista); paginación (`limit`/`offset`) en los listados admin de citas, clientes,
    usuarios, personal, descuentos y retos.
  - **Auditoría de datos**: `models/mixins.py::TimestampMixin` (`creado_en`/`actualizado_en`
    con `server_default`/`onupdate` a nivel de servidor) aplicado a los 9 modelos que no tenían
    ningún timestamp; corregido `Usuario.actualizado_en` (le faltaba `onupdate`, nunca se
    actualizaba tras el INSERT inicial).
  - **Robustez**: exception handler global de `IntegrityError`→409 (antes: 500 genérico bajo
    requests concurrentes contra columnas únicas) más manejo puntual en los 5 puntos de
    check-then-insert sin protección; RN07 (ficha de salud requerida) unificado entre `crear`
    (reserva de cliente) y `crear_para_admin` (antes el admin podía saltárselo en silencio).
  - **Observabilidad**: logging estructurado (`structlog`, nuevo — JSON en producción, consola
    en desarrollo) con middleware de `request_id`; handler global de excepciones no
    anticipadas con stacktrace; health check real (`/health` verifica Postgres, no un ping
    trivial); `GZipMiddleware`.
  - **Rate limiting**: `slowapi` (nuevo, respaldado por Redis) en `POST /auth/login` (5/min) y
    `POST /auth/solicitar-acceso` (3/min) — antes sin ningún límite.
  - **WhatsApp/Celery**: `utils/whatsapp.py` con timeout explícito, manejo de errores de red y
    de rate-limit de Meta (429), y logging de cada resultado (antes: sin try/except, sin
    logging, valor de retorno ignorado por el caller). Reintentos (`autoretry_for`,
    `retry_backoff`) en las tasks de Celery. **Recordatorios de WhatsApp 24h/2h activados** —
    existían como código desde antes pero nunca se disparaban (no estaban en el beat ni se
    llamaban desde ningún lado); ahora se agendan vía `apply_async(eta=...)` al crear la cita.
- **Criterios de aceptación**: suite de tests en verde (15/15, incluyendo 4 tests nuevos de
  seguridad/rate-limiting) sin tocar los existentes salvo por el helper `crear_usuario_admin`
  en `tests/conftest.py` (necesario porque la revalidación contra DB rompía tokens de prueba
  con un `sub` inventado); `ruff check app/` limpio; `alembic check` sin operaciones
  pendientes; smoke test manual de punta a punta (login, disponibilidad, paginación, 409 bajo
  concurrencia real, recordatorios agendados verificados con `celery inspect scheduled`).
- **Deliberadamente fuera de alcance** (no tocado en esta ronda, ver ítems ya documentados en
  Fase 5 más abajo): la falta de guarda de rol en `POST /auth/registrar`, CI en cada PR, el
  salto de Tailwind (frontend).

## Fase 3 — Fidelización avanzada (futuro)

Objetivo general: implementar niveles de fidelización configurables, catálogo exclusivo y
pasarela de pago, según `docs/MODULO_FIDELIZACION_AVANZADA.md` (que contiene la lista completa
de archivos, endpoints y vistas — esta fase solo fija el **orden de construcción** y los
criterios de aceptación de cada paso). Dependencia previa: Fase 2 completa (dependencias y
tests como base estable); cuenta de comercio Culqi con credenciales de sandbox antes de 3.4.

**3.1 — Modelado y migración (backend)**
- Crear `app/models/catalogo.py` (`NivelFidelizacion`, `ProductoCatalogoExclusivo`,
  `PedidoCatalogo`) y agregar `Cliente.nivel_actual_id` (FK opcional).
- Generar migración: `alembic revision --autogenerate -m "niveles de fidelizacion y catalogo exclusivo"`.
- *Aceptación*: `alembic upgrade head` limpio contra Supabase; `alembic check` sin drift.

**3.2 — Services y reglas de negocio (backend)**
- `app/services/catalogo_service.py`: CRUD de niveles/productos, `calcular_nivel_cliente()`
  (RN14), lógica de downgrade sin retroactividad (RN15).
- Completar el CRUD pendiente de `Descuento`/`Reto` en `app/services/fidelizacion_service.py`
  (editar/eliminar) — se aprovecha esta fase para cerrar ese gap detectado en la Fase 2.
- Tests: casos de umbral por visitas, por gasto acumulado, por ventana; downgrade no afecta
  pedidos previos.
- *Aceptación*: tests unitarios de `calcular_nivel_cliente()` en verde para los tres tipos de
  umbral.

**3.3 — Endpoints (backend)**
- Extender el `routers/fidelizacion.py` existente (no crear un router nuevo — el catálogo
  exclusivo vive bajo el mismo prefijo `/api/v1/fidelizacion`, igual que `Descuento`/`Reto`)
  con los endpoints listados en `docs/MODULO_FIDELIZACION_AVANZADA.md#endpoints-nuevos-api`.
- *Aceptación*: cada endpoint responde según la matriz de `docs/ROLES_Y_PERMISOS.md` (probado
  con al menos un test de rechazo 403 por rol incorrecto).

**3.4 — Integración de pasarela (backend)**
- `app/services/pasarela_service.py` (Culqi: crear cargo, verificar firma) y
  `app/routers/webhooks.py` (`POST /webhooks/culqi`, sin JWT, autenticado por firma).
- Job `app/tasks/recalcular_niveles.py` en Celery beat.
- *Aceptación*: RN17 (idempotencia del webhook) verificada con un test que envía el mismo
  evento dos veces y confirma que `PedidoCatalogo` no duplica efectos; RN18 verificada (pago
  rechazado no altera nivel).

**3.5 — Vistas admin (frontend)**
- `pages/admin/NivelesFidelizacion.tsx`, `pages/admin/CatalogoExclusivo.tsx` (admin),
  `pages/admin/PedidosCatalogo.tsx`, extensión de `FidelizacionPage.tsx` (editar/eliminar) y de
  `Dashboard.tsx` (widget de distribución por nivel).
- Nuevos `services/catalogo.service.ts` y `types/catalogo.ts`.
- *Aceptación*: `npm run build` limpio; CRUD completo probado manualmente contra el backend de
  3.3.

**3.6 — Vistas cliente (frontend)**
- `pages/client/MiNivel.tsx` (o sección en `MisCitas.tsx`), `pages/client/CatalogoExclusivo.tsx`
  (cliente), `components/client/CheckoutCulqi.tsx`.
- *Aceptación*: un cliente de nivel bajo ve los productos superiores bloqueados con teaser; el
  intento de compra vía API directa (sin pasar por la UI) contra un producto no habilitado
  responde 403 (RN16 verificada también a nivel de API, no solo de UI).

**3.7 — Notificaciones**
- WhatsApp de subida de nivel y de confirmación/entrega de pedido, reutilizando
  `utils/whatsapp.py`.
- *Aceptación*: mensaje enviado (o correctamente omitido si `acepta_whatsapp=false`) en cada
  transición relevante, verificado con el mismo patrón de test que ya usa `auth_service`.

**3.8 — QA y cierre**
- Suite de tests de backend en verde (RN14–RN18), `ruff check` limpio, `npm run build`/`lint`
  limpios, smoke test manual del flujo completo: cliente sube de nivel → ve catálogo
  desbloqueado → compra → webhook confirma → pedido marcado entregado por admin.
- *Criterio de aceptación de la fase completa*: RN14–RN18 implementadas y testeadas; webhook
  idempotente verificado con reintentos simulados; UI muestra correctamente productos
  bloqueados con su teaser de nivel.

## Fase 4 — Asesoría de belleza con IA (futuro)

Objetivo general: implementar el módulo de cámara + Gemini según
`docs/MODULO_ASESORIA_IA.md` (lista completa de archivos, endpoints y vistas). Dependencia
previa: Fase 2 completa; API key de Gemini; catálogo inicial de al menos ~15-20 estilos cargado
por el salón antes de activar el módulo en producción (un catálogo vacío no tiene nada que
recomendar).

**4.1 — Modelado y migración (backend)**
- Crear `app/models/ia.py` (`EstiloCatalogo`, `ConsultaIA`, `SeleccionEstilo`) y, si se opta por
  configuración persistida en DB, una tabla `configuracion_ia` de fila única.
- Migración de Alembic; `core/config.py` gana `gemini_api_key`.
- *Aceptación*: `alembic upgrade head` limpio; ninguna de las tres tablas tiene una columna de
  imagen de cliente (verificación explícita de RN11 a nivel de esquema).

**4.2 — Cliente de Gemini y service de análisis (backend)**
- `app/utils/gemini_client.py` (mismo patrón que `utils/whatsapp.py`: una función async, sin
  estado, lee la API key de `settings`).
- `app/services/ia_service.py`: `crear_consulta()` (recibe la foto en memoria, la descarta tras
  llamar a Gemini — nunca `open()`/`save()` a disco), `seleccionar_estilo()`, CRUD de
  `EstiloCatalogo`, `calcular_metricas()`.
- *Aceptación*: test que verifica que `crear_consulta()` no deja ningún archivo nuevo en el
  sistema de archivos ni en ningún bucket de storage tras ejecutarse (auditoría automatizada de
  RN11, no solo revisión manual de código).

**4.3 — Endpoints (backend)**
- `app/routers/ia.py` con los endpoints listados en
  `docs/MODULO_ASESORIA_IA.md#endpoints-nuevos-api`.
- *Aceptación*: RN12 (límite diario) probado con un test que agota el límite y confirma 429/422
  en el intento siguiente; RN13 (selección solo ligable a cita válida) probado con un intento
  de ligar a una cita ya cancelada, esperando rechazo.

**4.4 — Vistas cliente (frontend)**
- `pages/client/AsesoriaIA.tsx`, `components/client/CamaraConsulta.tsx`,
  `components/client/GridEstilos.tsx`, botón de entrada desde `Reservar.tsx` y `MisCitas.tsx`.
- *Aceptación*: el flujo de consentimiento bloquea la cámara hasta aceptar (RN10 verificado en
  UI); `npm run build` limpio.

**4.5 — Vistas trabajador (frontend)**
- Extensión de `pages/worker/Agenda.tsx` (badge + panel de historial de estilos, CUS27) y
  `pages/worker/ConsultaIA.tsx` (consulta en vivo, CUS26).
- *Aceptación*: una especialista ve el historial de estilos de una clienta recurrente sin
  volver a analizar ninguna foto.

**4.6 — Vistas admin (frontend)**
- `pages/admin/CatalogoEstilos.tsx`, extensión de `ConfiguracionPage.tsx` (toggle + límite
  diario) y de `Dashboard.tsx` (widget de uso de IA).
- *Aceptación*: activar/desactivar el módulo desde la UI se refleja de inmediato en el
  comportamiento de `POST /ia/consultas` (403 o mensaje claro si está desactivado).

**4.7 — Notificaciones y funcionalidades adicionales**
- WhatsApp a la especialista cuando el cliente envía una `SeleccionEstilo`.
- Favoritos sin consulta (`POST /ia/favoritos`) y feedback post-servicio del trabajador.
- *Aceptación*: ambas funcionalidades cubiertas por al menos un test de servicio cada una.

**4.8 — QA y cierre**
- Auditoría final de RN10–RN13 (incluyendo la prueba automatizada de no-persistencia de fotos
  de 4.2 corrida contra el flujo end-to-end completo, no solo la función aislada); consumo de
  la API de Gemini verificado dentro de los límites de costo configurados por el admin.
- *Criterio de aceptación de la fase completa*: RN10–RN13 implementadas y testeadas; verificado
  que ninguna foto original se persiste bajo ningún flujo (cliente, trabajador, ni en caso de
  error de la API de Gemini a mitad de request); `npm run build`/`ruff check`/tests en verde.

## Fase 5 — Hardening y producción (futuro)

- **Objetivo**: preparar el sistema para operar en producción real, más allá del entorno de
  desarrollo en Codespaces.
- **Entregables** (no exhaustivo, a detallar cuando se aborde):
  - Corregir la falta de guarda de rol en `POST /auth/registrar` — sigue pendiente, es un
    hallazgo de seguridad real (cualquiera sin autenticar puede crear una cuenta admin/
    trabajador) deliberadamente dejado fuera de la Fase 2.5 por requerir decidir primero cómo
    se bootstrapea el primer admin del sistema sin ese endpoint abierto.
  - CI (lint + tests) en cada PR.
  - ~~Observabilidad: logging estructurado~~ — hecho en la Fase 2.5 (`structlog` + middleware
    de `request_id` + exception handler global). Pendiente aquí: alertas activas en producción
    (ej. Sentry u otro colector) sobre los logs ya estructurados.
  - `SECRET_KEY`: ya tiene validación mínima de longitud (Fase 2.5). Pendiente: política de
    rotación periódica en producción (hoy es manual) y evaluar acortar
    `ACCESS_TOKEN_EXPIRE_MINUTES` dado que ya existe revalidación de `esta_activo` contra DB.
  - Evaluar el salto Tailwind v3 → v4 (pospuesto en la Fase 2 por criterio conservador).
  - ~~Rate limiting en endpoints públicos (`/auth/solicitar-acceso`, `/auth/login`)~~ — hecho
    en la Fase 2.5 (`slowapi`, 5/min y 3/min respectivamente, respaldado por Redis).
- **Dependencias**: Fases 3 y 4 completas (o al menos las que se decida llevar a producción).
- **Hallazgo de la Fase 2 pendiente de resolver aquí**: `npm run lint` reporta 5 errores
  `react-hooks` de tipo "Calling setState synchronously within an effect can trigger cascading
  renders" en `AgendaPage.tsx` (2) y `Dashboard.tsx` (3) — el patrón habitual de "cargar datos
  en un `useEffect` que llama a una función async que hace `setLoading(true)` de entrada".
  Es un patrón extendido y no roto en la práctica, pero la regla más estricta de
  `eslint-plugin-react-hooks` v7 (alineada con React Compiler) lo señala. No se corrigió en la
  Fase 2 porque arreglarlo bien requiere revisar cada call site individualmente y el frontend
  no tiene suite de tests que verifique que el comportamiento no cambia — se deja para cuando
  se aborde esta fase con tiempo dedicado, idealmente sumando algún test de esos flujos antes
  de tocarlos.
- **Hallazgo adicional de la Fase 2**: `npm run build` (que corre `tsc -b`, distinto de
  `tsc --noEmit` plano) reveló ~25 errores de TypeScript preexistentes nunca detectados antes
  (nombres de campo camelCase vs. snake_case en datos mock de `PagosPage.tsx`, sintaxis de Zod
  v3 sobrevivida tras el upgrade a Zod v4 ya presente en el proyecto, tipos incompletos en
  `IUsuarioPerfil`/`usuarios.service.ts`) — se corrigieron todos en la Fase 2 (build limpio
  verificado), documentados en detalle en `docs/DEPENDENCIAS.md`. Pendiente para esta fase:
  `vite build` avisa que el bundle principal pesa ~811 KB minificado — dividir por rutas con
  `React.lazy()` para no cargar todo el admin/cliente/trabajador en un solo chunk.
