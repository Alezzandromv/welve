# Sistema Web para la Gestión de Citas, Pagos y Fidelización de Clientes en Eunoia Beauty Salon

**WELVE**

**Especificación de Casos de Uso (ECU)**

Versión 1.2

---

## Revisión Histórica

| Fecha | Versión | Descripción | Autor |
| :---: | :---: | :---: | :---: |
| 08/09/2026 | 1.0 | Elaboración del documento — 32 ECU (Cliente, Trabajador, Administrador) | Vidal Chumacero, Marco Alessandro |
| 11/09/2026 | 1.1 | Renumeración de los casos de uso planeados de cada actor al final de su rango (antes intercalados con los implementados); retiro de CU-A12 (recálculo de niveles) del catálogo de casos de uso — proceso batch sin punto de decisión humana, documentado solo como regla de negocio; alta de CU-A16 (Consultar métricas de fidelización) | Vidal Chumacero, Marco Alessandro |
| 12/09/2026 | 1.2 | Renumeración completa a un espacio único `CUS01`–`CUS34` (reemplaza `CU-Cxx`/`CU-Txx`/`CU-Axx`). Fusión de ECU que eran ramas del mismo flujo (cancelar a tiempo/tarde → `CUS08`; llegada + ficha crítica + no-show → `CUS11`; canjear descuento + completar reto → `CUS09`; autenticarse + gestionar cuenta → `CUS13`; gestionar personal + administrar cuentas → `CUS15`). Alta de `CUS04`, `CUS05`, `CUS07`, `CUS16`, `CUS21` (endpoint ya existente sin ECU propia) y de `CUS06`, `CUS12`, `CUS14` (pendientes/brecha de permisos, ver cada ficha). Los 13 ECU de los módulos planeados se movieron a un apéndice (§4). El total pasa de 32 a 34 | Vidal Chumacero, Marco Alessandro |

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

Convenciones de código usadas en las 34 fichas:

- **Caso de Uso**: `CUS_Nombre_Del_Caso_De_Uso` (nombre en PascalCase con guion bajo), seguido
  del identificador `CUSxx` ya usado en el resto de `docs/` para trazabilidad cruzada. El mapeo
  hacia la numeración anterior (`CU-Cxx`/`CU-Txx`/`CU-Axx`) está en
  `02_CASOS_DE_USO_UML.md#mapeo-con-la-numeración-anterior`.
- **Actores**: prefijo `AS_` (Actor del Sistema) + nombre sin espacios ni tildes — `AS_Cliente`,
  `AS_Trabajador`, `AS_Administrador`, `AS_CeleryBeat`, `AS_WhatsApp`, `AS_Gemini`, `AS_Culqi`.
- Las reglas de negocio se citan en prosa con su código `RNxx` entre paréntesis al final, para
  quedar trazables contra `docs/REGLAS_DE_NEGOCIO.md` sin perder la redacción libre que pide la
  plantilla.
- **`«pendiente»`**: caso de uso definido pero sin endpoint de backend todavía (`CUS06`).
  **`«brecha de permisos»`**: el endpoint existe pero con un `requerir_rol` más restrictivo del
  que esta ECU asume (`CUS12`, `CUS14`). Ninguno de los dos es "planeado" — ambos están dentro
  del alcance actual del sistema, solo incompletos.

---

## Tabla de Contenidos

1. **Cliente**
   1.1. CUS01 — Solicitar y verificar acceso por magic link
   1.2. CUS02 — Consultar y actualizar mi perfil
   1.3. CUS03 — Reservar cita
   1.4. CUS04 — Realizar pago de cita
   1.5. CUS05 — Consultar citas
   1.6. CUS06 — Reprogramar cita (pendiente)
   1.7. CUS07 — Consultar historial de servicios
   1.8. CUS08 — Cancelar cita
   1.9. CUS09 — Consultar y canjear beneficios de fidelización
2. **Trabajador / Especialista**
   2.1. CUS10 — Consultar agenda del día
   2.2. CUS11 — Actualizar estado de la cita
   2.3. CUS12 — Consultar alertas de salud de la clienta (brecha de permisos)
   2.4. CUS13 — Gestionar cuenta personal
   2.5. CUS14 — Consultar historial de cliente (brecha de permisos)
