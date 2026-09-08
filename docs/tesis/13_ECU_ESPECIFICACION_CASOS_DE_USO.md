# Sistema Web para la Gestión de Citas, Pagos y Fidelización de Clientes en Eunoia Beauty Salon

**WELVE**

**Especificación de Casos de Uso (ECU)**

Versión 1.0

---

## Revisión Histórica

| Fecha | Versión | Descripción | Autor |
| :---: | :---: | :---: | :---: |
| 08/09/2026 | 1.0 | Elaboración del documento — 32 ECU (Cliente, Trabajador, Administrador) | Vidal Chumacero, Marco Alessandro |

---

## Nota de formato

Cada ficha sigue la plantilla de **Especificación de Caso de Uso (ECU)** del proyecto: tabla de
términos (Caso de Uso, Requerimiento, Pre-condición, Post-condición, Actores, Flujo Principal,
Sub-Flujo, Reglas de Negocio, Excepciones). Dos adaptaciones necesarias para Markdown (que no
admite una tabla anidada dentro de una celda, a diferencia de una tabla de Word/Google Docs):

1. **Flujo Principal** y **Sub-Flujo** se presentan como su propia tabla inmediatamente debajo
   del campo, en vez de como filas fusionadas dentro de la tabla de términos — mismo contenido y
   orden, solo destabulado.
2. El campo **Requerimiento** cita los códigos `RF-0xx` ya definidos en
   `11_REQUERIMIENTOS_FUNCIONALES.md` (en vez de un esquema paralelo `REQ-FUN-00xxx`) para no
   duplicar la numeración de requerimientos del proyecto en dos lugares que podrían desincronizarse.

Convenciones de código usadas en las 32 fichas:

- **Caso de Uso**: `CUS_Nombre_Del_Caso_De_Uso` (nombre en PascalCase con guion bajo), seguido
  del identificador `CU-Cxx`/`CU-Txx`/`CU-Axx` ya usado en el resto de `docs/` para
  trazabilidad cruzada.
- **Actores**: prefijo `AS_` (Actor del Sistema) + nombre sin espacios ni tildes — `AS_Cliente`,
  `AS_Trabajador`, `AS_Administrador`, `AS_CeleryBeat`, `AS_WhatsApp`, `AS_Gemini`, `AS_Culqi`.
- Las reglas de negocio se citan en prosa con su código `RNxx` entre paréntesis al final, para
  quedar trazables contra `docs/REGLAS_DE_NEGOCIO.md` sin perder la redacción libre que pide la
  plantilla.

---

## Tabla de Contenidos

1. **Cliente**
   1.1. CU-C01 — Reservar una cita
   1.2. CU-C02 — Cancelar una cita a tiempo
   1.3. CU-C03 — Cancelar una cita fuera de ventana (tardía)
   1.4. CU-C04 — Canjear un descuento
   1.5. CU-C05 — Completar un reto de fidelización (automático)
   1.6. CU-C06 — Consulta de asesoría de estilo con IA (planeado)
   1.7. CU-C07 — Comprar en el catálogo exclusivo (planeado)
   1.8. CU-C08 — Marcar un estilo como favorito sin cámara (planeado)
   1.9. CU-C09 — Solicitar y verificar acceso por magic link
   1.10. CU-C10 — Consultar y actualizar mi perfil
   1.11. CU-C11 — Consultar mi nivel de fidelización y progreso (planeado)
2. **Trabajador / Especialista**
   2.1. CU-T01 — Ver agenda del día
   2.2. CU-T02 — Registrar llegada y avanzar el estado de una cita
   2.3. CU-T03 — Atender la alerta de ficha de salud crítica
   2.4. CU-T04 — Iniciar una consulta de IA en vivo durante la cita (planeado)
   2.5. CU-T05 — Consultar el historial de estilos de una clienta recurrente (planeado)
   2.6. CU-T06 — Dar feedback sobre el resultado de un estilo (planeado)
   2.7. CU-T07 — Autenticarse como personal
   2.8. CU-T08 — Gestionar mi cuenta
   2.9. CU-T09 — Marcar inasistencia automáticamente (no-show) (automático)
3. **Administrador**
   3.1. CU-A01 — Gestionar personal y su disponibilidad
   3.2. CU-A02 — Confirmar, rechazar o reembolsar un pago
   3.3. CU-A03 — Configurar un descuento o un reto
   3.4. CU-A04 — Configurar niveles de fidelización y catálogo exclusivo (planeado)
   3.5. CU-A05 — Gestionar el catálogo de estilos para la IA (planeado)
   3.6. CU-A06 — Ver el dashboard operativo
   3.7. CU-A07 — Gestionar pedidos del catálogo exclusivo (planeado)
   3.8. CU-A08 — Revisar métricas de confianza del catálogo de estilos (planeado)
   3.9. CU-A09 — Gestionar clientes
   3.10. CU-A10 — Administrar cuentas de usuario del staff
   3.11. CU-A11 — Configurar el módulo de asesoría de IA (planeado)
   3.12. CU-A12 — Recalcular niveles de fidelización automáticamente (planeado, automático)

---

# 1. Cliente

## 1.1. Especificación de caso de uso: Reservar una cita

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Reservar\_Cita (CU-C01) |
| **Requerimiento** | RF-008 (Listar servicios), RF-009 (Listar categorías), RF-010 (Consultar disponibilidad), RF-015 (Crear cita), RF-016 (Listar mis citas) |
| **Pre-condición** | Sesión de cliente iniciada (JWT vía magic link). El cliente no debe estar bloqueado (`esta_bloqueada=false`). |
| **Post-condición** | La `Cita` queda persistida en estado `pendiente`, con sus `CitaServicio` asociados. |
| **Actores** | AS\_Cliente |

**Flujo Principal — Cliente**

