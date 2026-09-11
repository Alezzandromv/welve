# Casos de Uso — Welve

Formato por caso: **Actor**, **Precondición**, **Flujo principal**, **Flujos alternativos /
error**, **Postcondición**, **RN involucradas**. Los casos marcados **(planeado)** pertenecen a
módulos documentados pero no implementados — ver `docs/FASES.md`.

Para el detalle de los **requerimientos funcionales (RF)** que implementa cada caso de uso, ver
`docs/tesis/11_REQUERIMIENTOS_FUNCIONALES.md` (RF por módulo) y
`docs/tesis/12_CASOS_DE_USO_RF_RNF.md` (ficha consolidada por caso de uso, con RF + RNF + RN).
Convención de trazabilidad: **un caso de uso agrupa de 1 a N requerimientos funcionales**; cada
requerimiento funcional, a su vez, **tiene un único caso de uso de origen** (N requerimientos → 1
caso de uso) — si dos casos de uso invocan el mismo endpoint (p. ej. CU-C02/CU-C03 cancelando la
misma cita, o CU-T02/CU-T03 sobre el mismo cambio de estado), el requerimiento se documenta una
sola vez en su caso de uso de origen y el otro lo referencia en prosa, nunca como una segunda
entrada formal.

---

## Cliente

### CU-C01 — Reservar una cita

- **Actor**: Cliente.
- **Precondición**: sesión iniciada (JWT vía magic link); cliente no bloqueada
  (`esta_bloqueada=false`).
- **Flujo principal**: el cliente abre `Reservar`, elige uno o más servicios, elige
  especialista y horario dentro de la disponibilidad real mostrada (ya descontando buffer y
  citas existentes), confirma. El backend valida bloqueo (RN11), ficha de salud si el servicio
  la requiere (RN08), solapamiento (RN13), y crea la cita en estado `pendiente`.
- **Flujos alternativos**: si el cliente está bloqueada → 403 con mensaje genérico (RN11). Si
  el horario ya no está disponible (otra reserva ganó la carrera) → 409, el frontend refresca
  la disponibilidad. Si el servicio requiere ficha de salud y no existe una activa → 422, el
  frontend indica que debe contactar al salón para registrarla.
- **Postcondición**: `Cita` creada en `pendiente`, con sus `CitaServicio` asociados.
- **RN**: RN08, RN11, RN13.

### CU-C02 — Cancelar una cita a tiempo

- **Actor**: Cliente.
- **Precondición**: cita propia en estado `pendiente` o `confirmada`.
- **Flujo principal**: cliente cancela desde `MisCitas` indicando un motivo opcional. El
  backend calcula horas hasta la cita vs. `servicio.horas_cancelacion_sin_penalidad` (el mayor
  umbral entre los servicios de la cita) y, si aún hay margen suficiente, marca `cancelada` sin
  penalidad.
- **Flujos alternativos**: ver CU-C03 para el caso tardío. Si la cita ya no está en un estado
  cancelable (p. ej. `en_curso` o `completada`) → 422.
- **Postcondición**: `Cita.estado = cancelada`, `penalizacion_aplicada = false`, reembolso
  completo del depósito (proceso manual de confirmación de reembolso por admin, `Pago.tipo =
  reembolso`).
- **RN**: RN01.

### CU-C03 — Cancelar una cita fuera de ventana (tardía)

- **Actor**: Cliente.
- **Flujo principal**: igual que CU-C02, pero el cálculo de horas restantes cae bajo el umbral
  del servicio.
- **Postcondición**: `Cita.estado = cancelada_tardia`, `penalizacion_aplicada = true`, pierde el
  depósito.
- **RN**: RN02.

### CU-C04 — Canjear un descuento

- **Actor**: Cliente.
- **Precondición**: código de descuento vigente, con cupo global y personal disponibles.
- **Flujo principal**: cliente ingresa el código al momento de pagar una cita; el backend
  valida vigencia, `max_usos_global` y `max_usos_por_cliente` (RN14) bajo bloqueo optimista
  (`SELECT ... FOR UPDATE`) para evitar doble canje concurrente, y registra el uso.
- **Flujos alternativos**: código inexistente/inactivo → 404. Vigencia fuera de rango, cupo
  global agotado, o cupo personal agotado → 422 con mensaje específico.
- **Postcondición**: `DescuentoUso` registrado, ligado a la cita y al cliente.
- **RN**: RN14.

### CU-C05 — Completar un reto de fidelización