3. **Administrador**
   3.1. CUS15 — Gestionar personal
   3.2. CUS16 — Gestionar citas
   3.3. CUS17 — Gestionar clientes
   3.4. CUS18 — Gestionar pagos y reembolsos
   3.5. CUS19 — Gestionar beneficios
   3.6. CUS20 — Consultar dashboard
   3.7. CUS21 — Gestionar catálogo de servicios
4. **Apéndice — Módulos planeados (fuera del alcance de TP1–TP4)**
   4.1. Cliente: CUS22–CUS25
   4.2. Trabajador / Especialista: CUS26–CUS28
   4.3. Administrador: CUS29–CUS34

---

# 1. Cliente

## 1.1. Especificación de caso de uso: Solicitar y verificar acceso por magic link

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Solicitar\_Verificar\_Acceso (CUS01) |
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

## 1.2. Especificación de caso de uso: Consultar y actualizar mi perfil

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Gestionar\_Perfil\_Cliente (CUS02) |
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

## 1.3. Especificación de caso de uso: Reservar cita

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Reservar\_Cita (CUS03) |
| **Requerimiento** | RF-008 (Listar servicios), RF-009 (Listar categorías), RF-010 (Consultar disponibilidad), RF-015 (Crear cita) |
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
| 7 | El sistema confirma la reserva al cliente y muestra el depósito requerido (CUS04). |

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

## 1.4. Especificación de caso de uso: Realizar pago de cita

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Realizar\_Pago\_Cita (CUS04) |
| **Requerimiento** | Ninguno propio — es un proceso fuera del sistema; el registro y confirmación del lado del administrador están en RF-025/RF-027 (origen en CUS18) |
| **Pre-condición** | `Cita` en `pendiente` con el depósito pendiente de pago. |
| **Post-condición** | `Pago` con `tipo=deposito` y `estado=confirmado`. |
| **Actores** | AS\_Cliente, AS\_Administrador |

**Flujo Principal — Cliente**

| N° | Descripción |
| :---: | :---- |
| 1 | El sistema muestra el monto de `servicio.monto_deposito` al confirmar la reserva (CUS03). |
| 2 | El cliente paga fuera del sistema (Yape, Plin, transferencia o efectivo — no hay pasarela integrada todavía). |
| 3 | El cliente envía el comprobante por WhatsApp o lo presenta en el local. |
| 4 | El administrador registra el pago recibido (CUS18). |
| 5 | El administrador confirma el pago tras verificar el comprobante. |

**Sub-Flujo**

No aplica.

**Reglas de Negocio**

El monto del depósito nunca es un valor fijo — siempre se lee de `servicio.monto_deposito`, sin código de regla de negocio propio.

**Excepciones**

- Comprobante ilegible o monto incorrecto: el administrador rechaza el pago y el cliente debe reenviarlo (ver CUS18).

---

## 1.5. Especificación de caso de uso: Consultar citas

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Consultar\_Citas (CUS05) |
| **Requerimiento** | RF-016 (Listar mis citas) |
| **Pre-condición** | Sesión de cliente iniciada. |
| **Post-condición** | Ninguna — caso de uso de solo consulta. |
| **Actores** | AS\_Cliente |

**Flujo Principal — Cliente**

| N° | Descripción |
| :---: | :---- |
| 1 | El cliente abre "Mis Citas". |
| 2 | El sistema devuelve todas sus citas, enriquecidas con nombre de especialista y servicios. |
| 3 | La vista agrupa como "próximas" las citas en `pendiente`, `confirmada` o `en_curso`. |

**Sub-Flujo**

No aplica.

**Reglas de Negocio**

Ninguna específica.

**Excepciones**

Ninguna específica.

---

## 1.6. Especificación de caso de uso: Reprogramar cita *(pendiente)*

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Reprogramar\_Cita (CUS06) — **no implementado** |
| **Requerimiento** | Ninguno todavía — no existe endpoint de reprogramación en `backend/app/routers/citas.py` |
| **Pre-condición** *(deseada)* | Cita propia en `pendiente`/`confirmada`, con al menos las horas de anticipación de `servicio.horas_cancelacion_sin_penalidad`. |
| **Post-condición** *(deseada)* | `Cita.programada_en`/`termina_en` actualizados, sin crear una `Cita` nueva ni afectar el `Pago` ya confirmado. |
| **Actores** | AS\_Cliente |