| N° | Descripción |
| :---: | :---- |
| 1 | El cliente abre la vista de reserva y selecciona uno o más servicios. |
| 2 | El sistema muestra las categorías y servicios activos disponibles. |
| 3 | El sistema muestra los especialistas disponibles para los servicios elegidos. |
| 4 | El cliente elige especialista y horario dentro de la disponibilidad real mostrada (ya descontando el buffer configurado y las citas existentes). |
| 5 | El sistema valida que la clienta no esté bloqueada, que exista una ficha de salud activa si el servicio lo requiere, y que no haya solapamiento de horario. |
| 6 | El sistema crea la `Cita` en estado `pendiente` junto con sus `CitaServicio`. |
| 7 | El sistema confirma la reserva al cliente. |

**Sub-Flujo**

No aplica — caso de uso de una sola vía de éxito.

**Reglas de Negocio**

- Si `cliente.esta_bloqueada=true`, la reserva se rechaza antes de cualquier otra validación (RN11).
- Si el servicio exige ficha de salud, debe existir una ficha activa registrada para la clienta antes de crear la cita (RN08).
- El horario disponible ya descuenta el buffer configurado (`personal.minutos_buffer`) más allá del fin de cada cita existente de la especialista (RN13).

**Excepciones**

- Cliente bloqueada: el sistema rechaza la reserva con un mensaje genérico (403), sin exponer el motivo del bloqueo.
- Ficha de salud requerida e inexistente: el sistema responde 422 e indica que debe contactar al salón para registrarla.
- Horario ya no disponible (carrera con otra reserva concurrente): el sistema responde 409 y el frontend refresca la disponibilidad.

---

## 1.2. Especificación de caso de uso: Cancelar una cita a tiempo

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Cancelar\_Cita\_A\_Tiempo (CU-C02) |
| **Requerimiento** | RF-017 (Cancelar cita) |
| **Pre-condición** | Cita propia en estado `pendiente` o `confirmada`. Horas restantes hasta la cita ≥ `servicio.horas_cancelacion_sin_penalidad`. |
| **Post-condición** | `Cita.estado = cancelada`, `penalizacion_aplicada = false`. Se dispara el reembolso completo del depósito (confirmación manual de un pago tipo `reembolso` por el administrador). |
| **Actores** | AS\_Cliente |

**Flujo Principal — Cliente**

| N° | Descripción |
| :---: | :---- |
| 1 | El cliente abre "Mis Citas" y selecciona la cita a cancelar. |
| 2 | El cliente indica un motivo de cancelación (opcional). |
| 3 | El sistema calcula las horas restantes hasta `programada_en` y las compara contra `servicio.horas_cancelacion_sin_penalidad`. |
| 4 | Al cumplirse el umbral, el sistema marca la cita como `cancelada` sin penalidad. |
| 5 | El sistema notifica al cliente la cancelación exitosa. |

**Sub-Flujo**

No aplica — el caso en que el umbral no se cumple está modelado como el caso de uso independiente CU-C03.

**Reglas de Negocio**

- El umbral de horas se lee siempre de `servicio.horas_cancelacion_sin_penalidad` — nunca un valor fijo global, porque distintos servicios tienen distinta anticipación razonable (RN01).

**Excepciones**

- Cita en un estado no cancelable (`en_curso`, `completada`, u otro estado terminal): el sistema responde 422.

---

## 1.3. Especificación de caso de uso: Cancelar una cita fuera de ventana (tardía)

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Cancelar\_Cita\_Tardia (CU-C03) |
| **Requerimiento** | RF-017 (Cancelar cita) |
| **Pre-condición** | Cita propia en estado `pendiente` o `confirmada`. Horas restantes < `servicio.horas_cancelacion_sin_penalidad`. |
| **Post-condición** | `Cita.estado = cancelada_tardia`, `penalizacion_aplicada = true`. El depósito no se reembolsa. |
| **Actores** | AS\_Cliente |

**Flujo Principal — Cliente**

| N° | Descripción |
| :---: | :---- |
| 1 | El cliente abre "Mis Citas" y selecciona la cita a cancelar. |
| 2 | El cliente indica un motivo de cancelación (opcional). |
| 3 | El sistema calcula las horas restantes hasta `programada_en` y las compara contra `servicio.horas_cancelacion_sin_penalidad`. |
| 4 | Al no cumplirse el umbral, el sistema marca la cita como `cancelada_tardia` y aplica la penalización. |
| 5 | El sistema notifica al cliente la pérdida del depósito. |

**Sub-Flujo**

No aplica.

**Reglas de Negocio**

- Bajo el umbral, el horario ya no es reasignable a tiempo — el depósito compensa el hueco en la agenda de la especialista (RN02).

**Excepciones**

- Cita en un estado no cancelable: 422 (igual que CU-C02).

---

## 1.4. Especificación de caso de uso: Canjear un descuento

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Canjear\_Descuento (CU-C04) |
| **Requerimiento** | RF-053 (Consultar mis descuentos), RF-054 (Aplicar descuento) |
| **Pre-condición** | Código de descuento vigente, con cupo global y personal disponibles. |
| **Post-condición** | `DescuentoUso` registrado, ligado a la cita y al cliente. |
| **Actores** | AS\_Cliente |

**Flujo Principal — Cliente**

| N° | Descripción |
| :---: | :---- |
| 1 | El cliente consulta sus descuentos disponibles. |
| 2 | El cliente ingresa el código al momento de pagar una cita. |
| 3 | El sistema bloquea la fila del descuento (`SELECT ... FOR UPDATE`) para serializar canjes concurrentes. |
| 4 | El sistema valida vigencia, `max_usos_global` y `max_usos_por_cliente`. |
| 5 | El sistema registra el `DescuentoUso`. |

**Sub-Flujo**

No aplica.

**Reglas de Negocio**

- `descuento.max_usos_por_cliente` (por defecto 1) se valida contra el conteo de usos previos del cliente antes de aplicar cualquier descuento (RN14).

**Excepciones**

- Código inexistente o inactivo: 404.
- Fuera de vigencia o cupo (global o personal) agotado: 422 con el motivo específico.

