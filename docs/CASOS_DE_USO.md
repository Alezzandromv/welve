# Casos de Uso — Welve

Formato por caso: **Actor**, **Precondición**, **Flujo principal**, **Flujos alternativos /
error**, **Postcondición**, **RN involucradas**.

## Convención de numeración (revisión actual)

Esta es una revisión del catálogo que **reemplaza** la numeración anterior por actor
(`CU-C0x`/`CU-T0x`/`CU-A0x`) por un solo espacio de numeración compartido, **CUS01–CUS21**,
ordenado de mayor a menor importancia dentro de cada actor. Es el catálogo oficial vigente —
los casos redundantes o ambiguos de la revisión anterior se fusionaron o se eliminaron; el
mapeo completo hacia la numeración anterior queda documentado en
`docs/tesis/02_CASOS_DE_USO_UML.md#mapeo-con-la-numeración-anterior` para no perder trazabilidad
con el resto de los documentos de tesis.

- **`(TPn)`**: entregable del curso en el que se construyó esa funcionalidad (TP1–TP4). Los
  casos sin etiqueta son transversales o se completaron junto con el TP indicado en un caso
  vecino del mismo actor.
- **`(pendiente)`**: caso de uso ya definido como objetivo del sistema, pero **sin el endpoint
  de backend correspondiente todavía** (hoy solo CUS06). Distinto de "planeado": no es un
  módulo nuevo fuera de alcance, es una funcionalidad que falta dentro del alcance actual.
- **`(brecha de permisos)`**: el endpoint ya existe pero está restringido a un rol distinto del
  que debería poder usarlo según este catálogo (CUS12, CUS14 — ver el flujo de cada uno).
- **Casos de uso fusionados**: cancelar a tiempo y cancelar tarde eran dos casos de uso
  separados (antes `CU-C02`/`CU-C03`); ahora es un solo **CUS08** con un flujo alternativo
  según el umbral de horas. Lo mismo ocurre con registrar llegada, atender ficha crítica y
  marcar no-show automático (antes `CU-T02`/`CU-T03`/`CU-T09`), unificados en **CUS11**.
- Los casos de uso de los dos módulos planeados (asesoría de estilo con IA, fidelización
  avanzada con catálogo exclusivo) siguen documentados en detalle — se movieron a un apéndice al
  final de este archivo, numerados **CUS22–CUS34**, porque no forman parte del alcance de
  TP1–TP4 pero sí del diseño completo del sistema evaluado en la tesis.

Para el detalle de los **requerimientos funcionales (RF)** que implementa cada caso de uso, ver
`docs/tesis/11_REQUERIMIENTOS_FUNCIONALES.md` y `docs/tesis/12_CASOS_DE_USO_RF_RNF.md` —
**pendientes de resincronizar** con esta numeración (ver nota en `docs/tesis/README.md`).
Convención de trazabilidad: **un caso de uso agrupa de 1 a N requerimientos funcionales**; cada
requerimiento funcional, a su vez, **tiene un único caso de uso de origen** — si dos casos de
uso invocan el mismo endpoint (p. ej. CUS05/CUS07 sobre `GET /citas/mis-citas`, o CUS03/CUS16
sobre la misma validación de disponibilidad), el requerimiento se documenta una sola vez en su
caso de uso de origen y el otro lo referencia en prosa, nunca como una segunda entrada formal.

Un proceso automático sin ningún punto de decisión humana (p. ej. el recálculo periódico de
niveles de fidelización) no se modela como caso de uso propio — se documenta directamente como
regla de negocio (ver `docs/REGLAS_DE_NEGOCIO.md`, RN14/RN15). Lo mismo aplica a reglas de
negocio que son política del salón pero aún no tienen ningún flujo ni endpoint que las cubra
(RN08, reclamos post-servicio) — quedan documentadas solo en `docs/REGLAS_DE_NEGOCIO.md` hasta
que se digitalicen. El no-show automático sí se mantiene como flujo alternativo de CUS11 pese a
dispararlo Celery Beat, porque tiene una
consecuencia visible y accionable por el trabajador (pierde el depósito, cambia su agenda).

---

## Cliente

### CUS01 — Solicitar y verificar acceso por magic link (TP1)