- **Actor**: Cliente (pasivo — el sistema actúa por él).
- **Precondición**: reto activo y vigente; cliente acumula suficientes citas `completada`
  dentro de la ventana de días del reto.
- **Flujo principal**: al completarse la N-ésima cita que cumple el umbral (disparado
  automáticamente desde `cambiar_estado` al pasar una cita a `completada`), el sistema genera
  un `Descuento` premio único para ese cliente y ese reto (idempotente vía `ON CONFLICT DO
  NOTHING`).
- **Postcondición**: el cliente ve un nuevo descuento disponible en `GET
  /fidelizacion/mis-descuentos` sin haber hecho ninguna acción explícita.
- **RN**: RN15.

### CU-C06 — Consulta de asesoría de estilo con IA **(planeado)**

Ver flujo completo y modelo de datos en `docs/MODULO_ASESORIA_IA.md`.

- **Actor**: Cliente.
- **Precondición**: módulo de IA habilitado por el admin; cliente acepta el consentimiento de
  procesamiento de imagen; no superó el límite diario de consultas (RN18).
- **Flujo principal**: cliente abre la cámara desde `Reservar` o `MisCitas`, captura una foto,
  la app la envía al backend de forma efímera. El backend la analiza contra el catálogo de
  estilos curado (`EstiloCatalogo`) usando la API de Gemini y devuelve sugerencias rankeadas
  del catálogo existente (no genera imágenes nuevas). El cliente elige uno o más estilos y los
  envía a su especialista asignada en su próxima cita.
- **Flujos alternativos**: sin consentimiento → la cámara no se activa. Límite diario alcanzado
  → mensaje indicando cuándo se resetea (RN18). Sin cita futura para enviar la selección → se
  guarda la consulta pero se bloquea el botón "enviar a mi estilista" hasta que exista una.
- **Postcondición**: `ConsultaIA` y `SeleccionEstilo` (si eligió y envió) persistidos —
  **nunca** la foto original (RN17).
- **RN**: RN16, RN17, RN18, RN19.

### CU-C07 — Comprar en el catálogo exclusivo **(planeado)**

Ver flujo completo en `docs/MODULO_FIDELIZACION_AVANZADA.md`.

- **Actor**: Cliente con nivel de fidelización suficiente.
- **Precondición**: `cliente.nivel_actual >= producto.nivel_minimo`.
- **Flujo principal**: cliente ve el catálogo exclusivo (los productos fuera de su nivel
  aparecen bloqueados con un teaser de qué nivel los desbloquea), elige un producto, paga vía
  pasarela (Culqi). El backend crea `PedidoCatalogo` en `pendiente`, redirige al checkout, y al
  recibir el webhook de confirmación actualiza el estado de forma idempotente.
- **Flujos alternativos**: nivel insuficiente → 403 a nivel de API aunque la UI ya lo oculte
  (RN22, defensa en profundidad). Pago rechazado → `PedidoCatalogo.estado = cancelado`, sin
  efecto en el nivel del cliente (RN24).
- **Postcondición**: `PedidoCatalogo` en `pagado`, visible en el historial del cliente y en el
  panel de pedidos del admin.
- **RN**: RN20, RN21, RN22, RN23, RN24.

### CU-C08 — Marcar un estilo como favorito sin usar la cámara **(planeado)**

- **Actor**: Cliente.
- **Precondición**: módulo de IA habilitado; catálogo de estilos con al menos un ítem activo.
- **Flujo principal**: el cliente explora el catálogo de estilos directamente (`GET
  /ia/catalogo`) sin activar la cámara — útil cuando ya sabe qué quiere y solo necesita
  mostrárselo a su especialista — y marca uno o más como favoritos.
- **Postcondición**: favorito registrado, visible en el mismo lugar donde se ven las
  `SeleccionEstilo` generadas por consulta de IA, para que la especialista no tenga que
  distinguir el origen.
- **RN**: ninguna nueva — reutiliza el mismo catálogo de RN16–RN19 sin pasar por el análisis.

### CU-C09 — Solicitar y verificar acceso por magic link

- **Actor**: Cliente.
- **Precondición**: ninguna — es el punto de entrada del cliente al sistema.
- **Flujo principal**: el cliente ingresa su teléfono (`POST /auth/solicitar-acceso`); el
  backend busca o crea el `Usuario`+`Cliente`, genera un `MagicLink` (UUID, TTL 1h) y lo envía
  por WhatsApp si `acepta_whatsapp=true`. Al abrir el enlace, `GET /auth/verificar?token=xxx`
  valida que no esté usado ni expirado, lo marca `usado=true` atómicamente, y devuelve un JWT.