**Flujo Principal — Cliente** *(deseado, no implementado)*

| N° | Descripción |
| :---: | :---- |
| 1 | El cliente elige un nuevo horario o especialista para una cita existente. |
| 2 | El sistema revalida disponibilidad y ficha de salud, igual que en CUS03. |
| 3 | El sistema actualiza `programada_en`/`termina_en` de la cita existente. |
| 4 | El sistema confirma la reprogramación al cliente. |

**Sub-Flujo**

No aplica.

**Reglas de Negocio**

Ninguna con código propio todavía — candidatas: RN01 (techo de anticipación mínima, mismo umbral que cancelar) y RN13 (disponibilidad de la nueva franja).

**Excepciones** *(deseadas)*

- Fuera de la ventana de anticipación: el sistema ofrece CUS08 (cancelar) en su lugar.
- Nuevo horario no disponible: 409, igual que en CUS03.

---

## 1.7. Especificación de caso de uso: Consultar historial de servicios

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Consultar\_Historial\_Servicios (CUS07) |
| **Requerimiento** | RF-016 (reutilizado de CUS05, mismo endpoint) |
| **Pre-condición** | Sesión de cliente iniciada. |
| **Post-condición** | Ninguna — caso de uso de solo consulta. |
| **Actores** | AS\_Cliente |

**Flujo Principal — Cliente**

| N° | Descripción |
| :---: | :---- |
| 1 | El cliente abre la sección de historial dentro de "Mis Citas". |
| 2 | El sistema filtra, del mismo resultado de CUS05, las citas en estado terminal (`completada`, `cancelada`, `cancelada_tardia`, `no_show`). |

**Sub-Flujo**

No aplica.

**Reglas de Negocio**

Ninguna específica.

**Excepciones**

Ninguna específica.

---

## 1.8. Especificación de caso de uso: Cancelar cita

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Cancelar\_Cita (CUS08) |
| **Requerimiento** | RF-017 (Cancelar cita) |
| **Pre-condición** | Cita propia en estado `pendiente` o `confirmada`. |
| **Post-condición** | `Cita.estado = cancelada` (sin penalidad) o `cancelada_tardia` (con penalidad), según la rama que corresponda. |
| **Actores** | AS\_Cliente |

**Flujo Principal — Cliente**

| N° | Descripción |
| :---: | :---- |
| 1 | El cliente abre "Mis Citas" y selecciona la cita a cancelar. |
| 2 | El cliente indica un motivo de cancelación (opcional). |
| 3 | El sistema calcula las horas restantes hasta `programada_en` y las compara contra `servicio.horas_cancelacion_sin_penalidad`. |
| 4 | El sistema bifurca hacia la Rama A o la Rama B del sub-flujo, según el resultado de la comparación. |
| 5 | El sistema notifica al cliente el resultado de la cancelación. |

**Sub-Flujo**

| N° | Nombre | Descripción |
| :---: | :---- | :---- |
| 1 | Rama A — Cancelación a tiempo | Horas restantes ≥ umbral del servicio: el sistema marca la cita como `cancelada`, sin penalidad, y dispara el reembolso completo del depósito (confirmación manual de un pago tipo `reembolso` por el administrador, RN01). |
| 2 | Rama B — Cancelación tardía | Horas restantes < umbral del servicio: el sistema marca la cita como `cancelada_tardia`, `penalizacion_aplicada=true`; el depósito no se reembolsa (RN02). |

**Reglas de Negocio**

- El umbral de horas se lee siempre de `servicio.horas_cancelacion_sin_penalidad` — nunca un valor fijo global, porque distintos servicios tienen distinta anticipación razonable (RN01).
- Bajo el umbral, el horario ya no es reasignable a tiempo — el depósito compensa el hueco en la agenda de la especialista (RN02).

**Excepciones**

- Cita en un estado no cancelable (`en_curso`, `completada`, u otro estado terminal): el sistema responde 422.

---

## 1.9. Especificación de caso de uso: Consultar y canjear beneficios de fidelización

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Consultar\_Canjear\_Beneficios (CUS09) |
| **Requerimiento** | RF-052 (Consultar mis retos), RF-053 (Consultar mis descuentos), RF-054 (Aplicar descuento), RF-059 (Verificar retos completados) |
| **Pre-condición** | Sesión de cliente iniciada; para el canje, código de descuento vigente con cupo global y personal disponibles. |
| **Post-condición** | `DescuentoUso` registrado, ligado a la cita y al cliente; o un nuevo `Descuento` premio disponible sin acción explícita del cliente. |
| **Actores** | AS\_Cliente |