- **Actor**: Cliente.
- **Precondición**: ninguna — es el punto de entrada del cliente al sistema.
- **Flujo principal**: el cliente ingresa su teléfono (`POST /auth/solicitar-acceso`); el
  backend busca o crea el `Usuario`+`Cliente`, genera un `MagicLink` (UUID, TTL 1h) y lo envía
  por WhatsApp si `acepta_whatsapp=true`. Al abrir el enlace, `GET /auth/verificar?token=xxx`
  valida que no esté usado ni expirado, lo marca `usado=true` atómicamente, y devuelve un JWT.
- **Flujos alternativos**: token usado o expirado → error, el cliente debe solicitar uno nuevo.
  Teléfono sin WhatsApp habilitado (`acepta_whatsapp=false`) → el link no se envía; el flujo
  queda documentado como excepción operativa, no como error de API.
- **Postcondición**: sesión de cliente iniciada; el token queda inutilizado para siempre.
- **RN**: RN09 (validez de 1h y uso único del magic link).

### CUS02 — Consultar y actualizar perfil

- **Actor**: Cliente.
- **Precondición**: sesión iniciada.
- **Flujo principal**: `GET/PATCH /auth/perfil` — el cliente consulta o edita nombre, teléfono
  y correo, con validación de unicidad antes de guardar.
- **Postcondición**: `Usuario` actualizado.
- **RN**: ninguna específica.

### CUS03 — Reservar cita (TP2)

- **Actor**: Cliente.
- **Precondición**: sesión iniciada (JWT vía magic link); cliente no bloqueada
  (`esta_bloqueada=false`).
- **Flujo principal**: el cliente abre `Reservar`, elige uno o más servicios, elige
  especialista y horario dentro de la disponibilidad real mostrada (ya descontando buffer y
  citas existentes), confirma. El backend valida bloqueo (RT02), ficha de salud si el servicio
  la requiere (RN07), solapamiento (RT03), y crea la cita en estado `pendiente`.
- **Flujos alternativos**: si el cliente está bloqueada → 403 con mensaje genérico (RT02). Si
  el horario ya no está disponible (otra reserva ganó la carrera) → 409, el frontend refresca
  la disponibilidad. Si el servicio requiere ficha de salud y no existe una activa → 422, el
  frontend indica que debe contactar al salón para registrarla.
- **Postcondición**: `Cita` creada en `pendiente`, con sus `CitaServicio` asociados; el cliente
  ve el monto de depósito requerido (`servicio.monto_deposito`) para continuar en CUS04 —
  mientras no lo pague, la reserva no garantiza atención (RN06).
- **RN**: RN06, RN07, RT02, RT03.

### CUS04 — Realizar pago de cita (TP2)

- **Actor**: Cliente.
- **Precondición**: `Cita` creada en `pendiente` (CUS03) con un depósito pendiente de pago.
- **Flujo principal**: el sistema no integra ninguna pasarela de pago todavía (ver Fase 3 de
  `docs/FASES.md` para Culqi, planeado) — el cliente paga el depósito **fuera del sistema**
  (Yape, Plin, transferencia o efectivo en el local) y envía el comprobante por WhatsApp o lo
  presenta en persona. El admin registra y confirma ese pago manualmente (`POST /admin/pagos`,
  luego `PATCH /admin/pagos/{id}/confirmar` — ver CUS18).
- **Flujos alternativos**: comprobante ilegible o monto incorrecto → el admin rechaza el pago
  (`PATCH /admin/pagos/{id}/rechazar`) y el cliente debe reenviarlo; ver CUS18.
- **Postcondición**: `Pago` con `tipo=deposito` y `estado=confirmado`, visible en el historial
  de pagos de la cita. Es este pago el que convierte la reserva `pendiente` en una atención
  garantizada (RN06).
- **RN**: RN06 — el monto se lee siempre de `servicio.monto_deposito` (ver notas transversales
  en `docs/REGLAS_DE_NEGOCIO.md`), nunca un valor fijo.

### CUS05 — Consultar citas

- **Actor**: Cliente.
- **Precondición**: sesión iniciada.
- **Flujo principal**: `GET /citas/mis-citas` devuelve todas las citas propias, enriquecidas con
  nombre de especialista y servicios (`enriquecer_cita()`); `MisCitas` las agrupa en "próximas"
  (`pendiente`, `confirmada`, `en_curso`) para seguimiento inmediato.
- **Postcondición**: ninguna — caso de uso de solo consulta.
- **RN**: ninguna específica.