---

## 1.5. Especificación de caso de uso: Completar un reto de fidelización (automático)

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Completar\_Reto\_Fidelizacion (CU-C05) |
| **Requerimiento** | RF-052 (Consultar mis retos), RF-059 (Verificar retos completados) |
| **Pre-condición** | Reto activo y vigente. El cliente acumula suficientes citas `completada` dentro de la ventana de días del reto. |
| **Post-condición** | Nuevo `Descuento` premio disponible para el cliente, sin que este haya realizado ninguna acción explícita. |
| **Actores** | AS\_Cliente (pasivo) |

**Flujo Principal — Sistema (disparado desde CU-T02)**

| N° | Descripción |
| :---: | :---- |
| 1 | Un trabajador o administrador completa una cita del cliente (CU-T02). |
| 2 | El sistema evalúa automáticamente todos los retos activos contra el historial reciente del cliente. |
| 3 | Si el cliente cumple el umbral de visitas de algún reto, el sistema genera un `Descuento` premio único para ese reto y ese cliente, de forma idempotente (`ON CONFLICT DO NOTHING`). |
| 4 | El cliente ve el nuevo descuento disponible en su siguiente consulta. |

**Sub-Flujo**

No aplica.

**Reglas de Negocio**

- La generación del descuento premio es automática e idempotente — ninguna clienta debe "reclamar" un reto cumplido (RN15).

**Excepciones**

- Ningún reto activo cumple el umbral: el sistema no genera ningún descuento y continúa sin error.

---

## 1.6. Especificación de caso de uso: Consulta de asesoría de estilo con IA *(planeado)*

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Consultar\_Asesoria\_IA (CU-C06) |
| **Requerimiento** | RF-060 (Analizar imagen y sugerir estilos), RF-061 (Consultar catálogo de estilos), RF-062 (Enviar selección a especialista) |
| **Pre-condición** | Módulo de IA habilitado. Consentimiento de procesamiento de imagen aceptado. Límite diario de consultas no superado. |
| **Post-condición** | `ConsultaIA` persistida y, si el cliente eligió y envió un estilo, `SeleccionEstilo` persistida — nunca la foto original. |
| **Actores** | AS\_Cliente, AS\_Gemini |

**Flujo Principal — Cliente**

| N° | Descripción |
| :---: | :---- |
| 1 | El cliente activa la cámara desde "Reservar" o "Mis Citas" y captura una foto. |
| 2 | El sistema envía la foto de forma efímera junto con los atributos del catálogo de estilos a Gemini. |
| 3 | Gemini devuelve un ranking de estilos existentes en el catálogo. |
| 4 | El sistema descarta la foto original inmediatamente después de obtener la recomendación. |
| 5 | El cliente elige uno o más estilos sugeridos. |
| 6 | El sistema liga la selección a la próxima cita futura del cliente y la envía a su especialista. |

**Sub-Flujo**

| N° | Nombre | Descripción |
| :---: | :---- | :---- |
| 1 | Sin cita futura registrada | El sistema guarda la consulta y la selección, pero bloquea el botón de envío hasta que exista una cita futura del cliente. |

**Reglas de Negocio**

- El consentimiento de procesamiento de imagen es obligatorio antes de activar la cámara (RN16).
- La foto nunca se persiste — se procesa en memoria y se descarta de inmediato (RN17).
- Existe un límite diario de consultas por cliente, configurable por el administrador (RN18).

**Excepciones**

- Sin consentimiento: la cámara no se activa.
- Límite diario alcanzado: el sistema muestra un mensaje indicando cuándo se resetea el límite.

---

## 1.7. Especificación de caso de uso: Comprar en el catálogo exclusivo *(planeado)*

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Comprar\_Catalogo\_Exclusivo (CU-C07) |
| **Requerimiento** | RF-072 (Consultar catálogo exclusivo), RF-074 (Comprar producto del catálogo), RF-075 (Confirmar pago vía webhook) |
| **Pre-condición** | `cliente.nivel_actual >= producto.nivel_minimo`. |
| **Post-condición** | `PedidoCatalogo` en estado `pagado`, visible en el historial del cliente y en el panel de pedidos del administrador. |
| **Actores** | AS\_Cliente, AS\_Culqi |

**Flujo Principal — Cliente**

| N° | Descripción |
| :---: | :---- |
| 1 | El cliente ve el catálogo exclusivo; los productos de nivel superior aparecen bloqueados con un teaser de qué nivel los desbloquea. |
| 2 | El cliente elige un producto habilitado para su nivel. |
| 3 | El sistema crea un `PedidoCatalogo` en `pendiente` e inicia el checkout con Culqi. |
| 4 | El cliente completa el pago en la pasarela. |
| 5 | Culqi confirma el resultado mediante un webhook firmado. |
| 6 | El sistema actualiza el pedido a `pagado` de forma idempotente. |

**Sub-Flujo**

No aplica.

**Reglas de Negocio**

- El nivel mínimo se valida en el backend, no solo se oculta en la interfaz — defensa en profundidad (RN22).
- La confirmación del pago vía webhook es idempotente, porque los webhooks de pasarelas de pago pueden reintentar la entrega (RN23).
- Un pago rechazado marca el pedido como `cancelado`, sin afectar el nivel de fidelización del cliente (RN24).

**Excepciones**

- Nivel insuficiente: 403 también a nivel de API, aunque la interfaz ya oculte el producto.
- Pago rechazado o webhook de fallo: `PedidoCatalogo.estado = cancelado`.

---

## 1.8. Especificación de caso de uso: Marcar un estilo como favorito sin cámara *(planeado)*

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Marcar\_Estilo\_Favorito (CU-C08) |
| **Requerimiento** | RF-065 (Marcar estilo como favorito) |
| **Pre-condición** | Catálogo de estilos con al menos un ítem activo. |
| **Post-condición** | `SeleccionEstilo` con `origen=favorito` registrada, visible junto a las generadas por IA. |
| **Actores** | AS\_Cliente |

