# Especificación Completa de Casos de Uso — Actores, RF y RNF

Documento consolidado: reúne en un solo lugar, por cada uno de los **32 casos de uso** del
sistema, su descripción detallada, los **actores que participan**, los **requerimientos
funcionales (RF)** que lo implementan y los **requerimientos no funcionales (RNF)** que le
aplican. Es una re-organización de `01_ACTORES_DE_NEGOCIO.md`, `02_CASOS_DE_USO_UML.md` y
`11_REQUERIMIENTOS_FUNCIONALES.md` alrededor de una sola tabla por caso de uso, más el catálogo
de RNF (§2), que ninguno de los documentos anteriores tenía formalizado.

Una revisión anterior agregó 10 casos de uso (en su numeración de entonces: `CU-C09`–`CU-C11`,
`CU-T07`–`CU-T09`, `CU-A09`–`CU-A12`) tras auditar los 77 RF contra los 22 casos de uso
originales: quedaban RF ya implementados (autenticación de cliente y de staff, perfil propio,
gestión general de clientes, administración de cuentas de usuario, no-show automático) y RF
planeados (configurar el módulo de IA, recalcular niveles de fidelización, consultar mi nivel)
sin ningún caso de uso que los agrupara.

**Revisión posterior — renumeración de planeados**: los casos de uso planeados de cada actor se
renumeraron para quedar todos al final del rango de su actor (antes estaban intercalados con
los implementados). Además, `CU-A12 — Recalcular niveles de fidelización automáticamente`
(antiguo) se **retiró del catálogo de casos de uso**: es un proceso batch puramente automático
(RN20/RN21) sin ningún punto de decisión humana, así que ahora se documenta solo como regla de
negocio — a diferencia de CU-T09 (no-show), que sí conserva su modelado como caso de uso porque
tiene una consecuencia visible y accionable por el trabajador. Se agregó
`CU-A16 — Consultar métricas de fidelización` (nuevo). El total de casos de uso se mantiene en
32; el RF que quedó sin CU tras retirar CU-A12 se documenta en §4.

Los identificadores se mantienen sincronizados con el resto de `docs/`: `CU-Cxx` / `CU-Txx` /
`CU-Axx` (cliente/trabajador/admin), `RF-0xx`, `RN0x`/`RN2x`, y el nuevo `RNF-0x` introducido
aquí. Cualquier cambio futuro a un caso de uso debe reflejarse en los cuatro documentos por
igual.

**Trazabilidad CU ↔ RF**: cada ficha de §3 lista los RF que ese caso de uso **usa** —
cardinalidad **1 caso de uso → N requerimientos**, y esa lista sí puede incluir un RF cuyo caso
de uso de origen es otro (p. ej. CU-T08 usa RF-005/RF-006 aunque su origen sea CU-C10) cuando
ambos invocan el mismo endpoint. La dirección inversa es estricta: en
`11_REQUERIMIENTOS_FUNCIONALES.md` cada RF tiene exactamente **un** CU de origen (**N
requerimientos → 1 caso de uso**) — ver la nota de trazabilidad al inicio de ese documento.

---

## 1. Actores

### 1.1 Actores primarios (humanos, inician casos de uso)

| Actor | Descripción | Contexto de uso | Casos de uso que inicia |
|---|---|---|---|
| **Cliente** | Persona que reserva y recibe servicios de belleza. Mayor volumen de interacciones, menor superficie de permisos — solo actúa sobre sus propios datos. Sesión sin contraseña (magic link por WhatsApp). | Móvil, generalmente fuera del salón. | CU-C01 – CU-C14 |
| **Trabajador / Especialista** | Personal operativo (estilistas, manicuristas) que ejecuta los servicios. Nunca ve datos financieros del salón ni citas de otras especialistas — restricción de diseño explícita, no una versión reducida del admin. Sesión con email + contraseña. | Tablet o móvil compartido, en el salón, con las manos frecuentemente ocupadas. | CU-T01 – CU-T12 |
| **Administrador** | Dueña o gerente del salón; único actor con visión completa (operación, finanzas, configuración). **Generaliza** al Trabajador en UML — puede ejecutar todo lo que un Trabajador puede sobre cualquier especialista, más las secciones exclusivas de gestión. Sesión con email + contraseña. | Escritorio o tablet en el back-office. | CU-A01 – CU-A16, más todos los de Trabajador |

### 1.2 Actores secundarios (sistemas, sin iniciativa de negocio propia salvo Culqi)