### CUS06 — Reprogramar cita (pendiente)

- **Actor**: Cliente.
- **Estado**: **no implementado** — no existe hoy ningún endpoint de reprogramación
  (`backend/app/routers/citas.py` solo expone crear, cancelar, cambiar estado y registrar
  llegada). Se documenta el flujo deseado para dejarlo listo para construir.
- **Precondición (deseada)**: cita propia en `pendiente` o `confirmada`, con al menos las mismas
  horas de anticipación que exige `servicio.horas_cancelacion_sin_penalidad` para cancelar sin
  penalidad (mismo umbral que RN01, para no convertir la reprogramación en un atajo alrededor
  de la penalidad de cancelación tardía).
- **Flujo principal (deseado)**: el cliente elige un nuevo horario/especialista para una cita
  existente; el backend revalida disponibilidad (RT03) y ficha de salud (RN07) igual que en una
  reserva nueva (CUS03), y mueve `programada_en`/`termina_en` sin crear una `Cita` nueva ni
  tocar el `Pago` ya confirmado del depósito.
- **Flujos alternativos (deseados)**: fuera de la ventana de anticipación → se ofrece cancelar
  (CUS08, con su penalidad correspondiente) en vez de reprogramar. Nuevo horario no disponible →
  409, igual que en CUS03.
- **Postcondición (deseada)**: `Cita.programada_en`/`termina_en` actualizados; sin impacto en
  `Pago` ni en el depósito ya pagado.
- **RN**: ninguna todavía — a definir junto con la implementación (candidatas: RN01 como techo
  de anticipación mínima, RT03 para la nueva franja).

### CUS07 — Consultar historial de servicios

- **Actor**: Cliente.
- **Precondición**: sesión iniciada.
- **Flujo principal**: reutiliza el mismo `GET /citas/mis-citas` de CUS05 — `MisCitas` filtra del
  lado del cliente las citas en estado terminal (`completada`, `cancelada`,
  `cancelada_tardia`, `no_show`) para la sección de historial, evitando un segundo endpoint para
  la misma fuente de datos.
- **Postcondición**: ninguna — caso de uso de solo consulta.
- **RN**: ninguna específica.

### CUS08 — Cancelar cita

- **Actor**: Cliente.
- **Precondición**: cita propia en estado `pendiente` o `confirmada`.
- **Flujo principal**: cliente cancela desde `MisCitas` indicando un motivo opcional
  (`PATCH /citas/{id}/cancelar`). El backend calcula horas hasta la cita vs.
  `servicio.horas_cancelacion_sin_penalidad` (el mayor umbral entre los servicios de la cita) y
  decide entre las dos ramas siguientes.
- **Flujos alternativos**:
  - **Cancela con ≥ N horas de anticipación** → `Cita.estado = cancelada`,
    `penalizacion_aplicada = false`, reembolso completo del depósito (proceso manual de
    confirmación de reembolso por admin, `Pago.tipo = reembolso` — ver CUS18) (RN01).
  - **Cancela con < N horas de anticipación** → `Cita.estado = cancelada_tardia`,
    `penalizacion_aplicada = true`, pierde el depósito (RN02).
  - Si la cita ya no está en un estado cancelable (p. ej. `en_curso` o `completada`) → 422.
- **Postcondición**: `Cita.estado` en `cancelada` o `cancelada_tardia` según la rama.
- **RN**: RN01, RN02.

### CUS09 — Consultar y canjear beneficios de fidelización

> Renombrado desde "Consultar beneficio" — el nombre anterior no dejaba ver que el caso de uso
> también incluye el canje, no solo la consulta.

- **Actor**: Cliente.
- **Precondición**: sesión iniciada; para el canje, código de descuento vigente con cupo global
  y personal disponibles.
- **Flujo principal**: el cliente consulta sus retos en curso (`GET /fidelizacion/mis-retos`) y
  sus descuentos disponibles (`GET /fidelizacion/mis-descuentos`, incluyendo los que se generan
  automáticamente al completar un reto — ver flujo automático más abajo). Al pagar una cita,
  ingresa un código de descuento (`POST /fidelizacion/aplicar-descuento`); el backend valida
  vigencia, `max_usos_global` y `max_usos_por_cliente` (RT04) bajo bloqueo optimista (`SELECT
  ... FOR UPDATE`) para evitar doble canje concurrente, y registra el uso.