**Flujo Principal — Cliente**

| N° | Descripción |
| :---: | :---- |
| 1 | El cliente explora el catálogo de estilos directamente, sin activar la cámara. |
| 2 | El cliente marca uno o más estilos como favoritos. |
| 3 | El sistema registra la selección con `origen=favorito`, sin `ConsultaIA` asociada. |

**Sub-Flujo**

No aplica.

**Reglas de Negocio**

Ninguna nueva — reutiliza el catálogo de RN16–RN19 sin pasar por el análisis de imagen.

**Excepciones**

Ninguna específica.

---

## 1.9. Especificación de caso de uso: Solicitar y verificar acceso por magic link

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Solicitar\_Verificar\_Acceso (CU-C09) |
| **Requerimiento** | RF-001 (Solicitar acceso por magic link), RF-002 (Verificar magic link) |
| **Pre-condición** | Ninguna — es el punto de entrada del cliente al sistema. |
| **Post-condición** | Sesión de cliente iniciada (JWT emitido); el `MagicLink` queda inutilizado para siempre. |
| **Actores** | AS\_Cliente, AS\_WhatsApp |

**Flujo Principal — Cliente**

| N° | Descripción |
| :---: | :---- |
| 1 | El cliente ingresa su número de teléfono. |
| 2 | El sistema busca o crea el `Usuario` y el `Cliente` asociado. |
| 3 | El sistema genera un `MagicLink` (token UUID, vigencia de 1 hora) y lo envía por WhatsApp si el cliente acepta notificaciones. |
| 4 | El cliente abre el enlace recibido. |
| 5 | El sistema valida que el token no esté usado ni expirado. |
| 6 | El sistema marca el token como usado de forma atómica y emite un JWT. |

**Sub-Flujo**

No aplica.

**Reglas de Negocio**

El enlace es de un solo uso y expira en 1 hora — mecanismo de seguridad central de este caso de uso, sin código de regla de negocio propio.

**Excepciones**

- Token ya usado o expirado: el sistema rechaza la verificación; el cliente debe solicitar un nuevo enlace.
- `acepta_whatsapp=false`: el enlace no se envía por ese canal (sin canal alternativo implementado).

---

## 1.10. Especificación de caso de uso: Consultar y actualizar mi perfil

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Gestionar\_Perfil\_Cliente (CU-C10) |
| **Requerimiento** | RF-005 (Consultar perfil propio), RF-006 (Actualizar perfil propio) |
| **Pre-condición** | Sesión de cliente iniciada. |
| **Post-condición** | `Usuario` actualizado. |
| **Actores** | AS\_Cliente |

**Flujo Principal — Cliente**

| N° | Descripción |
| :---: | :---- |
| 1 | El cliente abre su perfil. |
| 2 | El sistema muestra nombre, teléfono y correo actuales. |
| 3 | El cliente edita los campos que desee. |
| 4 | El sistema valida unicidad de correo y teléfono antes de guardar. |
| 5 | El sistema confirma la actualización. |

**Sub-Flujo**

No aplica.

**Reglas de Negocio**

Ninguna específica.

**Excepciones**

- Correo o teléfono ya usado por otra cuenta: 409.

---

## 1.11. Especificación de caso de uso: Consultar mi nivel de fidelización y progreso *(planeado)*

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Consultar\_Nivel\_Fidelizacion (CU-C11) |
| **Requerimiento** | RF-069 (Consultar niveles de fidelización), RF-071 (Consultar mi nivel y progreso) |
| **Pre-condición** | Módulo de fidelización avanzada habilitado. |
| **Post-condición** | Ninguna — caso de uso de solo consulta. |
| **Actores** | AS\_Cliente |

**Flujo Principal — Cliente**

| N° | Descripción |
| :---: | :---- |
| 1 | El cliente abre la sección de fidelización. |
| 2 | El sistema calcula o recupera el nivel actual del cliente. |
| 3 | El sistema muestra el nivel actual y qué le falta (visitas o gasto) para el siguiente nivel. |

**Sub-Flujo**

No aplica.

**Reglas de Negocio**

- El nivel refleja el comportamiento reciente del cliente contra los umbrales activos, en orden descendente (RN20).

**Excepciones**

Ninguna específica.

---

# 2. Trabajador / Especialista

## 2.1. Especificación de caso de uso: Ver agenda del día

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Ver\_Agenda\_Dia (CU-T01) |
| **Requerimiento** | RF-036 (Consultar agenda propia) |
| **Pre-condición** | Sesión iniciada con rol `trabajador` (o `admin`). |
| **Post-condición** | Agenda del día mostrada, sin datos de otras especialistas ni información financiera. |
| **Actores** | AS\_Trabajador |

**Flujo Principal — Trabajador**

| N° | Descripción |
| :---: | :---- |
| 1 | El trabajador abre su agenda. |
| 2 | El sistema resuelve el registro `Personal` correspondiente a partir del `usuario_id` autenticado. |
| 3 | El sistema devuelve únicamente las citas del día de esa especialista. |

**Sub-Flujo**

No aplica.

**Reglas de Negocio**

Regla de aislamiento de datos por rol — sin código de regla de negocio propio.

**Excepciones**

Ninguna específica.

---

## 2.2. Especificación de caso de uso: Registrar llegada y avanzar el estado de una cita

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Registrar\_Llegada\_Avanzar\_Estado (CU-T02) |
| **Requerimiento** | RF-018 (Cambiar estado de cita), RF-019 (Registrar llegada) |
| **Pre-condición** | Cita asignada a esa especialista (si el actor es Trabajador; el Administrador puede operar cualquier cita). La transición solicitada es válida según la tabla de transiciones del sistema. |
| **Post-condición** | Estado de la cita actualizado; si el nuevo estado es `completada`, se dispara automáticamente CU-C05. |
| **Actores** | AS\_Trabajador, AS\_Administrador |

**Flujo Principal — Trabajador**