- **Flujos alternativos**: token usado o expirado → error, el cliente debe solicitar uno nuevo.
- **Postcondición**: sesión de cliente iniciada; el token queda inutilizado para siempre.
- **RN**: ninguna con ID propio.

### CU-C10 — Consultar y actualizar mi perfil

- **Actor**: Cliente.
- **Precondición**: sesión iniciada.
- **Flujo principal**: `GET/PATCH /auth/perfil` — el cliente consulta o edita nombre, teléfono
  y correo, con validación de unicidad antes de guardar.
- **Postcondición**: `Usuario` actualizado.
- **RN**: ninguna específica.

### CU-C11 — Consultar mi nivel de fidelización y progreso **(planeado)**

- **Actor**: Cliente.
- **Precondición**: módulo de fidelización avanzada habilitado.
- **Flujo principal**: el cliente ve su `NivelFidelizacion` actual y qué le falta (visitas o
  gasto) para alcanzar el siguiente.
- **Postcondición**: ninguna — caso de uso de solo consulta.
- **RN**: RN20.

---

## Trabajador / Especialista

### CU-T01 — Ver agenda del día

- **Actor**: Trabajador.
- **Flujo principal**: `GET /trabajador/agenda` devuelve únicamente las citas de la
  especialista autenticada (resuelta por `usuario_id` → `Personal`), nunca las de otras
  especialistas ni datos financieros.
- **RN**: ninguna específica — regla de aislamiento de datos por rol.

### CU-T02 — Registrar llegada y avanzar el estado de una cita

- **Actor**: Trabajador (o admin).
- **Precondición**: cita asignada a esa especialista (si el actor es trabajador — admin puede
  operar cualquier cita); estado actual permite la transición (`_TRANSICIONES_VALIDAS`).
- **Flujo principal**: registra `hora_llegada_real` (independiente del cambio de estado),
  confirma la cita, y al llegar la clienta la pasa a `en_curso` y luego `completada`.
- **Flujos alternativos**: transición no permitida por la tabla de estados → 422. Ficha crítica
  sin confirmar al pasar a `en_curso` → 422 con `codigo: FICHA_CRITICA` (ver CU-T03).
- **Postcondición**: estado de cita actualizado; si pasa a `completada`, se dispara CU-C05.
- **RN**: RN09, RN15.

### CU-T03 — Atender la alerta de ficha de salud crítica

- **Actor**: Trabajador.
- **Precondición**: la clienta tiene al menos una `FichaSalud` con `severidad='critica'` activa.
- **Flujo principal**: al intentar pasar la cita a `en_curso`, la API responde 422 con el
  detalle de las fichas críticas. La especialista las revisa en pantalla y reenvía la misma
  petición con `confirmar_ficha_critica: true`.
- **Postcondición**: la cita avanza a `en_curso` solo después de que la alerta fue vista.
- **RN**: RN09.

### CU-T04 — Iniciar una consulta de IA en vivo durante la cita **(planeado)**

- **Actor**: Trabajador.
- **Flujo principal**: igual mecánica que CU-C06 pero iniciada por la especialista durante la
  atención presencial (p. ej. la clienta no lo hizo antes de llegar). El resultado queda ligado
  a `personal_id` además de a la cita.
- **RN**: RN16, RN17, RN18, RN19.

### CU-T05 — Consultar el historial de estilos de una clienta recurrente **(planeado)**

- **Actor**: Trabajador.
- **Precondición**: la clienta tiene consultas de IA previas ligadas a citas anteriores con
  cualquier especialista del salón.
- **Flujo principal**: al abrir el detalle de una cita agendada, la especialista ve el
  historial de `SeleccionEstilo` de esa clienta (sin necesidad de volver a analizar una foto) —
  agiliza la preparación del servicio sin depender de la memoria de quién la atendió antes.
- **RN**: RN19.

### CU-T06 — Dar feedback sobre el resultado de un estilo **(planeado)**

- **Actor**: Trabajador.
- **Precondición**: la cita tiene una `SeleccionEstilo` asociada y acaba de pasar a
  `completada`.
- **Flujo principal**: la especialista marca si el resultado logrado coincidió con el estilo
  elegido (sí/no + nota corta opcional).
- **Postcondición**: el feedback no afecta al cliente ni a su historial — alimenta una métrica
  interna de confianza del catálogo, visible solo para el admin (CU-A05).
- **RN**: ninguna nueva — funcionalidad de calidad de datos del catálogo, no de negocio.