- **Flujo automático (sin acción del cliente)**: al completarse la N-ésima cita que cumple el
  umbral de un reto (disparado desde `cambiar_estado` en CUS11 al pasar una cita a
  `completada`), el sistema genera un `Descuento` premio único para ese cliente y ese reto
  (idempotente vía `ON CONFLICT DO NOTHING`), sin que el cliente tenga que "reclamarlo" (RT05).
- **Flujos alternativos**: código inexistente/inactivo → 404. Vigencia fuera de rango, cupo
  global agotado, o cupo personal agotado → 422 con mensaje específico.
- **Postcondición**: `DescuentoUso` registrado, ligado a la cita y al cliente; o un nuevo
  `Descuento` visible en `mis-descuentos` sin acción explícita.
- **RN**: RT04, RT05.

---

## Trabajador / Especialista

### CUS10 — Consultar agenda del día

- **Actor**: Trabajador.
- **Flujo principal**: `GET /trabajador/agenda` devuelve únicamente las citas de la
  especialista autenticada (resuelta por `usuario_id` → `Personal`), nunca las de otras
  especialistas ni datos financieros.
- **RN**: ninguna específica — regla de aislamiento de datos por rol.

### CUS11 — Actualizar estado de la cita

> Renombrado desde "Actualizar cita / estado de cita" — el nombre anterior repetía "cita" y no
> deja claro que el foco es la transición de estado, no una edición general de la cita (eso es
> CUS06, reprogramar).

- **Actor**: Trabajador (o admin, sobre cualquier cita — ver CUS16).
- **Precondición**: cita asignada a esa especialista (si el actor es trabajador — admin puede
  operar cualquier cita); estado actual permite la transición (`_TRANSICIONES_VALIDAS`).
- **Flujo principal**: registra `hora_llegada_real` (`PATCH /citas/{id}/llegada`, independiente
  del cambio de estado), confirma la cita, y al llegar la clienta la pasa a `en_curso` y luego
  `completada` (`PATCH /citas/{id}/estado`). Al pasar a `completada` se dispara CUS09
  automáticamente (RT05).
- **Flujos alternativos**:
  - Transición no permitida por la tabla de estados → 422.
  - **Ficha de salud crítica sin confirmar** al intentar pasar a `en_curso`: la API responde 422
    con `codigo: FICHA_CRITICA` y el detalle de las fichas; la especialista las revisa (ver
    CUS12) y reenvía la misma petición con `confirmar_ficha_critica: true` para proceder (RT01).
  - **No-show marcado manualmente**: la especialista o el admin pasa la cita directamente a
    `no_show` (mismo endpoint, `PATCH /citas/{id}/estado`) cuando la clienta avisó que no llega o
    el staff constata la ausencia antes de que corra el margen de tolerancia — pierde el depósito
    igual que la rama automática (RN03).
  - **No-show automático**: si la cita queda `confirmada` con `programada_en + 15min < now()` y
    sin `hora_llegada_real`, Celery Beat (actor secundario) la marca `no_show` cada 5 minutos sin
    intervención humana, aplicando el margen de tolerancia de RN04 — con la misma pérdida de
    depósito (RN03). Las citas en `pendiente` nunca se ven afectadas.
- **Postcondición**: estado de cita actualizado.
- **RN**: RN03, RN04, RT01, RT05.

### CUS12 — Consultar alertas de salud de la clienta (brecha de permisos)

> Renombrado desde "Consultar alertas de salud" para dejar explícito que es sobre la clienta,
> no una alerta general del sistema.

- **Actor**: Trabajador.
- **Estado**: **brecha de permisos** — hoy la especialista solo se entera de una ficha crítica
  de forma reactiva, cuando el 422 de CUS11 se lo muestra al intentar iniciar el servicio.
  El endpoint que permitiría consultarlo de forma proactiva (`GET
  /clientes/{cliente_id}/fichas-salud`) existe pero está restringido a `admin`
  (`requerir_rol("admin")` en `backend/app/routers/clientes.py`) — el trabajador no puede
  llamarlo hoy. Documentado en `docs/ROLES_Y_PERMISOS.md` y como pendiente en `docs/FASES.md`.