| N° | Descripción |
| :---: | :---- |
| 1 | La especialista registra la hora de llegada real de la clienta. |
| 2 | La especialista confirma la cita. |
| 3 | Al llegar la clienta, la especialista avanza el estado a `en_curso`. |
| 4 | Al terminar el servicio, la especialista avanza el estado a `completada`. |

**Sub-Flujo**

| N° | Nombre | Descripción |
| :---: | :---- | :---- |
| 1 | Marcar inasistencia manual (no-show) | Si la clienta no llega, la especialista puede marcar directamente el estado `no_show` (RN03), aplicando la pérdida del depósito — variante manual del caso de uso automático CU-T09. |

**Reglas de Negocio**

- Si existe una ficha de salud con severidad crítica, el sistema exige confirmación explícita antes de permitir el paso a `en_curso` (RN09, ver CU-T03).
- Al pasar a `completada`, se evalúan automáticamente los retos de fidelización del cliente (RN15).

**Excepciones**

- Transición de estado no permitida por la tabla de transiciones válidas: 422.

---

## 2.3. Especificación de caso de uso: Atender la alerta de ficha de salud crítica

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Atender\_Alerta\_Ficha\_Critica (CU-T03) |
| **Requerimiento** | RF-018 (Cambiar estado de cita), RF-041 (Listar fichas de salud), RF-042 (Registrar ficha de salud) |
| **Pre-condición** | La clienta tiene al menos una `FichaSalud` con severidad `critica` activa. |
| **Post-condición** | La cita avanza a `en_curso` solo después de que la alerta fue vista explícitamente. |
| **Actores** | AS\_Trabajador |

**Flujo Principal — Trabajador**

| N° | Descripción |
| :---: | :---- |
| 1 | La especialista intenta pasar la cita a `en_curso`. |
| 2 | El sistema responde con el detalle de las fichas críticas de la clienta, sin permitir el avance. |
| 3 | La especialista revisa la alerta en pantalla. |
| 4 | La especialista reenvía la petición confirmando explícitamente que revisó la alerta. |
| 5 | El sistema permite el avance a `en_curso`. |

**Sub-Flujo**

No aplica.

**Reglas de Negocio**

- No se bloquea el servicio de forma permanente — la especialista puede decidir proceder con cuidado extra, pero solo después de una confirmación explícita (RN09).

**Excepciones**

- Confirmación no enviada: la cita permanece sin avanzar (422 persistente con el código `FICHA_CRITICA`).

---

## 2.4. Especificación de caso de uso: Iniciar una consulta de IA en vivo durante la cita *(planeado)*

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Consulta\_IA\_En\_Vivo (CU-T04) |
| **Requerimiento** | RF-060 (Analizar imagen y sugerir estilos), RF-062 (Enviar selección a especialista) |
| **Pre-condición** | Módulo de IA habilitado. Cita en curso. |
| **Post-condición** | `ConsultaIA` y, si aplica, `SeleccionEstilo` persistidas, ligadas también a `personal_id`. |
| **Actores** | AS\_Trabajador, AS\_Gemini |

**Flujo Principal — Trabajador**

| N° | Descripción |
| :---: | :---- |
| 1 | La especialista activa la cámara durante la atención presencial (por ejemplo, si la clienta no lo hizo antes de llegar). |
| 2 | El sistema envía la foto de forma efímera junto con los atributos del catálogo a Gemini. |
| 3 | Gemini devuelve un ranking de estilos existentes en el catálogo. |
| 4 | El sistema descarta la foto original inmediatamente. |
| 5 | La especialista y/o la clienta eligen uno o más estilos, ligados a la cita en curso y a `personal_id`. |

**Sub-Flujo**

No aplica.

**Reglas de Negocio**

Mismas de CU-C06: consentimiento obligatorio (RN16), no persistencia de la foto (RN17), límite diario de consultas (RN18), selección ligada a una cita real (RN19).

**Excepciones**

Las mismas de CU-C06.

---

## 2.5. Especificación de caso de uso: Consultar el historial de estilos de una clienta recurrente *(planeado)*

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Consultar\_Historial\_Estilos (CU-T05) |
| **Requerimiento** | RF-063 (Consultar historial de estilos de un cliente) |
| **Pre-condición** | La clienta tiene `SeleccionEstilo` previas ligadas a citas anteriores. |
| **Post-condición** | Ninguna — caso de uso de solo consulta. |
| **Actores** | AS\_Trabajador |

**Flujo Principal — Trabajador**

| N° | Descripción |
| :---: | :---- |
| 1 | La especialista abre el detalle de una cita agendada. |
| 2 | El sistema muestra el historial de estilos elegidos por esa clienta en citas anteriores, sin volver a analizar ninguna foto. |

**Sub-Flujo**

No aplica.

**Reglas de Negocio**

- El historial mostrado corresponde solo a selecciones ligadas a una cita real con esa clienta (RN19).

**Excepciones**

Ninguna específica.

---

## 2.6. Especificación de caso de uso: Dar feedback sobre el resultado de un estilo *(planeado)*

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Registrar\_Feedback\_Estilo (CU-T06) |
| **Requerimiento** | RF-064 (Registrar feedback de estilo) |
| **Pre-condición** | La cita tiene una `SeleccionEstilo` asociada y acaba de pasar a `completada`. |
| **Post-condición** | `SeleccionEstilo.feedback_coincidio` actualizado; no afecta al cliente. |
| **Actores** | AS\_Trabajador |

**Flujo Principal — Trabajador**

| N° | Descripción |
| :---: | :---- |
| 1 | La especialista marca si el resultado logrado coincidió con el estilo elegido. |
| 2 | La especialista agrega una nota corta opcional. |
| 3 | El sistema registra el feedback. |

**Sub-Flujo**

No aplica.

**Reglas de Negocio**

Ninguna nueva — alimenta la métrica de confianza del catálogo (CU-A08).

**Excepciones**

Ninguna específica.

---