| Actor | Naturaleza | Rol en el sistema |
|---|---|---|
| **WhatsApp Business API** (Meta Cloud API) | Externo, ya integrado | Canal exclusivo de magic link y notificaciones salientes. Welve siempre lo invoca; nunca al revés (sin webhook entrante). |
| **Motor de IA — Gemini** *(planeado)* | Externo, `docs/MODULO_ASESORIA_IA.md` | Recibe una imagen efímera + atributos del catálogo de estilos, devuelve un ranking. Puramente sincrónico dentro de una request. |
| **Pasarela de Pago — Culqi** *(planeado)* | Externo, `docs/MODULO_FIDELIZACION_AVANZADA.md` | Único actor secundario que **inicia** una interacción hacia Welve (webhook de confirmación de pago) — se autentica por firma criptográfica, no por sesión. |
| **Programador de Tareas — Celery Beat** | Interno | Dispara `verificar_no_show` (CU-T09) cada 5 min y, planeado, el recálculo de niveles de fidelización (RN20/RN21, sin caso de uso propio — ver §4) — inicia CU-T09 sin disparo humano directo. |

---

## 2. Requerimientos No Funcionales (RNF)

Catálogo nuevo, derivado de restricciones y decisiones ya presentes en el código y en
`docs/PRODUCT.md` / `docs/DESIGN.md` / `docs/tesis/03_ARQUITECTURA_DEL_SISTEMA.md` /
`docs/tesis/10_DIAGRAMA_DE_DESPLIEGUE.md` — no son aspiraciones genéricas, cada uno referencia
el mecanismo real que lo cumple.

### 2.1 Seguridad

| ID | Requerimiento | Cómo se cumple hoy |
|---|---|---|
| RNF-01 | Toda operación sobre un recurso protegido exige un JWT válido. | `core/security.py` — `crear_access_token`/`decodificar_access_token`, firma HS256; `Depends(obtener_usuario_actual)` en cada router protegido. |
| RNF-02 | El acceso a cada endpoint se restringe por rol, y el Trabajador nunca ve datos financieros ni citas de otras especialistas. | `Depends(requerir_rol(*roles))`; `GET /trabajador/agenda` resuelve `Personal` por `usuario_id` propio antes de consultar citas. |
| RNF-03 | Las contraseñas nunca se almacenan ni se transmiten en texto plano. | `bcrypt.hashpw`/`checkpw` con salt (`core/security.py`) — nunca comparación directa de strings. |
| RNF-04 | El magic link de un cliente es de un solo uso y expira. | `MagicLink.expira_en = ahora + 1h`, `usado=true` marcado atómicamente al verificar; un token reusado o vencido se rechaza. |
| RNF-05 | El backend solo acepta peticiones cross-origin de orígenes explícitamente permitidos. | `CORSMiddleware` con `allow_origin_regex=r"https://.*\.app\.github\.dev"` + `settings.cors_origins`, nunca `*` sin restricción. |
| RNF-06 *(planeado)* | Un webhook entrante (pago) se valida por firma criptográfica del payload, no por sesión de usuario. | Culqi es el único actor externo que abre conexión hacia Welve — no hay JWT de sesión del lado de la pasarela. |
| RNF-07 *(planeado)* | Ninguna imagen biométrica capturada para la asesoría de IA se persiste, y su captura requiere consentimiento explícito previo. | RN16 (consentimiento) y RN17 (descarte inmediato tras el análisis) — dato sensible, superficie de riesgo minimizada de raíz. |

### 2.2 Rendimiento y Concurrencia

| ID | Requerimiento | Cómo se cumple hoy |
|---|---|---|
| RNF-08 | Cargar N filas relacionadas nunca dispara N consultas individuales. | Patrón `Modelo.columna.in_(lista_de_ids)` en una sola query (`citas_service.listar_todas_con_nombres`), usado también para enriquecer el dashboard. |
| RNF-09 | Ninguna `AsyncSession` de SQLAlchemy ejecuta más de una operación a la vez. | Convención explícita del proyecto: nunca `asyncio.gather` sobre varios `session.execute()` de la misma sesión — siempre secuencial (a diferencia de un driver Motor/Beanie). |
| RNF-10 | Un canje concurrente del mismo código de descuento no debe generar dos usos válidos. | `SELECT ... FOR UPDATE` al aplicar un descuento (RN14) antes de validar `max_usos_global`/`max_usos_por_cliente`. |
| RNF-11 | Un envío de WhatsApp o una tarea periódica nunca bloquea el hilo de eventos web. | Worker y Beat de Celery corren como procesos separados del proceso Uvicorn, comunicados solo por Redis como broker. |

### 2.3 Disponibilidad y Confiabilidad