- **Precondición (deseada)**: cita propia agendada con esa clienta.
- **Flujo principal (deseado)**: antes de que la clienta llegue, la especialista consulta sus
  fichas de salud registradas (tipo de restricción, descripción, severidad) desde el detalle de
  la cita en su agenda — sin tener que esperar al bloqueo de CUS11 para enterarse.
- **Postcondición**: ninguna — caso de uso de solo consulta.
- **RN**: RN07, RT01.

### CUS13 — Gestionar cuenta personal

- **Actor**: Trabajador o Admin.
- **Precondición**: cuenta de staff ya creada (auto-registro o CUS15).
- **Flujo principal**: se autentica (`POST /auth/login` con correo + contraseña; el primer
  acceso de un rol nuevo pasa antes por `POST /auth/registrar`), y consulta o edita su perfil
  (`GET/PATCH /auth/perfil`) y, opcionalmente, cambia su contraseña
  (`POST /auth/cambiar-password`) indicando la actual.
- **Flujos alternativos**: credenciales inválidas → 401. Cuenta desactivada → 403. Contraseña
  actual incorrecta al cambiarla → 401.
- **Postcondición**: sesión de staff iniciada; o `Usuario` (y su hash de contraseña, si aplica)
  actualizado.
- **RN**: ninguna con ID propio.

### CUS14 — Consultar historial de cliente (brecha de permisos)

- **Actor**: Trabajador.
- **Estado**: **brecha de permisos** — el endpoint `GET /clientes/{cliente_id}/historial` existe
  y devuelve las citas pasadas de la clienta, pero también está restringido a `admin` hoy. Mismo
  caso que CUS12: la especialista no puede consultarlo todavía, aunque conocer el historial de
  una clienta recurrente (qué se hizo, con qué frecuencia) es información operativa razonable
  para prepararse, no financiera ni de otras especialistas — por lo que ampliar el guard de rol
  a `requerir_rol("admin", "trabajador")` no debería violar el principio de aislamiento de datos
  del trabajador (ver `docs/tesis/01_ACTORES_DE_NEGOCIO.md`).
- **Precondición (deseada)**: la clienta tiene al menos una cita previa en el salón.
- **Flujo principal (deseado)**: la especialista abre el detalle de una clienta agendada y ve su
  historial de citas anteriores (servicios, fecha, con qué especialista), útil para preparar la
  atención sin depender de la memoria de quién la atendió antes.
- **Postcondición**: ninguna — caso de uso de solo consulta.
- **RN**: ninguna específica.

---

## Admin

### CUS15 — Gestionar personal (TP4)

- **Actor**: Admin.
- **Incluye**: creación de la cuenta de staff (mismo flujo de `POST /api/v1/admin/usuarios` que
  usa CUS13 para autenticarse después).
- **Flujo principal**: crea la cuenta `Usuario` (rol `trabajador`) y luego el `Personal`
  asociado (flujo de dos pasos, ver `CLAUDE.md`), define especialidad, comisión, tipo de
  contrato, y su disponibilidad semanal (día, hora inicio/fin, buffer). También administra
  cuentas de staff existentes: lista/consulta por rol y estado, edita nombre/teléfono, cambia el
  correo (resetea `correo_verificado=false`), resetea contraseña sin conocer la actual, y
  activa/desactiva la cuenta.
- **Postcondición**: `Usuario`/`Personal`/`DisponibilidadPersonal` creados o actualizados.
- **RN**: RT03 (el buffer configurado aquí es el que se valida en cada reserva de CUS03/CUS16).

### CUS16 — Gestionar citas (TP4)

- **Actor**: Admin.
- **Flujo principal**: `GET /admin/citas` lista todas las citas del salón (no solo las propias,
  a diferencia de CUS10) con filtros; `POST /admin/citas` crea una cita en nombre de un cliente
  (p. ej. una reserva telefónica o presencial), con las mismas validaciones que CUS03 (RN06,
  RN07, RT02, RT03). Para avanzar el estado o cancelar una cita ya creada, el admin usa los mismos
  endpoints que CUS11/CUS08 — sin restricción de "solo mis citas".
- **Flujos alternativos**: los mismos que CUS03 para la creación (bloqueo, ficha de salud
  faltante, solapamiento). Cuando dos solicitudes compiten por el mismo horario (una con depósito
  confirmado, otra sin él), el admin prioriza manualmente a la que ya pagó (RN05) — hoy sin cola
  de espera ni endpoint dedicado, ver `docs/REGLAS_DE_NEGOCIO.md`.