## 2.7. Especificación de caso de uso: Autenticarse como personal

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Autenticarse\_Personal (CU-T07) |
| **Requerimiento** | RF-003 (Registrar personal), RF-004 (Iniciar sesión staff) |
| **Pre-condición** | Cuenta de staff ya creada (auto-registro o CU-A10). |
| **Post-condición** | Sesión de staff iniciada (JWT emitido). |
| **Actores** | AS\_Trabajador, AS\_Administrador |

**Flujo Principal — Trabajador / Administrador**

| N° | Descripción |
| :---: | :---- |
| 1 | El miembro del staff ingresa su correo y contraseña. |
| 2 | El sistema valida las credenciales contra el hash almacenado. |
| 3 | El sistema valida que la cuenta esté activa. |
| 4 | El sistema emite un JWT. |

**Sub-Flujo**

| N° | Nombre | Descripción |
| :---: | :---- | :---- |
| 1 | Primer acceso sin cuenta previa | El miembro del staff se registra indicando nombre, correo, contraseña y rol (`admin` o `trabajador`) antes de continuar con el flujo principal. |

**Reglas de Negocio**

Ninguna con código propio.

**Excepciones**

- Credenciales inválidas: 401.
- Cuenta desactivada: 403.

---

## 2.8. Especificación de caso de uso: Gestionar mi cuenta

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Gestionar\_Cuenta\_Personal (CU-T08) |
| **Requerimiento** | RF-005 (Consultar perfil propio), RF-006 (Actualizar perfil propio), RF-007 (Cambiar contraseña) |
| **Pre-condición** | Sesión de staff iniciada. |
| **Post-condición** | `Usuario` (y su hash de contraseña, si aplica) actualizado. |
| **Actores** | AS\_Trabajador, AS\_Administrador |

**Flujo Principal — Trabajador / Administrador**

| N° | Descripción |
| :---: | :---- |
| 1 | El miembro del staff consulta o edita su nombre, correo o teléfono. |
| 2 | Opcionalmente, cambia su contraseña indicando la contraseña actual y una nueva de al menos 8 caracteres. |
| 3 | El sistema valida y persiste los cambios. |

**Sub-Flujo**

No aplica.

**Reglas de Negocio**

Ninguna específica.

**Excepciones**

- Contraseña actual incorrecta: 401.
- Correo ya usado por otra cuenta: 409.

---

## 2.9. Especificación de caso de uso: Marcar inasistencia automáticamente (no-show) *(automático)*

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Marcar\_No\_Show\_Automatico (CU-T09) |
| **Requerimiento** | RF-024 (Verificar no-show automático) |
| **Pre-condición** | `Cita` en `confirmada`, con `programada_en + 15 minutos < ahora` y sin `hora_llegada_real` registrada. |
| **Post-condición** | `Cita.estado = no_show`, con pérdida del depósito y `penalizacion_aplicada = true`. |
| **Actores** | AS\_CeleryBeat |

**Flujo Principal — Programador de Tareas**

| N° | Descripción |
| :---: | :---- |
| 1 | Cada 5 minutos, el programador de tareas ejecuta el job de verificación de inasistencias. |
| 2 | El sistema busca todas las citas `confirmada` que cumplen la condición de retraso. |
| 3 | El sistema marca cada una como `no_show` y aplica la penalización correspondiente. |

**Sub-Flujo**

No aplica.

**Reglas de Negocio**

- Las citas en `pendiente` nunca se ven afectadas por este proceso — el margen de 15 minutos cubre demoras razonables de tráfico o parking (RN05).

**Excepciones**

Ninguna — proceso batch sin interacción de usuario.

---

# 3. Administrador

## 3.1. Especificación de caso de uso: Gestionar personal y su disponibilidad

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Gestionar\_Personal (CU-A01) |
| **Requerimiento** | RF-011, RF-012, RF-013, RF-014 (categorías/servicios), RF-022 (crear cita para un cliente), RF-030–RF-035 (CRUD de personal y disponibilidad), RF-045 (crear usuario) |
| **Pre-condición** | Sesión de administrador iniciada. |
| **Post-condición** | `Personal` y su `DisponibilidadPersonal` creados/actualizados; opcionalmente, categorías, servicios o citas para un cliente quedan registrados. |
| **Actores** | AS\_Administrador |

**Flujo Principal — Administrador**

| N° | Descripción |
| :---: | :---- |
| 1 | El administrador crea el `Usuario` con rol `trabajador`. |
| 2 | El administrador crea el `Personal` asociado, definiendo especialidad, comisión y tipo de contrato. |
| 3 | El administrador define la disponibilidad semanal (día, hora de inicio/fin, buffer). |
| 4 | El sistema valida y persiste los datos. |

**Sub-Flujo**

| N° | Nombre | Descripción |
| :---: | :---- | :---- |
| 1 | Configurar categorías y servicios | El administrador crea o edita `Categoria` y `Servicio` (nombre, duración, precio, depósito, si requiere ficha de salud, horas de cancelación sin penalidad). |
| 2 | Crear una cita para un cliente | El administrador reserva una cita en nombre de un cliente, sin la restricción de anticipación mínima que aplica al cliente. |

**Reglas de Negocio**

- El buffer configurado aquí es el que se valida en cada reserva de cliente (RN13, ver CU-C01).

**Excepciones**

- Datos incompletos o inválidos: el sistema rechaza la creación con el detalle del campo inválido.

---

## 3.2. Especificación de caso de uso: Confirmar, rechazar o reembolsar un pago

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Gestionar\_Pago (CU-A02) |
| **Requerimiento** | RF-023 (Consultar pagos de una cita), RF-025–RF-029 (registrar/confirmar/rechazar/reembolsar pago) |
| **Pre-condición** | `Pago` en `pendiente` (para confirmar o rechazar) o en `confirmado` (para reembolsar). |
| **Post-condición** | `Pago.estado` actualizado; `confirmado_por` y `fecha_confirmacion` registrados. |
| **Actores** | AS\_Administrador |