**Flujo Principal — Cliente**

| N° | Descripción |
| :---: | :---- |
| 1 | El cliente consulta sus retos en curso y sus descuentos disponibles. |
| 2 | El cliente ingresa un código de descuento al momento de pagar una cita (CUS04). |
| 3 | El sistema bloquea la fila del descuento (`SELECT ... FOR UPDATE`) para serializar canjes concurrentes. |
| 4 | El sistema valida vigencia, `max_usos_global` y `max_usos_por_cliente`. |
| 5 | El sistema registra el `DescuentoUso`. |

**Sub-Flujo**

| N° | Nombre | Descripción |
| :---: | :---- | :---- |
| 1 | Generación automática de premio por reto completado | Al completarse una cita (CUS11 → `completada`), el sistema evalúa automáticamente todos los retos activos contra el historial del cliente; si alguno se cumple, genera un `Descuento` premio único, de forma idempotente (`ON CONFLICT DO NOTHING`), sin ninguna acción del cliente. |

**Reglas de Negocio**

- `descuento.max_usos_por_cliente` (por defecto 1) se valida contra el conteo de usos previos del cliente antes de aplicar cualquier descuento (RN14).
- La generación del descuento premio es automática e idempotente — ninguna clienta debe "reclamar" un reto cumplido (RN15).

**Excepciones**

- Código inexistente o inactivo: 404.
- Fuera de vigencia o cupo (global o personal) agotado: 422 con el motivo específico.
- Ningún reto activo cumple el umbral: el sistema no genera ningún descuento y continúa sin error.

---

# 2. Trabajador / Especialista

## 2.1. Especificación de caso de uso: Consultar agenda del día

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Consultar\_Agenda\_Dia (CUS10) |
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

## 2.2. Especificación de caso de uso: Actualizar estado de la cita

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Actualizar\_Estado\_Cita (CUS11) |
| **Requerimiento** | RF-018 (Cambiar estado de cita), RF-019 (Registrar llegada), RF-024 (Verificar no-show automático) |
| **Pre-condición** | Cita asignada a esa especialista (si el actor es Trabajador; el Administrador puede operar cualquier cita — CUS16). La transición solicitada es válida según la tabla de transiciones del sistema. |
| **Post-condición** | Estado de la cita actualizado; si el nuevo estado es `completada`, se dispara automáticamente CUS09; si es `no_show`, se pierde el depósito. |
| **Actores** | AS\_Trabajador, AS\_Administrador, AS\_CeleryBeat |

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
| 1 | Atender la alerta de ficha de salud crítica | Al intentar pasar a `en_curso`, si la clienta tiene una `FichaSalud` con severidad `critica`, el sistema responde con el detalle de las fichas sin permitir el avance; la especialista lo revisa (ver CUS12) y reenvía la petición confirmando explícitamente que la revisó, y el sistema permite el avance (RN09). |
| 2 | Marcar inasistencia manual (no-show) | Si la clienta no llega, la especialista marca directamente el estado `no_show`, aplicando la pérdida del depósito (RN03). |
| 3 | Marcar inasistencia automáticamente (no-show) | Cada 5 minutos, el Programador de Tareas (Celery Beat) busca todas las citas `confirmada` con `programada_en + 15 minutos < ahora` y sin `hora_llegada_real`, y las marca `no_show` con la misma penalización — las citas en `pendiente` nunca se ven afectadas (RN05). |

**Reglas de Negocio**

- Si existe una ficha de salud con severidad crítica, el sistema exige confirmación explícita antes de permitir el paso a `en_curso` (RN09).
- Al pasar a `completada`, se evalúan automáticamente los retos de fidelización del cliente (RN15).
- El margen de 15 minutos de la rama automática cubre demoras razonables de tráfico o parking (RN05).

**Excepciones**

- Transición de estado no permitida por la tabla de transiciones válidas: 422.
- Confirmación de ficha crítica no enviada: la cita permanece sin avanzar (422 persistente con el código `FICHA_CRITICA`).

---