- **Postcondición**: `Cita` creada o listada según la operación.
- **RN**: RN05, RN06, RN07, RT02, RT03 (compartidas con CUS03; no se redocumentan aparte).

### CUS17 — Gestionar clientes (TP4)

- **Actor**: Admin.
- **Flujo principal**: lista clientes con etiquetas y estado de bloqueo, consulta el detalle de
  una clienta con su historial de citas (`GET /clientes/{id}/historial`), edita
  etiquetas/notas internas (nunca `correo`/`password` — ver CUS15), registra o consulta sus
  fichas de salud (`GET/POST /clientes/{id}/fichas-salud`, con tipo de restricción, descripción
  y severidad), y bloquea/desbloquea con motivo cuando corresponde.
- **Flujos alternativos**: intento de editar `correo`/`password` por este flujo → 422. Nota: el
  detalle de una ficha con `severidad='critica'` también se muestra automáticamente al
  trabajador dentro de CUS11 (RT01), sin que este necesite hoy una consulta propia — ver la
  brecha de permisos documentada en CUS12/CUS14.
- **Postcondición**: `Cliente` actualizado; si aplica, `esta_bloqueada`/`motivo_bloqueo`; si
  aplica, nueva `FichaSalud` registrada.
- **RN**: RN07, RT02.

### CUS18 — Gestionar pagos y reembolsos (TP4)

- **Actor**: Admin.
- **Precondición**: `Pago` en estado `pendiente` (para confirmar/rechazar) o `confirmado` (para
  reembolsar).
- **Flujo principal**: admin registra el pago que el cliente hizo fuera del sistema (CUS04,
  `POST /admin/pagos`) y revisa el comprobante (Yape/Plin/transferencia) fuera del sistema para
  confirmarlo o rechazarlo manualmente (`PATCH /admin/pagos/{id}/confirmar` |
  `/rechazar`); el reembolso (`PATCH /admin/pagos/{id}/reembolsar`) se registra igual de manera
  manual, sin integración automática con la fuente del pago original.
- **Postcondición**: `Pago.estado` actualizado, `confirmado_por` y `fecha_confirmacion`
  registrados.
- **RN**: ninguna con ID propio — ejecuta la parte administrativa de RN01/RN02 (reembolso o
  pérdida de depósito) decidida en CUS08.

### CUS19 — Gestionar beneficios (TP3)

- **Actor**: Admin.
- **Flujo principal**: crea un `Descuento` (tipo, scope, código, valor, límites de uso,
  vigencia) o un `Reto` (visitas requeridas, ventana de días, tipo y valor de recompensa) que
  los clientes consultan y canjean en CUS09.
- **Limitación actual**: solo crear y listar — no hay edición ni borrado (ver `docs/FASES.md`
  para el plan de completar el CRUD).
- **RN**: RT04 (los límites de uso configurados aquí son los que valida el canje).

### CUS20 — Consultar dashboard

- **Actor**: Admin.
- **Flujo principal**: `useDashboardStore` carga en paralelo citas del día, pagos pendientes y
  personal activo; el dashboard muestra KPIs (citas hoy, ingresos, no-shows) en tipografía
  display bold, siguiendo los Design Principles de `docs/PRODUCT.md`.
- **Postcondición**: ninguna — caso de uso de solo consulta.
- **RN**: ninguna específica.

### CUS21 — Gestionar catálogo de servicios (TP3)

- **Actor**: Admin.
- **Flujo principal**: crea y edita `Categoria`s (`POST/PATCH /servicios/categorias`) y
  `Servicio`s (`POST/PATCH /servicios`), incluyendo los campos que después leen otros casos de
  uso en vez de un valor fijo: `duracion_minutos`, `precio`, `monto_deposito` (CUS04),
  `requiere_ficha_salud` (RN07), y `horas_cancelacion_sin_penalidad` (RN01/RN02). La lectura
  pública del catálogo (`GET /servicios`, `GET /servicios/categorias`) la usa CUS03/CUS16 y no
  requiere sesión.
- **Postcondición**: `Categoria`/`Servicio` creado o actualizado.
- **RN**: ninguna con ID propio — es el punto de configuración de los umbrales que RN01/RN02/RN07
  usan en tiempo de reserva.

---

## Apéndice — Módulos planeados (fuera del alcance de TP1–TP4)