**Flujo Principal — Administrador**

| N° | Descripción |
| :---: | :---- |
| 1 | El administrador consulta los pagos pendientes de conciliación. |
| 2 | El administrador revisa el comprobante (efectivo, Yape, Plin, transferencia, tarjeta) fuera del sistema. |
| 3 | El administrador confirma o rechaza el pago manualmente. |

**Sub-Flujo**

| N° | Nombre | Descripción |
| :---: | :---- | :---- |
| 1 | Reembolsar pago | Sobre un pago ya `confirmado`, el administrador registra un pago de tipo `reembolso`, sin integración automática con la fuente del cobro original. |

**Reglas de Negocio**

Ninguna con código propio — es un proceso manual de conciliación.

**Excepciones**

Ninguna específica.

---

## 3.3. Especificación de caso de uso: Configurar un descuento o un reto

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Configurar\_Descuento\_Reto (CU-A03) |
| **Requerimiento** | RF-055 (Listar descuentos), RF-056 (Crear descuento), RF-057 (Listar retos), RF-058 (Crear reto) |
| **Pre-condición** | Sesión de administrador iniciada. |
| **Post-condición** | `Descuento` o `Reto` creado. |
| **Actores** | AS\_Administrador |

**Flujo Principal — Administrador**

| N° | Descripción |
| :---: | :---- |
| 1 | El administrador elige si va a crear un descuento o un reto. |
| 2 | Para un descuento: define tipo, alcance, código, valor, límites de uso y vigencia. |
| 3 | Para un reto: define visitas requeridas, ventana de días y tipo/valor de recompensa. |
| 4 | El sistema persiste el registro. |

**Sub-Flujo**

No aplica.

**Reglas de Negocio**

Ninguna nueva. Limitación actual: solo crear y listar, sin edición ni borrado (ver `docs/FASES.md`, Fase 3).

**Excepciones**

Ninguna específica.

---

## 3.4. Especificación de caso de uso: Configurar niveles de fidelización y catálogo exclusivo *(planeado)*

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Configurar\_Niveles\_Catalogo (CU-A04) |
| **Requerimiento** | RF-070 (Gestionar niveles de fidelización), RF-073 (Gestionar catálogo exclusivo) |
| **Pre-condición** | Módulo de fidelización avanzada implementado. |
| **Post-condición** | `NivelFidelizacion` o `ProductoCatalogoExclusivo` creado/actualizado. |
| **Actores** | AS\_Administrador |

**Flujo Principal — Administrador**

| N° | Descripción |
| :---: | :---- |
| 1 | El administrador define un `NivelFidelizacion` (umbral y beneficios). |
| 2 | El administrador carga productos del catálogo exclusivo con su `nivel_minimo`. |
| 3 | El administrador consulta el estado de los pedidos. |

**Sub-Flujo**

No aplica (ver CU-A07 para la gestión de pedidos como caso de uso propio).

**Reglas de Negocio**

RN20, RN21, RN22, RN23, RN24.

**Excepciones**

Ninguna específica.

---

## 3.5. Especificación de caso de uso: Gestionar el catálogo de estilos para la IA *(planeado)*

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Gestionar\_Catalogo\_Estilos (CU-A05) |
| **Requerimiento** | RF-066 (Gestionar catálogo de estilos) |
| **Pre-condición** | Módulo de IA implementado. |
| **Post-condición** | `EstiloCatalogo` creado, editado o dado de baja. |
| **Actores** | AS\_Administrador |

**Flujo Principal — Administrador**

| N° | Descripción |
| :---: | :---- |
| 1 | El administrador carga un estilo de referencia con su imagen y atributos (forma de rostro, tipo/largo de cabello, etiquetas). |
| 2 | El sistema valida y persiste el estilo. |

**Sub-Flujo**

| N° | Nombre | Descripción |
| :---: | :---- | :---- |
| 1 | Editar o dar de baja un estilo existente | El administrador modifica los atributos de un estilo ya cargado o lo desactiva del catálogo. |

**Reglas de Negocio**

RN16, RN17, RN18, RN19 — el catálogo es la única fuente de imágenes del módulo.

**Excepciones**

Ninguna específica.

---

## 3.6. Especificación de caso de uso: Ver el dashboard operativo

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Ver\_Dashboard\_Operativo (CU-A06) |
| **Requerimiento** | RF-021 (Listar todas las citas), RF-026 (Listar pagos pendientes) |
| **Pre-condición** | Sesión de administrador iniciada. |
| **Post-condición** | Ninguna — caso de uso de solo consulta. |
| **Actores** | AS\_Administrador |

**Flujo Principal — Administrador**

| N° | Descripción |
| :---: | :---- |
| 1 | El administrador abre el dashboard. |
| 2 | El sistema consulta las citas del día, los pagos pendientes y el personal activo. |
| 3 | El sistema muestra los KPIs (citas del día, ingresos, no-shows) en tipografía destacada. |

**Sub-Flujo**

No aplica.

**Reglas de Negocio**

Ninguna nueva.

**Excepciones**

Ninguna específica.

---

## 3.7. Especificación de caso de uso: Gestionar pedidos del catálogo exclusivo *(planeado)*

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Gestionar\_Pedidos\_Catalogo (CU-A07) |
| **Requerimiento** | RF-076 (Gestionar pedidos del catálogo) |
| **Pre-condición** | Existe al menos un `PedidoCatalogo` en `pagado`. |
| **Post-condición** | `PedidoCatalogo.estado = entregado`, visible en el historial del cliente. |
| **Actores** | AS\_Administrador |

**Flujo Principal — Administrador**

| N° | Descripción |
| :---: | :---- |
| 1 | El administrador filtra pedidos por estado, cliente o producto. |
| 2 | El administrador abre el detalle de un pedido. |
| 3 | Tras entregar el producto físicamente, el administrador lo marca como `entregado`. |

**Sub-Flujo**

No aplica.

**Reglas de Negocio**