| ID | Requerimiento | Cómo se cumple hoy |
|---|---|---|
| RNF-12 | El marcado automático de inasistencia debe tolerar demoras razonables sin generar falsos positivos. | RN05: el beat corre cada 5 min y solo actúa sobre citas `confirmada` con 15+ min de retraso — margen calibrado a tráfico/parking real en Lima. |
| RNF-13 | Un proceso automático o un webhook reintentado no debe duplicar sus efectos. | `ON CONFLICT DO NOTHING` al generar el descuento premio de un reto (RN15); actualización idempotente de `PedidoCatalogo.estado` planeada para el webhook de Culqi (RN23). |
| RNF-14 | La conexión a base de datos debe sobrevivir al modo transacción del pooler de Supabase. | `connect_args={"statement_cache_size": 0}` obligatorio en todo engine asyncpg detrás de PgBouncer (`core/database.py`, `tasks/db.py`, `alembic/env.py`, y el engine de tests). |
| RNF-15 | Toda fecha/hora persistida y comparada usa una única zona horaria consistente. | `datetime` siempre *aware* en `America/Lima` (nunca naive), vía `ahora_lima()`/`a_lima()` — crítico para RN01/RN02 (cálculo de horas restantes) y RN05. |

### 2.4 Usabilidad y Accesibilidad