Los siguientes casos de uso pertenecen a los dos módulos documentados pero **no implementados**
(`docs/MODULO_ASESORIA_IA.md`, `docs/MODULO_FIDELIZACION_AVANZADA.md` — ver `docs/FASES.md`,
Fases 3 y 4). Se mantienen fuera del catálogo oficial CUS01–CUS21 porque no pertenecen a ningún
entregable actual del curso, pero se documentan con el mismo nivel de detalle porque forman
parte del diseño completo del sistema. Antes numerados `CU-C11`–`CU-C14`, `CU-T10`–`CU-T12`,
`CU-A11`–`CU-A16`.

### Cliente

#### CUS22 — Consultar asesoría de estilo con IA

Ver flujo completo y modelo de datos en `docs/MODULO_ASESORIA_IA.md`.

- **Actor**: Cliente.
- **Precondición**: módulo de IA habilitado por el admin (CUS31); cliente acepta el
  consentimiento de procesamiento de imagen; no superó el límite diario de consultas (RN12).
- **Flujo principal**: cliente abre la cámara desde `Reservar` o `MisCitas`, captura una foto,
  la app la envía al backend de forma efímera. El backend la analiza contra el catálogo de
  estilos curado (`EstiloCatalogo`) usando la API de Gemini y devuelve sugerencias rankeadas del
  catálogo existente (no genera imágenes nuevas). El cliente elige uno o más estilos y los envía
  a su especialista asignada en su próxima cita.
- **Flujos alternativos**: sin consentimiento → la cámara no se activa. Límite diario alcanzado
  → mensaje indicando cuándo se resetea (RN12). Sin cita futura para enviar la selección → se
  guarda la consulta pero se bloquea el botón "enviar a mi estilista" hasta que exista una.
- **Postcondición**: `ConsultaIA` y `SeleccionEstilo` (si eligió y envió) persistidos — **nunca**
  la foto original (RN11).
- **RN**: RN10, RN11, RN12, RN13.

#### CUS23 — Marcar un estilo como favorito sin usar la cámara

- **Actor**: Cliente.
- **Precondición**: módulo de IA habilitado; catálogo de estilos con al menos un ítem activo.
- **Flujo principal**: el cliente explora el catálogo de estilos directamente
  (`GET /ia/catalogo`) sin activar la cámara — útil cuando ya sabe qué quiere y solo necesita
  mostrárselo a su especialista — y marca uno o más como favoritos.
- **Postcondición**: favorito registrado, visible en el mismo lugar donde se ven las
  `SeleccionEstilo` generadas por consulta de IA.
- **RN**: ninguna nueva — reutiliza el mismo catálogo de RN10–RN13 sin pasar por el análisis.

#### CUS24 — Consultar mi nivel de fidelización y progreso

- **Actor**: Cliente.
- **Precondición**: módulo de fidelización avanzada habilitado.
- **Flujo principal**: el cliente ve su `NivelFidelizacion` actual y qué le falta (visitas o
  gasto) para alcanzar el siguiente.
- **Postcondición**: ninguna — caso de uso de solo consulta.
- **RN**: RN14.

#### CUS25 — Comprar en el catálogo exclusivo

Ver flujo completo en `docs/MODULO_FIDELIZACION_AVANZADA.md`.

- **Actor**: Cliente con nivel de fidelización suficiente.
- **Precondición**: `cliente.nivel_actual >= producto.nivel_minimo`.
- **Flujo principal**: cliente ve el catálogo exclusivo (los productos fuera de su nivel
  aparecen bloqueados con un teaser de qué nivel los desbloquea), elige un producto, paga vía
  pasarela (Culqi). El backend crea `PedidoCatalogo` en `pendiente`, redirige al checkout, y al
  recibir el webhook de confirmación actualiza el estado de forma idempotente.
- **Flujos alternativos**: nivel insuficiente → 403 a nivel de API aunque la UI ya lo oculte
  (RN16, defensa en profundidad). Pago rechazado → `PedidoCatalogo.estado = cancelado`, sin
  efecto en el nivel del cliente (RN18).
- **Postcondición**: `PedidoCatalogo` en `pagado`, visible en el historial del cliente y en el
  panel de pedidos del admin (CUS33).
- **RN**: RN14, RN15, RN16, RN17, RN18.

### Trabajador / Especialista

#### CUS26 — Consultar asesoría de estilo durante la atención