- El pedido debe haber llegado a `pagado` de forma idempotente antes de poder entregarse (RN23).

**Excepciones**

- Intento de marcar como entregado un pedido que no está `pagado`: 422.

---

## 3.8. Especificación de caso de uso: Revisar métricas de confianza del catálogo de estilos *(planeado)*

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Revisar\_Metricas\_Confianza (CU-A08) |
| **Requerimiento** | RF-068 (Consultar métricas de uso de IA) |
| **Pre-condición** | Al menos un feedback registrado (CU-T06). |
| **Post-condición** | Ninguna — caso de uso de solo consulta. |
| **Actores** | AS\_Administrador |

**Flujo Principal — Administrador**

| N° | Descripción |
| :---: | :---- |
| 1 | El administrador abre el panel de métricas de IA. |
| 2 | El sistema muestra, por estilo, el porcentaje de feedback positivo registrado por las especialistas. |

**Sub-Flujo**

No aplica.

**Reglas de Negocio**

Ninguna nueva.

**Excepciones**

Ninguna específica.

---

## 3.9. Especificación de caso de uso: Gestionar clientes

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Gestionar\_Clientes (CU-A09) |
| **Requerimiento** | RF-037 (Listar clientes), RF-038 (Consultar cliente), RF-039 (Editar cliente), RF-040 (Consultar historial de citas), RF-043 (Bloquear cliente), RF-044 (Desbloquear cliente) |
| **Pre-condición** | Sesión de administrador iniciada. |
| **Post-condición** | `Cliente` actualizado; si aplica, `esta_bloqueada`/`motivo_bloqueo` (o su reverso) persistidos. |
| **Actores** | AS\_Administrador |

**Flujo Principal — Administrador**

| N° | Descripción |
| :---: | :---- |
| 1 | El administrador lista clientes con sus etiquetas y estado de bloqueo. |
| 2 | El administrador consulta el detalle de una clienta, incluyendo su historial de citas. |
| 3 | El administrador edita etiquetas o notas internas. |

**Sub-Flujo**

| N° | Nombre | Descripción |
| :---: | :---- | :---- |
| 1 | Bloquear cliente | El administrador indica un motivo y el sistema marca `esta_bloqueada=true` con la fecha de bloqueo. |
| 2 | Desbloquear cliente | El administrador revierte el bloqueo. |

**Reglas de Negocio**

- Una clienta bloqueada no puede reservar — el sistema rechaza la reserva con un mensaje genérico, sin exponer el motivo (RN11, ver CU-C01).

**Excepciones**

- Intento de editar `correo` o `password` desde este flujo: 422 (debe usarse CU-A10).

---

## 3.10. Especificación de caso de uso: Administrar cuentas de usuario del staff

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Administrar\_Cuentas\_Usuario (CU-A10) |
| **Requerimiento** | RF-046 (Listar usuarios), RF-047 (Consultar usuario), RF-048 (Editar usuario), RF-049 (Cambiar correo), RF-050 (Resetear contraseña), RF-051 (Cambiar estado de usuario) |
| **Pre-condición** | Sesión de administrador iniciada. |
| **Post-condición** | `Usuario` actualizado en el campo correspondiente. |
| **Actores** | AS\_Administrador |

**Flujo Principal — Administrador**

| N° | Descripción |
| :---: | :---- |
| 1 | El administrador lista o consulta usuarios, filtrando por rol y estado. |
| 2 | El administrador edita nombre o teléfono. |
| 3 | El administrador cambia el correo de una cuenta (el sistema resetea `correo_verificado=false`). |
| 4 | El administrador resetea la contraseña de una cuenta sin conocer la actual. |
| 5 | El administrador activa o desactiva la cuenta. |

**Sub-Flujo**

No aplica.

**Reglas de Negocio**

Ninguna con código propio — es la única vía autorizada para tocar credenciales de una cuenta que no es la propia (ver CU-T08 para autogestión).

**Excepciones**

Ninguna específica.

---

## 3.11. Especificación de caso de uso: Configurar el módulo de asesoría de IA *(planeado)*

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Configurar\_Modulo\_IA (CU-A11) |
| **Requerimiento** | RF-067 (Configurar módulo de IA) |
| **Pre-condición** | Módulo de IA implementado. |
| **Post-condición** | Configuración persistida, efectiva desde la siguiente consulta. |
| **Actores** | AS\_Administrador |

**Flujo Principal — Administrador**

| N° | Descripción |
| :---: | :---- |
| 1 | El administrador activa o desactiva el módulo de IA. |
| 2 | El administrador define el límite diario de consultas por cliente. |

**Sub-Flujo**

No aplica.

**Reglas de Negocio**

- El límite diario configurado aquí es el que se valida en cada consulta de CU-C06/CU-T04 (RN18).

**Excepciones**

Ninguna específica.

---

## 3.12. Especificación de caso de uso: Recalcular niveles de fidelización automáticamente *(planeado, automático)*

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Recalcular\_Niveles\_Fidelizacion (CU-A12) |
| **Requerimiento** | RF-077 (Recalcular niveles de fidelización) |
| **Pre-condición** | Existen `NivelFidelizacion` activos y clientes con historial de visitas o gasto. |
| **Post-condición** | `cliente.nivel_actual` actualizado. |
| **Actores** | AS\_CeleryBeat |

**Flujo Principal — Programador de Tareas**

| N° | Descripción |
| :---: | :---- |
| 1 | En un intervalo configurable, el programador de tareas ejecuta el job de recálculo. |
| 2 | El sistema evalúa el historial de cada cliente contra los umbrales activos, en orden descendente. |
| 3 | El sistema asigna a cada cliente el nivel más alto que cumple. |

**Sub-Flujo**

No aplica.

**Reglas de Negocio**

- Una baja de nivel no revoca ningún pedido ya realizado mientras el cliente tenía el nivel anterior (RN21).

**Excepciones**

Ninguna — proceso batch sin interacción de usuario.