### CU-T07 — Autenticarse como personal

- **Actor**: Trabajador o Admin.
- **Precondición**: cuenta de staff ya creada (auto-registro o CU-A10).
- **Flujo principal**: `POST /auth/login` con correo + contraseña; el backend valida
  credenciales y `esta_activo`, devuelve un JWT. El primer acceso de un rol nuevo pasa antes por
  `POST /auth/registrar`.
- **Flujos alternativos**: credenciales inválidas → 401. Cuenta desactivada → 403.
- **Postcondición**: sesión de staff iniciada.
- **RN**: ninguna con ID propio.

### CU-T08 — Gestionar mi cuenta

- **Actor**: Trabajador o Admin.
- **Precondición**: sesión de staff iniciada.
- **Flujo principal**: consulta o edita su perfil (`GET/PATCH /auth/perfil`) y, opcionalmente,
  cambia su contraseña (`POST /auth/cambiar-password`) indicando la actual.
- **Flujos alternativos**: contraseña actual incorrecta → 401.
- **Postcondición**: `Usuario` (y su hash de contraseña, si aplica) actualizado.
- **RN**: ninguna específica.

### CU-T09 — Marcar inasistencia automáticamente (no-show)

- **Actor**: Trabajador (pasivo); Celery Beat (dispara el caso de uso).
- **Precondición**: `Cita` en `confirmada`, con `programada_en + 15min < now()` y sin
  `hora_llegada_real`.
- **Flujo principal**: cada 5 minutos el beat verifica esta condición sobre todas las citas
  vigentes y marca `no_show` las que la cumplen, aplicando la pérdida del depósito.
- **Postcondición**: `Cita.estado = no_show`. Las citas `pendiente` nunca se ven afectadas.
- **RN**: RN05 (el marcado manual equivalente lo cubre RN03 dentro de CU-T02).

---

## Admin

### CU-A01 — Gestionar personal y su disponibilidad

- **Actor**: Admin.
- **Flujo principal**: crea el `Usuario` (rol `trabajador`) y luego el `Personal` asociado
  (flujo de dos pasos, ver `CLAUDE.md`), define especialidad, comisión, tipo de contrato, y su
  disponibilidad semanal (día, hora inicio/fin, buffer).
- **RN**: RN13 (el buffer configurado aquí es el que se valida en cada reserva).

### CU-A02 — Confirmar, rechazar o reembolsar un pago

- **Actor**: Admin.
- **Precondición**: `Pago` en estado `pendiente` (para confirmar/rechazar) o `confirmado` (para
  reembolsar).
- **Flujo principal**: admin revisa el comprobante (Yape/Plin/transferencia) fuera del sistema
  y confirma o rechaza manualmente; el reembolso se registra igual de manera manual, sin
  integración automática con la fuente del pago original.
- **Postcondición**: `Pago.estado` actualizado, `confirmado_por` y `fecha_confirmacion`
  registrados.

### CU-A03 — Configurar un descuento o un reto

- **Actor**: Admin.
- **Flujo principal**: crea un `Descuento` (tipo, scope, código, valor, límites de uso,
  vigencia) o un `Reto` (visitas requeridas, ventana de días, tipo y valor de recompensa).
- **Limitación actual**: solo crear y listar — no hay edición ni borrado (ver
  `docs/FASES.md` para el plan de completar el CRUD como parte del módulo de fidelización
  avanzada).

### CU-A04 — Configurar niveles de fidelización y catálogo exclusivo **(planeado)**

Ver `docs/MODULO_FIDELIZACION_AVANZADA.md`.

- **Actor**: Admin.
- **Flujo principal**: define niveles (`NivelFidelizacion`) con su umbral (visitas totales,
  gasto acumulado, o visitas en ventana) y sus beneficios; carga productos del catálogo
  exclusivo con su `nivel_minimo`; consulta pedidos y su estado de pago.
- **RN**: RN20, RN21, RN22, RN23, RN24.

### CU-A05 — Gestionar el catálogo de estilos para la IA **(planeado)**

Ver `docs/MODULO_ASESORIA_IA.md`.

- **Actor**: Admin (o especialista con permiso delegado).
- **Flujo principal**: carga estilos de referencia (`EstiloCatalogo`) una sola vez, con su
  imagen y atributos (forma de rostro, tipo/largo de cabello, tags) que la IA usa para rankear
  sugerencias — el catálogo es la única fuente de imágenes del módulo, evitando generar/
  almacenar una imagen nueva por cada consulta de cliente.