- **Actor**: Trabajador.
- **Flujo principal**: igual mecánica que CUS22 pero iniciada por la especialista durante la
  atención presencial (p. ej. la clienta no lo hizo antes de llegar). El resultado queda ligado
  a `personal_id` además de a la cita.
- **RN**: RN10, RN11, RN12, RN13.

#### CUS27 — Consultar historial de estilos de cliente

- **Actor**: Trabajador.
- **Precondición**: la clienta tiene consultas de IA previas ligadas a citas anteriores con
  cualquier especialista del salón.
- **Flujo principal**: al abrir el detalle de una cita agendada, la especialista ve el historial
  de `SeleccionEstilo` de esa clienta (sin necesidad de volver a analizar una foto).
- **RN**: RN13.

#### CUS28 — Registrar feedback de estilo

- **Actor**: Trabajador.
- **Precondición**: la cita tiene una `SeleccionEstilo` asociada y acaba de pasar a
  `completada`.
- **Flujo principal**: la especialista marca si el resultado logrado coincidió con el estilo
  elegido (sí/no + nota corta opcional).
- **Postcondición**: el feedback no afecta al cliente ni a su historial — alimenta una métrica
  interna de confianza del catálogo, visible solo para el admin (CUS30).
- **RN**: ninguna nueva.

### Admin

#### CUS29 — Gestionar catálogo de estilos

Ver `docs/MODULO_ASESORIA_IA.md`.

- **Actor**: Admin (o especialista con permiso delegado).
- **Flujo principal**: carga estilos de referencia (`EstiloCatalogo`) una sola vez, con su
  imagen y atributos (forma de rostro, tipo/largo de cabello, tags) que la IA usa para rankear
  sugerencias — el catálogo es la única fuente de imágenes del módulo.
- **RN**: RN10–RN13.

#### CUS30 — Revisar métricas de confianza del catálogo de estilos

- **Actor**: Admin.
- **Precondición**: al menos una especialista dejó feedback post-servicio (CUS28).
- **Flujo principal**: el admin ve, por estilo del catálogo, qué proporción de veces el feedback
  de la especialista fue positivo — permite retirar o ajustar estilos que sistemáticamente
  generan expectativas que no se logran en el servicio real.
- **RN**: ninguna nueva.

#### CUS31 — Configurar módulo de asesoría IA

- **Actor**: Admin.
- **Flujo principal**: activa/desactiva el módulo de IA y define el límite diario de consultas
  por cliente.
- **Postcondición**: configuración persistida, efectiva desde la siguiente consulta
  (CUS22/CUS26).
- **RN**: RN12.

#### CUS32 — Gestionar niveles y catálogo exclusivo

Ver `docs/MODULO_FIDELIZACION_AVANZADA.md`.

- **Actor**: Admin.
- **Flujo principal**: define niveles (`NivelFidelizacion`) con su umbral (visitas totales,
  gasto acumulado, o visitas en ventana) y sus beneficios; carga productos del catálogo
  exclusivo con su `nivel_minimo`; consulta pedidos y su estado de pago.
- **RN**: RN14, RN15, RN16, RN17, RN18.

#### CUS33 — Gestionar pedidos del catálogo exclusivo

Ver `docs/MODULO_FIDELIZACION_AVANZADA.md`.

- **Actor**: Admin.
- **Precondición**: existe al menos un `PedidoCatalogo` en estado `pagado`.
- **Flujo principal**: el admin filtra pedidos por estado/cliente/producto, abre el detalle de
  uno y, tras entregar el producto físicamente, lo marca como `entregado`.
- **Flujos alternativos**: intentar marcar como entregado un pedido que no está `pagado` → 422.
- **Postcondición**: `PedidoCatalogo.estado = entregado`, visible en el historial del cliente.
- **RN**: RN17.

#### CUS34 — Consultar métricas de fidelización

- **Actor**: Admin.
- **Precondición**: módulo de fidelización avanzada habilitado; al menos un cliente con nivel
  asignado.
- **Flujo principal**: el admin consulta, desde el dashboard operativo (CUS20), la distribución
  de clientes por nivel de fidelización y los ingresos del catálogo exclusivo del mes —
  agregados de solo lectura, sin ninguna acción de escritura propia.
- **Postcondición**: ninguna — caso de uso de solo consulta.
- **RN**: ninguna nueva.