## 2.3. Especificación de caso de uso: Consultar alertas de salud de la clienta *(brecha de permisos)*

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Consultar\_Alertas\_Salud (CUS12) — **brecha de permisos** |
| **Requerimiento** | Ninguno propio hoy — candidato: ampliar RF-041 (origen en CUS17) a `admin`+`trabajador` |
| **Estado actual** | `GET /clientes/{cliente_id}/fichas-salud` existe pero tiene `requerir_rol("admin")` en `backend/app/routers/clientes.py`; la especialista solo se entera de una ficha crítica de forma reactiva, dentro del 422 de CUS11. |
| **Pre-condición** *(deseada)* | Cita propia agendada con esa clienta. |
| **Post-condición** | Ninguna — caso de uso de solo consulta. |
| **Actores** | AS\_Trabajador |

**Flujo Principal — Trabajador** *(deseado, no disponible para este rol hoy)*

| N° | Descripción |
| :---: | :---- |
| 1 | La especialista abre el detalle de una cita en su agenda. |
| 2 | El sistema muestra las fichas de salud registradas de esa clienta (tipo de restricción, descripción, severidad), antes de que la clienta llegue. |

**Sub-Flujo**

No aplica.

**Reglas de Negocio**

RN08, RN09 — las mismas que motivan la alerta reactiva de CUS11.

**Excepciones**

- Hoy: el trabajador que invoca directamente el endpoint recibe 403 (guardado solo para `admin`).

---

## 2.4. Especificación de caso de uso: Gestionar cuenta personal

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Gestionar\_Cuenta\_Personal (CUS13) |
| **Requerimiento** | RF-003 (Registrar personal), RF-004 (Iniciar sesión staff), RF-005 (Consultar perfil propio), RF-006 (Actualizar perfil propio), RF-007 (Cambiar contraseña) |
| **Pre-condición** | Cuenta de staff ya creada (auto-registro o CUS15). |
| **Post-condición** | Sesión de staff iniciada (JWT emitido); o `Usuario` (y su hash de contraseña, si aplica) actualizado. |
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
| 2 | Gestionar mi perfil | El miembro del staff consulta o edita su nombre, correo o teléfono, y opcionalmente cambia su contraseña indicando la actual y una nueva de al menos 8 caracteres. |

**Reglas de Negocio**

Ninguna con código propio.

**Excepciones**

- Credenciales inválidas: 401.
- Cuenta desactivada: 403.
- Contraseña actual incorrecta: 401.
- Correo ya usado por otra cuenta: 409.

---

## 2.5. Especificación de caso de uso: Consultar historial de cliente *(brecha de permisos)*

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Consultar\_Historial\_Cliente (CUS14) — **brecha de permisos** |
| **Requerimiento** | Ninguno propio hoy — candidato: ampliar RF-040 (origen en CUS17) a `admin`+`trabajador` |
| **Estado actual** | `GET /clientes/{cliente_id}/historial` existe pero tiene `requerir_rol("admin")`. Ampliarlo no debería violar el aislamiento de datos del trabajador: es información de la clienta, no financiera ni de otra especialista. |
| **Pre-condición** *(deseada)* | La clienta tiene al menos una cita previa en el salón. |
| **Post-condición** | Ninguna — caso de uso de solo consulta. |
| **Actores** | AS\_Trabajador |

**Flujo Principal — Trabajador** *(deseado, no disponible para este rol hoy)*

| N° | Descripción |
| :---: | :---- |
| 1 | La especialista abre el detalle de una clienta agendada. |
| 2 | El sistema muestra su historial de citas anteriores (servicios, fecha, especialista). |

**Sub-Flujo**

No aplica.

**Reglas de Negocio**

Ninguna específica.

**Excepciones**

- Hoy: el trabajador que invoca directamente el endpoint recibe 403 (guardado solo para `admin`).

---

# 3. Administrador

## 3.1. Especificación de caso de uso: Gestionar personal

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Gestionar\_Personal (CUS15) |
| **Requerimiento** | RF-030–RF-035 (CRUD de personal y disponibilidad), RF-045 (crear usuario), RF-046–RF-051 (administrar cuentas de staff) |
| **Pre-condición** | Sesión de administrador iniciada. |
| **Post-condición** | `Usuario`, `Personal` y su `DisponibilidadPersonal` creados o actualizados. |
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
| 1 | Administrar cuentas de staff existentes | El administrador lista o consulta usuarios por rol y estado, edita nombre/teléfono, cambia el correo (el sistema resetea `correo_verificado=false`), resetea la contraseña sin conocer la actual, y activa o desactiva la cuenta — única vía autorizada para tocar credenciales que no son las propias (ver CUS13 para autogestión). |