- **RN**: RN16–RN19.

### CU-A06 — Ver el dashboard operativo

- **Actor**: Admin.
- **Flujo principal**: `useDashboardStore` carga en paralelo citas del día, pagos pendientes y
  personal activo; el dashboard muestra KPIs (citas hoy, ingresos, no-shows) en tipografía
  display bold, siguiendo los Design Principles de `docs/PRODUCT.md`.
- **(planeado)** El dashboard suma dos widgets nuevos una vez implementadas las Fases 3 y 4:
  distribución de clientes por nivel de fidelización + ingresos del catálogo exclusivo del mes
  (RN20–RN24), y uso del módulo de IA (consultas totales, top 5 estilos elegidos, sin ningún
  dato de imagen — RN16–RN19).

### CU-A07 — Gestionar pedidos del catálogo exclusivo **(planeado)**

Ver `docs/MODULO_FIDELIZACION_AVANZADA.md`.

- **Actor**: Admin.
- **Precondición**: existe al menos un `PedidoCatalogo` en estado `pagado`.
- **Flujo principal**: el admin filtra pedidos por estado/cliente/producto, abre el detalle de
  uno y, tras entregar el producto físicamente, lo marca como `entregado`.
- **Flujos alternativos**: intentar marcar como entregado un pedido que no está `pagado` → 422
  (no se puede entregar algo que no se cobró).
- **Postcondición**: `PedidoCatalogo.estado = entregado`, visible en el historial del cliente.
- **RN**: RN23 (el pedido llegó a `pagado` de forma idempotente antes de poder entregarse).

### CU-A08 — Revisar métricas de confianza del catálogo de estilos **(planeado)**

- **Actor**: Admin.
- **Precondición**: al menos una especialista dejó feedback post-servicio (CU-T06).
- **Flujo principal**: el admin ve, por estilo del catálogo, qué proporción de veces el
  feedback de la especialista fue positivo — permite retirar o ajustar estilos que
  sistemáticamente generan expectativas que no se logran en el servicio real.
- **RN**: ninguna nueva.

### CU-A09 — Gestionar clientes

- **Actor**: Admin.
- **Flujo principal**: lista clientes con etiquetas y estado de bloqueo, consulta el detalle de
  una clienta con su historial de citas, edita etiquetas/notas internas (nunca `correo`/
  `password` — ver CU-A10), registra o consulta sus fichas de salud (`GET/POST
  /clientes/{id}/fichas-salud`, con tipo de restricción, descripción y severidad), y
  bloquea/desbloquea con motivo cuando corresponde.
- **Flujos alternativos**: intento de editar `correo`/`password` por este flujo → 422. Nota: el
  detalle de una ficha con `severidad='critica'` también se muestra automáticamente al
  trabajador dentro de CU-T03, sin que este necesite una consulta propia — viaja en el cuerpo del
  error 422 de `PATCH /citas/{id}/estado`.
- **Postcondición**: `Cliente` actualizado; si aplica, `esta_bloqueada`/`motivo_bloqueo`; si
  aplica, nueva `FichaSalud` registrada.
- **RN**: RN08, RN11.

### CU-A10 — Administrar cuentas de usuario del staff

- **Actor**: Admin.
- **Flujo principal**: lista/consulta usuarios por rol y estado, edita nombre/teléfono, cambia
  el correo (resetea `correo_verificado=false`), resetea contraseña sin conocer la actual, y
  activa/desactiva la cuenta.
- **Postcondición**: `Usuario` actualizado en el campo correspondiente.
- **RN**: ninguna con ID propio — única vía autorizada para tocar credenciales ajenas.

### CU-A11 — Configurar el módulo de asesoría de IA **(planeado)**

- **Actor**: Admin.
- **Flujo principal**: activa/desactiva el módulo de IA y define el límite diario de consultas
  por cliente.
- **Postcondición**: configuración persistida, efectiva desde la siguiente consulta (CU-C06/
  CU-T04).
- **RN**: RN18.

### CU-A12 — Recalcular niveles de fidelización automáticamente **(planeado)**

- **Actor**: Celery Beat (dispara); Admin (beneficiario indirecto vía CU-A04).
- **Flujo principal**: en un intervalo configurable, evalúa el historial de cada cliente contra
  los umbrales activos (en orden descendente) y le asigna el nivel más alto que cumple.
- **Postcondición**: `cliente.nivel_actual` actualizado; una baja de nivel no revoca pedidos ya
  realizados.
- **RN**: RN20, RN21.