| ID | Requerimiento | Cómo se cumple hoy |
|---|---|---|
| RNF-16 | La interfaz cumple WCAG 2.1 AA. | Contraste mínimo 4.5:1 (texto de cuerpo) y 3:1 (texto grande/UI), navegación por teclado, soporte a `prefers-reduced-motion` (`docs/PRODUCT.md`, `docs/DESIGN.md`). |
| RNF-17 | Las acciones del Trabajador requieren el mínimo de pasos posible. | Diseñado para uso con las manos frecuentemente ocupadas entre tratamientos — registrar llegada/avanzar estado es una acción, no un formulario. |
| RNF-18 | El usuario nunca queda en duda sobre qué acaba de pasar. | Confirmaciones, errores, estados de carga y mensajes vacíos son parte del diseño (Principio de producto #6), no un *afterthought* — incluye la alerta explícita de ficha crítica (RN09). |
| RNF-19 | El flujo del Cliente se diseña primero para móvil. | Reserva y cancelación ocurren típicamente fuera del salón, desde el celular — mobile-first, no una adaptación responsive tardía. |

### 2.5 Mantenibilidad y Portabilidad

| ID | Requerimiento | Cómo se cumple hoy |
|---|---|---|
| RNF-20 | La lógica de negocio vive en un único lugar, independiente del transporte HTTP. | Arquitectura en capas estricta: `routers/` solo enrutan, `services/` concentra las reglas (RN01–RN24), el acceso a datos siempre pasa por SQLAlchemy. |
| RNF-21 | Todo cambio de esquema queda versionado y es reproducible. | Alembic (`alembic revision --autogenerate`) — nunca una alteración manual directa contra Supabase; `env.py` toma `DATABASE_URL` de `settings`, nunca hardcodeada. |
| RNF-22 | Los parámetros de negocio son configurables por entidad, no constantes globales. | `servicio.horas_cancelacion_sin_penalidad` y `servicio.monto_deposito` siempre se leen del servicio específico — nunca un valor fijo en código (regla explícita del proyecto). |

---

## 3. Casos de Uso — Ficha completa (Actores + RF + RNF + RN)

Formato por caso: **Actor(es)**, **Tipo/Prioridad**, **Descripción** (precondición → flujo →
postcondición, condensado), **RF relacionados**, **RNF relacionados**, **RN relacionadas**.

### 3.1 Cliente

#### CU-C01 — Reservar una cita

- **Actores**: Cliente (inicia). Sistema resuelve disponibilidad de Trabajador/Especialista.
- **Tipo**: primario · **Prioridad**: alta
- **Descripción**: con sesión iniciada y sin bloqueo, el cliente elige uno o más servicios, ve
  especialistas disponibles y elige horario dentro de la disponibilidad real (ya descontando
  buffer y citas existentes). El sistema valida bloqueo, ficha de salud si corresponde y
  solapamiento, y crea la `Cita` en `pendiente` con sus `CitaServicio`. Si el cliente está
  bloqueada, si el servicio requiere una ficha inexistente, o si el horario ya no está
  disponible (carrera con otra reserva), la reserva se rechaza con el código de error
  correspondiente (403 / 422 / 409) en vez de crearse.
- **RF**: RF-008 (listar servicios), RF-009 (listar categorías), RF-010 (disponibilidad),
  RF-015 (crear cita), RF-016 (listar mis citas)
- **RNF**: RNF-01, RNF-15, RNF-18, RNF-19
- **RN**: RN08, RN11, RN13

#### CU-C02 — Cancelar una cita a tiempo

- **Actores**: Cliente.
- **Tipo**: primario · **Prioridad**: alta · **Extiende**: CU-C01
- **Descripción**: cita propia en `pendiente`/`confirmada`, con horas restantes ≥ umbral del
  servicio. El cliente cancela con motivo opcional; el sistema marca `cancelada` sin
  penalidad y dispara el reembolso completo del depósito (confirmación manual del admin).
- **RF**: RF-017 (cancelar cita)
- **RNF**: RNF-01, RNF-15, RNF-22
- **RN**: RN01

#### CU-C03 — Cancelar una cita fuera de ventana (tardía)

- **Actores**: Cliente.
- **Tipo**: primario · **Prioridad**: alta · **Extiende**: CU-C01
- **Descripción**: idéntico a CU-C02, pero con horas restantes por debajo del umbral del
  servicio: `Cita.estado → cancelada_tardia`, `penalizacion_aplicada=true`, pierde el depósito.
- **RF**: RF-017 (cancelar cita)
- **RNF**: RNF-01, RNF-15, RNF-22
- **RN**: RN02

#### CU-C04 — Canjear un descuento

- **Actores**: Cliente.
- **Tipo**: primario · **Prioridad**: media
- **Descripción**: con un código vigente y cupo disponible, el cliente lo ingresa al pagar una
  cita. El sistema bloquea la fila del descuento para serializar canjes concurrentes, valida
  vigencia y límites de uso, y registra el `DescuentoUso`. Código inexistente/inactivo → 404;
  fuera de vigencia o cupo agotado → 422.
- **RF**: RF-053 (consultar mis descuentos), RF-054 (aplicar descuento)
- **RNF**: RNF-01, RNF-10, RNF-15
- **RN**: RN14

#### CU-C05 — Completar un reto de fidelización *(automático)*

- **Actores**: Cliente (pasivo — no ejecuta una acción explícita); disparado internamente al
  completar CU-T02.
- **Tipo**: secundario, disparado por el sistema · **Prioridad**: media
- **Descripción**: reto activo y vigente; el cliente acumula suficientes citas `completada`
  dentro de la ventana del reto. Al completarse una cita, el sistema evalúa todos los retos
  activos y, si alguno se cumple, genera un `Descuento` premio único e idempotente.
- **RF**: RF-052 (consultar mis retos), RF-059 (verificar retos completados)
- **RNF**: RNF-13, RNF-20
- **RN**: RN15

#### CU-C09 — Solicitar y verificar acceso por magic link

- **Actores**: Cliente (inicia); WhatsApp Business API (entrega el enlace).
- **Tipo**: primario · **Prioridad**: alta · **Precede a**: CU-C01 (toda acción del cliente
  requiere sesión iniciada)
- **Descripción**: sin precondición — es el punto de entrada del cliente. Ingresa su teléfono;
  el sistema busca o crea `Usuario`+`Cliente`, genera un `MagicLink` (TTL 1h) y lo envía por
  WhatsApp. Al abrir el enlace, el sistema valida que no esté usado ni expirado, lo marca
  `usado=true` atómicamente y emite un JWT. Token usado o vencido → error, debe solicitar uno
  nuevo.
- **RF**: RF-001 (solicitar acceso), RF-002 (verificar magic link)
- **RNF**: RNF-04, RNF-05
- **RN**: ninguna con ID propio

#### CU-C10 — Consultar y actualizar mi perfil

- **Actores**: Cliente.
- **Tipo**: primario · **Prioridad**: media
- **Descripción**: sesión iniciada. Consulta o edita nombre/teléfono/correo, con validación de
  unicidad antes de guardar.
- **RF**: RF-005 (consultar perfil), RF-006 (actualizar perfil)
- **RNF**: RNF-01
- **RN**: ninguna específica

#### CU-C11 — Consulta de asesoría de estilo con IA *(planeado)*

- **Actores**: Cliente (inicia); Motor de IA — Gemini (procesa la imagen).
- **Tipo**: primario · **Prioridad**: media · **Incluye**: envío posterior de la selección a
  CU-C01
- **Descripción**: módulo habilitado, consentimiento aceptado, límite diario no superado. El
  cliente captura una foto, el sistema la envía a Gemini junto al catálogo de estilos y
  descarta la foto de inmediato; Gemini devuelve un ranking del catálogo existente (nunca
  genera imágenes nuevas). El cliente elige uno o más estilos y los envía a su especialista,
  ligados a su próxima cita.
- **RF**: RF-060 (analizar imagen), RF-061 (consultar catálogo de estilos), RF-062 (enviar
  selección)
- **RNF**: RNF-01, RNF-07
- **RN**: RN16, RN17, RN18, RN19

#### CU-C12 — Marcar un estilo como favorito sin cámara *(planeado)*

- **Actores**: Cliente.
- **Tipo**: primario · **Prioridad**: baja
- **Descripción**: el cliente explora el catálogo de estilos directamente y marca uno o más
  como favoritos (`SeleccionEstilo` con `origen=favorito`, sin `ConsultaIA` asociada) — visible
  para la especialista junto a las selecciones generadas por IA, sin distinción de origen.
- **RF**: RF-065 (marcar como favorito)
- **RNF**: RNF-01, RNF-19
- **RN**: ninguna nueva

#### CU-C13 — Consultar mi nivel de fidelización y progreso *(planeado)*

- **Actores**: Cliente.
- **Tipo**: primario · **Prioridad**: media · **Extiende**: CU-C14 (contexto de decisión de
  compra en el catálogo exclusivo)
- **Descripción**: módulo de fidelización avanzada habilitado. El cliente ve su
  `NivelFidelizacion` actual y qué le falta (visitas o gasto) para el siguiente nivel — caso de
  uso de solo consulta.
- **RF**: RF-069 (consultar niveles), RF-071 (consultar mi nivel y progreso)
- **RNF**: RNF-01
- **RN**: RN20

#### CU-C14 — Comprar en el catálogo exclusivo *(planeado)*

- **Actores**: Cliente (inicia); Pasarela de Pago — Culqi (procesa y confirma el cobro).
- **Tipo**: primario · **Prioridad**: media · **Incluye**: CU-C04 (mismo concepto de canje,
  aplicado a un producto)
- **Descripción**: requiere `cliente.nivel_actual ≥ producto.nivel_minimo`. El cliente ve el
  catálogo (productos de nivel superior bloqueados con teaser), elige uno y paga vía Culqi; el
  sistema crea `PedidoCatalogo` en `pendiente` y, al recibir el webhook de confirmación, lo
  actualiza a `pagado` de forma idempotente. Nivel insuficiente → 403 también a nivel de API;
  pago rechazado → `cancelado`, sin efecto en el nivel.
- **RF**: RF-072 (consultar catálogo), RF-074 (comprar), RF-075 (confirmar pago vía webhook)
- **RNF**: RNF-06, RNF-13, RNF-01
- **RN**: RN20, RN21, RN22, RN23, RN24

### 3.2 Trabajador / Especialista

#### CU-T01 — Ver agenda del día

- **Actores**: Trabajador (o Admin).
- **Tipo**: primario · **Prioridad**: alta
- **Descripción**: sesión iniciada con rol `trabajador` (o `admin`); el sistema resuelve
  `Personal` por `usuario_id` y devuelve únicamente sus propias citas del día, sin datos de
  otras especialistas ni financieros.
- **RF**: RF-036 (consultar agenda propia)
- **RNF**: RNF-02, RNF-15, RNF-17
- **RN**: ninguna específica — regla de aislamiento de datos por rol

#### CU-T02 — Registrar llegada y avanzar el estado de una cita

- **Actores**: Trabajador (o Admin).
- **Tipo**: primario · **Prioridad**: alta
- **Descripción**: cita asignada a esa especialista (si el actor es Trabajador) y transición
  permitida según la tabla de transiciones válidas. Registra `hora_llegada_real`, confirma la
  cita, pasa a `en_curso` al llegar la clienta y a `completada` al terminar (dispara CU-C05).
  Transición no permitida → 422; ficha crítica sin confirmar al pasar a `en_curso` → ver CU-T03.
- **RF**: RF-018 (cambiar estado), RF-019 (registrar llegada)
- **RNF**: RNF-02, RNF-15, RNF-17, RNF-20
- **RN**: RN09, RN15

#### CU-T03 — Atender la alerta de ficha de salud crítica

- **Actores**: Trabajador.
- **Tipo**: primario · **Prioridad**: alta · **Extiende**: CU-T02
- **Descripción**: la clienta tiene al menos una `FichaSalud` con `severidad='critica'`. Al
  pasar la cita a `en_curso`, el sistema responde 422 con el detalle de las fichas críticas; la
  especialista las revisa y reenvía la petición con `confirmar_ficha_critica: true` para
  proceder.
- **RF**: RF-018 (cambiar estado — el detalle de las fichas críticas viaja en el cuerpo del
  error 422 de esta misma llamada; no se invoca RF-041 por separado)
- **RNF**: RNF-02, RNF-18
- **RN**: RN09

#### CU-T07 — Autenticarse como personal

- **Actores**: Trabajador o Admin.
- **Tipo**: primario · **Prioridad**: alta · **Precede a**: CU-T01
- **Descripción**: cuenta de staff ya creada (auto-registro o CU-A10). Ingresa correo y
  contraseña; el sistema valida credenciales y `esta_activo`, emite un JWT. El primer acceso de
  un rol nuevo pasa antes por el registro (nombre, correo, contraseña).
- **RF**: RF-003 (registrar personal), RF-004 (iniciar sesión staff)
- **RNF**: RNF-01, RNF-03
- **RN**: ninguna con ID propio

#### CU-T08 — Gestionar mi cuenta

- **Actores**: Trabajador o Admin.
- **Tipo**: primario · **Prioridad**: baja
- **Descripción**: sesión de staff iniciada. Consulta o edita su perfil y, opcionalmente,
  cambia su contraseña indicando la actual y una nueva de al menos 8 caracteres.
- **RF**: RF-005 (consultar perfil), RF-006 (actualizar perfil), RF-007 (cambiar contraseña)
- **RNF**: RNF-01, RNF-03
- **RN**: ninguna específica

#### CU-T09 — Marcar inasistencia automáticamente (no-show) *(automático)*

- **Actores**: Trabajador (dueño de la cita, pasivo); Programador de Tareas — Celery Beat
  (dispara el caso de uso).
- **Tipo**: secundario, disparado por el sistema · **Prioridad**: alta · **Extiende**: CU-T02
- **Descripción**: `Cita` en `confirmada` con `programada_en + 15min < now()` y sin
  `hora_llegada_real`. Cada 5 minutos el beat marca `no_show` las citas que cumplen la
  condición, aplicando la pérdida del depósito. Las citas `pendiente` nunca se ven afectadas.
- **RF**: RF-024 (verificar no-show automático)
- **RNF**: RNF-12, RNF-15
- **RN**: RN05 (el marcado manual equivalente lo cubre RN03, dentro de CU-T02)

#### CU-T10 — Iniciar una consulta de IA en vivo durante la cita *(planeado)*

- **Actores**: Trabajador (inicia); Motor de IA — Gemini.
- **Tipo**: primario · **Prioridad**: baja
- **Descripción**: misma mecánica que CU-C11, iniciada por la especialista durante la atención
  presencial; el resultado queda ligado a `personal_id` además de a la cita.
- **RF**: RF-060 (analizar imagen), RF-062 (enviar selección)
- **RNF**: RNF-07, RNF-17
- **RN**: RN16, RN17, RN18, RN19

#### CU-T11 — Consultar el historial de estilos de una clienta recurrente *(planeado)*

- **Actores**: Trabajador.
- **Tipo**: primario · **Prioridad**: media
- **Descripción**: la clienta tiene `SeleccionEstilo` previas ligadas a citas anteriores. La
  especialista abre el detalle de una cita agendada y ve el historial de esa clienta, sin
  volver a analizar ninguna foto.
- **RF**: RF-063 (consultar historial de estilos)
- **RNF**: RNF-02
- **RN**: RN19

#### CU-T12 — Dar feedback sobre el resultado de un estilo *(planeado)*

- **Actores**: Trabajador.
- **Tipo**: primario · **Prioridad**: baja · **Extiende**: CU-T02
- **Descripción**: la cita tiene una `SeleccionEstilo` asociada y acaba de pasar a
  `completada`. La especialista marca si el resultado coincidió con el estilo elegido (sí/no +
  nota); no afecta al cliente, alimenta la métrica de confianza del catálogo (CU-A12).
- **RF**: RF-064 (registrar feedback de estilo)
- **RNF**: RNF-17
- **RN**: ninguna nueva

### 3.3 Administrador

#### CU-A01 — Gestionar personal y su disponibilidad

- **Actores**: Admin.
- **Tipo**: primario · **Prioridad**: alta
- **Descripción**: da de alta un trabajador en dos pasos — crea la cuenta `Usuario` (RF-045,
  reutilizado de CU-A10) y luego el `Personal` asociado — define especialidad, comisión, tipo
  de contrato y disponibilidad semanal (día/hora/buffer). Incluye también, dentro del mismo
  caso de uso de gestión administrativa, la configuración de categorías/servicios y la creación
  directa de citas para un cliente.
- **Incluye**: CU-A10 (paso de creación de la cuenta, antes de crear el `Personal`).
- **RF**: RF-011–RF-014 (categorías/servicios), RF-022 (crear cita para un cliente), RF-030–
  RF-035 (CRUD de personal y disponibilidad)
- **RNF**: RNF-02, RNF-20, RNF-21, RNF-22
- **RN**: RN13

#### CU-A02 — Confirmar, rechazar o reembolsar un pago

- **Actores**: Admin.
- **Tipo**: primario · **Prioridad**: alta
- **Descripción**: `Pago` en `pendiente` (confirmar/rechazar) o `confirmado` (reembolsar). El
  admin revisa el comprobante fuera del sistema y confirma o rechaza manualmente, registrando
  `confirmado_por` y `fecha_confirmacion` — proceso manual, sin integración automática con la
  fuente del pago original.
- **RF**: RF-023 (consultar pagos de una cita), RF-025 (registrar pago), RF-026 (listar pagos
  pendientes — origen en CU-A06, reutilizado aquí para elegir qué confirmar/rechazar),
  RF-027–RF-029 (confirmar/rechazar/reembolsar pago)
- **RNF**: RNF-02, RNF-20
- **RN**: ninguna nueva (proceso manual)

#### CU-A03 — Configurar un descuento o un reto

- **Actores**: Admin.
- **Tipo**: primario · **Prioridad**: media
- **Descripción**: crea `Descuento` (tipo, scope, código, valor, límites, vigencia) o `Reto`
  (visitas, ventana, recompensa). Limitación actual: solo crear y listar — sin edición ni
  borrado (ver `docs/FASES.md`, Fase 3).
- **RF**: RF-055–RF-058 (listar/crear descuentos y retos)
- **RNF**: RNF-02, RNF-20
- **RN**: ninguna nueva

#### CU-A06 — Ver el dashboard operativo

- **Actores**: Admin.
- **Tipo**: primario · **Prioridad**: alta
- **Descripción**: el sistema carga en paralelo (a nivel de frontend; secuencial dentro de cada
  sesión de base de datos) citas del día, pagos pendientes y personal activo; muestra KPIs en
  tipografía display bold. Extensión planeada: widgets de distribución por nivel de
  fidelización y de uso de IA (ver CU-A16).
- **RF**: RF-021 (listar todas las citas), RF-026 (listar pagos pendientes)
- **RNF**: RNF-08, RNF-16, RNF-18
- **RN**: ninguna nueva

#### CU-A09 — Gestionar clientes

- **Actores**: Admin.
- **Tipo**: primario · **Prioridad**: media
- **Descripción**: lista clientes con etiquetas y estado de bloqueo, consulta el detalle de una
  clienta con su historial de citas, edita etiquetas/notas internas (nunca `correo`/`password`
  — ver CU-A10), registra o consulta sus fichas de salud, y bloquea/desbloquea con motivo cuando
  corresponde. Intento de editar `correo`/`password` por este flujo → 422.
- **RF**: RF-037 (listar clientes), RF-038 (consultar cliente), RF-039 (editar cliente), RF-040
  (historial de citas), RF-041 (listar fichas de salud), RF-042 (registrar ficha de salud),
  RF-043 (bloquear), RF-044 (desbloquear)
- **RNF**: RNF-02, RNF-20
- **RN**: RN08, RN11

#### CU-A10 — Administrar cuentas de usuario del staff

- **Actores**: Admin.
- **Tipo**: primario · **Prioridad**: media
- **Descripción**: crea una cuenta de cualquier rol (RF-045 — si `rol=cliente`, crea también el
  `Cliente` vinculado), lista/consulta usuarios por rol y estado, edita nombre/teléfono, cambia
  el correo (resetea `correo_verificado=false`), resetea contraseña sin conocer la actual, y
  activa/desactiva la cuenta — única vía autorizada para tocar credenciales ajenas (ver CU-T08
  para autogestión).
- **RF**: RF-045 (crear usuario), RF-046 (listar usuarios), RF-047 (consultar usuario), RF-048
  (editar usuario), RF-049 (cambiar correo), RF-050 (resetear contraseña), RF-051 (cambiar
  estado)
- **RNF**: RNF-02, RNF-03
- **RN**: ninguna con ID propio

#### CU-A11 — Gestionar el catálogo de estilos para la IA *(planeado)*

- **Actores**: Admin (o especialista con permiso delegado).
- **Tipo**: primario · **Prioridad**: media · **Base de**: CU-A12
- **Descripción**: carga estilos de referencia (`EstiloCatalogo`) una sola vez, con imagen y
  atributos — única fuente de imágenes del módulo, evitando generar/almacenar una imagen nueva
  por cada consulta de cliente.
- **RF**: RF-066 (gestionar catálogo de estilos)
- **RNF**: RNF-02, RNF-07
- **RN**: RN16, RN17, RN18, RN19

#### CU-A12 — Revisar métricas de confianza del catálogo de estilos *(planeado)*

- **Actores**: Admin.
- **Tipo**: primario · **Prioridad**: baja · **Extiende**: CU-A11
- **Descripción**: con al menos un feedback registrado (CU-T12), el admin ve, por estilo, el
  porcentaje de feedback positivo, para decidir si ajustar o retirar el estilo del catálogo.
- **RF**: RF-068 (consultar métricas de uso de IA)
- **RNF**: RNF-02
- **RN**: ninguna nueva

#### CU-A13 — Configurar el módulo de asesoría de IA *(planeado)*

- **Actores**: Admin.
- **Tipo**: primario · **Prioridad**: media · **Extiende**: CU-A11
- **Descripción**: módulo de IA implementado y disponible para configuración. Activa o
  desactiva el módulo y define el límite diario de consultas de IA por cliente; efectivo desde
  la siguiente consulta (CU-C11/CU-T10).
- **RF**: RF-067 (configurar módulo de IA)
- **RNF**: RNF-02, RNF-07
- **RN**: RN18

#### CU-A14 — Configurar niveles de fidelización y catálogo exclusivo *(planeado)*

- **Actores**: Admin.
- **Tipo**: primario · **Prioridad**: media
- **Descripción**: define `NivelFidelizacion` (umbral y beneficios), carga
  `ProductoCatalogoExclusivo` con su `nivel_minimo`, consulta pedidos.
- **RF**: RF-070 (gestionar niveles), RF-073 (gestionar catálogo exclusivo)
- **RNF**: RNF-02, RNF-21
- **RN**: RN20, RN21, RN22, RN23, RN24

#### CU-A15 — Gestionar pedidos del catálogo exclusivo *(planeado)*

- **Actores**: Admin.
- **Tipo**: primario · **Prioridad**: media · **Extiende**: CU-A14
- **Descripción**: existe al menos un `PedidoCatalogo` en `pagado`. El admin filtra pedidos por
  estado/cliente/producto, abre el detalle y, tras la entrega física, lo marca `entregado`.
  Marcar entregado un pedido no `pagado` → 422.
- **RF**: RF-076 (gestionar pedidos del catálogo)
- **RNF**: RNF-02, RNF-13
- **RN**: RN23

#### CU-A16 — Consultar métricas de fidelización *(planeado)*

- **Actores**: Admin.
- **Tipo**: primario · **Prioridad**: baja · **Incluido en**: CU-A06 (widgets del dashboard
  operativo)
- **Descripción**: módulo de fidelización avanzada habilitado, al menos un cliente con nivel
  asignado. El admin consulta, desde el dashboard operativo, la distribución de clientes por
  nivel de fidelización y los ingresos del catálogo exclusivo del mes — agregados de solo
  lectura, sin ninguna acción de escritura propia.
- **RF**: RF-078 (consultar métricas de fidelización)
- **RNF**: RNF-02
- **RN**: ninguna nueva — lee el resultado de RN20/RN21 (recálculo de niveles, sin caso de uso
  propio) y de las compras de CU-C14

---

## 4. RF sin caso de uso dedicado

Dos RF quedan sin un caso de uso propio — deliberadamente, en ambos casos:

| RF | Nombre | Actor(es) | Motivo |
|---|---|---|---|
| RF-020 | Consultar servicios de una cita | Trabajador, Admin | Lectura de detalle que la UI dispara dentro de CU-T02/CU-A02 (ver el detalle de los servicios ya cobrados de una cita) — no es, por sí sola, un objetivo que el actor persiga de forma independiente |
| RF-077 | Recalcular niveles de fidelización | Sistema (Celery Beat) | Proceso batch puramente automático (RN20/RN21), sin ningún punto de decisión humana ni consecuencia que un actor deba atender en el momento — se documenta como regla de negocio y en `06_DIAGRAMAS_DE_ACTIVIDAD.md`, no como caso de uso. A diferencia de CU-T09 (no-show), que sí tiene una consecuencia visible y accionable por el trabajador |

---

## 5. Resumen cuantitativo

| Dimensión | Cantidad |
|---|---|
| Actores primarios | 3 (Cliente, Trabajador/Especialista, Administrador) |
| Actores secundarios | 4 (WhatsApp, Gemini *(planeado)*, Culqi *(planeado)*, Celery Beat) |
| Casos de uso | 32 (11 Cliente, 9 Trabajador, 12 Admin) — 19 implementados, 13 planeados |
| Requerimientos funcionales (RF) | 78 (59 implementados, 19 planeados) — 76 cubiertos por un caso de uso, 2 de apoyo sin CU propio (§4) |
| Requerimientos no funcionales (RNF) | 22 (5 categorías: Seguridad, Rendimiento/Concurrencia, Disponibilidad/Confiabilidad, Usabilidad/Accesibilidad, Mantenibilidad/Portabilidad) |
| Reglas de negocio (RN) | 19 (10 implementadas, 9 planeadas) — numeración con huecos intencionales en RN04, RN06, RN07, RN10, RN12 (ver `docs/REGLAS_DE_NEGOCIO.md`); el ID más alto es RN24 |