**Reglas de Negocio**

- El buffer configurado aquí es el que se valida en cada reserva de cliente (RN13, ver CUS03/CUS16).

**Excepciones**

- Datos incompletos o inválidos: el sistema rechaza la creación con el detalle del campo inválido.

---

## 3.2. Especificación de caso de uso: Gestionar citas

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Gestionar\_Citas (CUS16) |
| **Requerimiento** | RF-021 (Listar todas las citas), RF-022 (Crear cita para un cliente) |
| **Pre-condición** | Sesión de administrador iniciada. |
| **Post-condición** | `Cita` creada o listada según la operación. |
| **Actores** | AS\_Administrador |

**Flujo Principal — Administrador**

| N° | Descripción |
| :---: | :---- |
| 1 | El administrador lista todas las citas del salón, con filtros de fecha/estado (no solo las propias, a diferencia de CUS10). |
| 2 | El administrador reserva una cita en nombre de un cliente (p. ej. una reserva telefónica o presencial), con las mismas validaciones que CUS03. |
| 3 | El administrador avanza el estado o cancela cualquier cita usando los mismos endpoints que CUS11/CUS08, sin la restricción de "solo mis citas" que aplica al trabajador. |

**Sub-Flujo**

No aplica.

**Reglas de Negocio**

RN08, RN11, RN13 — las mismas que valida CUS03 al crear una cita; no se redocumentan aparte.

**Excepciones**

- Las mismas de CUS03: cliente bloqueada (403), ficha de salud requerida e inexistente (422), horario no disponible (409).

---

## 3.3. Especificación de caso de uso: Gestionar clientes

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Gestionar\_Clientes (CUS17) |
| **Requerimiento** | RF-037 (Listar clientes), RF-038 (Consultar cliente), RF-039 (Editar cliente), RF-040 (Consultar historial de citas), RF-041 (Listar fichas de salud), RF-042 (Registrar ficha de salud), RF-043 (Bloquear cliente), RF-044 (Desbloquear cliente) |
| **Pre-condición** | Sesión de administrador iniciada. |
| **Post-condición** | `Cliente` actualizado; si aplica, `esta_bloqueada`/`motivo_bloqueo` (o su reverso) persistidos; si aplica, nueva `FichaSalud` registrada. |
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
| 3 | Registrar ficha de salud | El administrador ingresa tipo de restricción, descripción y severidad (`informativa`/`moderada`/`critica`); el sistema crea la `FichaSalud` ligada a la clienta. |
| 4 | Consultar fichas de salud | El administrador lista las `FichaSalud` registradas de la clienta. |

**Reglas de Negocio**

- Una clienta bloqueada no puede reservar — el sistema rechaza la reserva con un mensaje genérico, sin exponer el motivo (RN11, ver CUS03).
- Un servicio con `requiere_ficha_salud=true` no puede reservarse sin una ficha activa registrada aquí para esa clienta (RN08, ver CUS03). Una ficha con `severidad='critica'` dispara la alerta de CUS11 al iniciar la cita — hoy el trabajador no puede consultarla aparte (ver la brecha de permisos de CUS12).

**Excepciones**

- Intento de editar `correo` o `password` desde este flujo: 422 (debe usarse CUS15).

---

## 3.4. Especificación de caso de uso: Gestionar pagos y reembolsos

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Gestionar\_Pagos\_Reembolsos (CUS18) |
| **Requerimiento** | RF-023 (Consultar pagos de una cita), RF-025 (Registrar pago), RF-026 (Listar pagos pendientes), RF-027–RF-029 (Confirmar/rechazar/reembolsar pago) |
| **Pre-condición** | `Pago` en `pendiente` (para confirmar o rechazar) o en `confirmado` (para reembolsar). |
| **Post-condición** | `Pago.estado` actualizado; `confirmado_por` y `fecha_confirmacion` registrados. |
| **Actores** | AS\_Administrador |

**Flujo Principal — Administrador**

| N° | Descripción |
| :---: | :---- |
| 1 | El administrador registra el pago que el cliente hizo fuera del sistema (CUS04). |
| 2 | El administrador consulta los pagos pendientes de conciliación. |
| 3 | El administrador revisa el comprobante (efectivo, Yape, Plin, transferencia, tarjeta) fuera del sistema. |
| 4 | El administrador confirma o rechaza el pago manualmente. |

**Sub-Flujo**

| N° | Nombre | Descripción |
| :---: | :---- | :---- |
| 1 | Reembolsar pago | Sobre un pago ya `confirmado`, el administrador registra un pago de tipo `reembolso`, sin integración automática con la fuente del cobro original — ejecuta la parte administrativa de RN01/RN02 decidida en CUS08. |

**Reglas de Negocio**

Ninguna con código propio — es un proceso manual de conciliación.

**Excepciones**

Ninguna específica.

---

## 3.5. Especificación de caso de uso: Gestionar beneficios

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Gestionar\_Beneficios (CUS19) |
| **Requerimiento** | RF-055 (Listar descuentos), RF-056 (Crear descuento), RF-057 (Listar retos), RF-058 (Crear reto) |
| **Pre-condición** | Sesión de administrador iniciada. |
| **Post-condición** | `Descuento` o `Reto` creado, disponible para que los clientes lo consulten y canjeen en CUS09. |
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

- Los límites de uso configurados aquí son los que valida el canje de CUS09 (RN14). Limitación actual: solo crear y listar, sin edición ni borrado (ver `docs/FASES.md`, Fase 3).

**Excepciones**

Ninguna específica.

---

## 3.6. Especificación de caso de uso: Consultar dashboard

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Consultar\_Dashboard (CUS20) |
| **Requerimiento** | Ninguno propio — compone del lado del frontend RF-021 (origen en CUS16) y RF-026 (origen en CUS18) |
| **Pre-condición** | Sesión de administrador iniciada. |
| **Post-condición** | Ninguna — caso de uso de solo consulta. |
| **Actores** | AS\_Administrador |

**Flujo Principal — Administrador**

| N° | Descripción |
| :---: | :---- |
| 1 | El administrador abre el dashboard. |
| 2 | El sistema consulta, en paralelo del lado del frontend, las citas del día (CUS16), los pagos pendientes (CUS18) y el personal activo (CUS15). |
| 3 | El sistema muestra los KPIs (citas del día, ingresos, no-shows) en tipografía destacada. |

**Sub-Flujo**

No aplica.

**Reglas de Negocio**

Ninguna nueva.

**Excepciones**

Ninguna específica.

---

## 3.7. Especificación de caso de uso: Gestionar catálogo de servicios

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Gestionar\_Catalogo\_Servicios (CUS21) |
| **Requerimiento** | RF-011 (Crear categoría), RF-012 (Editar categoría), RF-013 (Crear servicio), RF-014 (Editar servicio) |
| **Pre-condición** | Sesión de administrador iniciada. |
| **Post-condición** | `Categoria` o `Servicio` creado o actualizado. |
| **Actores** | AS\_Administrador |

**Flujo Principal — Administrador**

| N° | Descripción |
| :---: | :---- |
| 1 | El administrador crea o edita una `Categoria` (nombre, ícono, color, orden). |
| 2 | El administrador crea o edita un `Servicio` (nombre, duración, precio, depósito, si requiere ficha de salud, horas de cancelación sin penalidad). |
| 3 | El sistema valida y persiste los datos. |

**Sub-Flujo**

No aplica.

**Reglas de Negocio**

Ninguna con código propio — es el punto de configuración de los umbrales que validan RN01, RN02 y RN08 en tiempo de reserva (CUS03/CUS16).

**Excepciones**

Ninguna específica.

---

# 4. Apéndice — Módulos planeados (fuera del alcance de TP1–TP4)

Mismas 13 ECU de la revisión anterior, renumeradas de `CU-Cxx`/`CU-Txx`/`CU-Axx` a
`CUS22`–`CUS34`. Pertenecen a los dos módulos documentados pero no implementados
(`docs/MODULO_ASESORIA_IA.md`, `docs/MODULO_FIDELIZACION_AVANZADA.md`) — se mantienen con el
mismo nivel de detalle porque una tesis debe poder evaluar el diseño completo del sistema, no
solo lo construido hasta la fecha de corte.

## 4.1. Cliente

### 4.1.1. Especificación de caso de uso: Consulta de asesoría de estilo con IA *(planeado)*

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Consultar\_Asesoria\_IA (CUS22) |
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

### 4.1.2. Especificación de caso de uso: Marcar un estilo como favorito sin cámara *(planeado)*

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Marcar\_Estilo\_Favorito (CUS23) |
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

### 4.1.3. Especificación de caso de uso: Consultar mi nivel de fidelización y progreso *(planeado)*

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Consultar\_Nivel\_Fidelizacion (CUS24) |
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

### 4.1.4. Especificación de caso de uso: Comprar en el catálogo exclusivo *(planeado)*

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Comprar\_Catalogo\_Exclusivo (CUS25) |
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

## 4.2. Trabajador / Especialista

### 4.2.1. Especificación de caso de uso: Consulta de estilo en vivo durante la atención *(planeado)*

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Consulta\_IA\_En\_Vivo (CUS26) |
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

Mismas de CUS22: consentimiento obligatorio (RN16), no persistencia de la foto (RN17), límite diario de consultas (RN18), selección ligada a una cita real (RN19).

**Excepciones**

Las mismas de CUS22.

---

### 4.2.2. Especificación de caso de uso: Consultar el historial de estilos de una clienta recurrente *(planeado)*

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Consultar\_Historial\_Estilos (CUS27) |
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

### 4.2.3. Especificación de caso de uso: Dar feedback sobre el resultado de un estilo *(planeado)*

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Registrar\_Feedback\_Estilo (CUS28) |
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

Ninguna nueva — alimenta la métrica de confianza del catálogo (CUS30).

**Excepciones**

Ninguna específica.

---

## 4.3. Administrador

### 4.3.1. Especificación de caso de uso: Gestionar el catálogo de estilos para la IA *(planeado)*

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Gestionar\_Catalogo\_Estilos (CUS29) |
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

### 4.3.2. Especificación de caso de uso: Revisar métricas de confianza del catálogo de estilos *(planeado)*

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Revisar\_Metricas\_Confianza (CUS30) |
| **Requerimiento** | RF-068 (Consultar métricas de uso de IA) |
| **Pre-condición** | Al menos un feedback registrado (CUS28). |
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

### 4.3.3. Especificación de caso de uso: Configurar el módulo de asesoría de IA *(planeado)*

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Configurar\_Modulo\_IA (CUS31) |
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

- El límite diario configurado aquí es el que se valida en cada consulta de CUS22/CUS26 (RN18).

**Excepciones**

Ninguna específica.

---

### 4.3.4. Especificación de caso de uso: Configurar niveles de fidelización y catálogo exclusivo *(planeado)*

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Configurar\_Niveles\_Catalogo (CUS32) |
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

No aplica (ver CUS33 para la gestión de pedidos como caso de uso propio).

**Reglas de Negocio**

RN20, RN21, RN22, RN23, RN24.

**Excepciones**

Ninguna específica.

---

### 4.3.5. Especificación de caso de uso: Gestionar pedidos del catálogo exclusivo *(planeado)*

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Gestionar\_Pedidos\_Catalogo (CUS33) |
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

### 4.3.6. Especificación de caso de uso: Consultar métricas de fidelización *(planeado)*

| TÉRMINOS | DEFINICIÓN |
| :---- | :---- |
| **Caso de Uso** | CUS\_Consultar\_Metricas\_Fidelizacion (CUS34) |
| **Requerimiento** | RF-078 (Consultar métricas de fidelización) |
| **Pre-condición** | Módulo de fidelización avanzada habilitado. Al menos un cliente con nivel asignado. |
| **Post-condición** | Ninguna — caso de uso de solo consulta. |
| **Actores** | AS\_Administrador |

**Flujo Principal — Administrador**

| N° | Descripción |
| :---: | :---- |
| 1 | El administrador abre el dashboard operativo (CUS20). |
| 2 | El sistema muestra la distribución de clientes por nivel de fidelización. |
| 3 | El sistema muestra los ingresos del catálogo exclusivo del mes. |

**Sub-Flujo**

No aplica.

**Reglas de Negocio**

Ninguna con código propio — lee el resultado de RN20/RN21 (recálculo de niveles, proceso automático sin caso de uso propio, ver §2.2 de este documento) y de las compras registradas en CUS25.

**Excepciones**

Ninguna específica.
