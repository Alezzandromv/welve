# Reglas de Negocio — Eunoia Beauty Salon

Estas son las reglas del **negocio** (Eunoia como salón de belleza), no reglas del software.
Existen independientemente de si el sistema ya las aplica o no. Este documento distingue tres
grupos, deliberadamente separados:

1. **Reglas de negocio oficiales (RN01–RN09)** — el catálogo validado del negocio, tal cual.
2. **Reglas técnicas del sistema (RT01–RT05)** — mecanismos que el software ya construyó para
   sostener el negocio, pero que no forman parte del catálogo de 9 reglas oficiales.
3. **Reglas planeadas (RN10–RN18)** — política de negocio de los dos módulos futuros, sin código
   todavía.

## Convención de numeración (revisión actual)

Esta revisión separa el catálogo en dos espacios de numeración:

- **`RN01`–`RN18`**: reglas de **negocio** propiamente dichas — las 9 oficiales más las 9 de los
  módulos planeados (IA, fidelización avanzada), que sí son política de negocio prospectiva
  aunque todavía no tengan código.
- **`RT01`–`RT05`**: reglas **técnicas** del sistema — mecanismos concretos que el software ya
  implementa (ficha crítica, bloqueo de clienta, buffer de agenda, límite de descuento,
  fidelización automática) pero que no estaban en el catálogo de negocio de 9 reglas validado
  para Eunoia. Se documentan aparte, con ID propio, únicamente para poder seguir citándolas desde
  los casos de uso y requerimientos funcionales sin inflar el catálogo oficial.

Mapeo con la numeración anterior (dos revisiones atrás, `RN01`–`RN24` con huecos; una revisión
atrás, `RN01`–`RN23` sin huecos):

| Original (huecos) | Revisión anterior | Actual | Regla |
|---|---|---|---|
| RN01 | RN01 | **RN01** | Cancelación sin penalidad |
| RN02 | RN02 | **RN02** | Cancelación tardía |
| RN03 | RN03 | **RN03** | No-show |
| RN05 | RN04 | **RN04** | Tolerancia de llegada |
| — | — | **RN05** (nueva) | Prioridad de atención |
| — | — | **RN06** (nueva) | Garantía de cita |
| RN08 | RN07 | **RN07** | Restricciones de salud |
| — | — | **RN08** (nueva) | Reclamos post-servicio |
| — | — | **RN09** (nueva, ya implementada) | Validez del magic link |
| RN09 | RN10 | **RT01** | Ficha crítica al iniciar servicio |
| RN11 | RN11 | **RT02** | Cliente bloqueada |
| RN13 | RN12 | **RT03** | Buffer entre citas |
| RN14 | RN13 | **RT04** | Límite de descuento por cliente |
| RN15 | RN14 | **RT05** | Fidelización automática |
| RN16 | RN15 | **RN10** | IA — consentimiento de imagen |
| RN17 | RN16 | **RN11** | IA — descarte inmediato de foto |
| RN18 | RN17 | **RN12** | IA — límite diario de consultas |
| RN19 | RN18 | **RN13** | IA — selección ligada a cita futura |
| RN20 | RN19 | **RN14** | Recalcular nivel de fidelización |
| RN21 | RN20 | **RN15** | Downgrade de nivel no retroactivo |
| RN22 | RN21 | **RN16** | Acceso a catálogo exclusivo por nivel |
| RN23 | RN22 | **RN17** | Confirmación de pago de pasarela idempotente |
| RN24 | RN23 | **RN18** | Pago de pasarela rechazado |

---

## 1. Reglas de negocio oficiales (RN01–RN09)

Estas nueve reglas son el catálogo de negocio de Eunoia tal como fue definido, sin agregados.

| ID | Regla de Negocio | Condición | Consecuencia |
|----|-------------------|-----------|--------------|
| RN01 | Cancelación sin penalidad | La clienta cancela con mínimo N horas de anticipación (N = `servicio.horas_cancelacion_sin_penalidad`, definida por cada servicio — nunca un valor fijo global; el salón históricamente usaba 5 horas como referencia). | Devolución completa del depósito. |
| RN02 | Cancelación tardía | La clienta cancela con menos de N horas de anticipación. | Pérdida del depósito de reserva. |
| RN03 | No-show | La clienta no se presenta a la cita sin comunicación previa. | Pérdida total del depósito. La cita se marca como no atendida. |
| RN04 | Tolerancia de llegada tardía | La clienta llega con hasta 15 minutos de retraso. | La cita se mantiene. Pasados 15 minutos se considera no-show. |
| RN05 | Prioridad de atención | Existen citas con y sin depósito para el mismo horario. | Se prioriza a la clienta con depósito confirmado. |
| RN06 | Garantía de cita | La reserva no incluye pago de depósito. | La reserva queda en estado "pendiente"; no garantiza atención. |
| RN07 | Restricciones de salud | La clienta declara una restricción de salud relevante al servicio. | El sistema alerta a la técnica antes del servicio. Puede implicar adaptación del protocolo. |
| RN08 | Reclamos post-servicio | La clienta desea presentar un reclamo. | Solo se aceptan reclamos antes de que la clienta se retire del salón. |
| RN09 | Validez del magic link | La clienta accede al sistema mediante el enlace enviado por WhatsApp. | El enlace tiene validez de 1 hora. Tras su uso o vencimiento, se requiere nuevo enlace. |

### Estado de implementación y trazabilidad hacia CUS

| ID | Estado | CUS relacionados |
|----|--------|-------------------|
| RN01 | Implementada | CUS08, CUS16, CUS18 |
| RN02 | Implementada | CUS08, CUS16, CUS18 |
| RN03 | Implementada (marcado manual y automático — ver RT01 en la sección técnica para el detalle del disparo) | CUS11 |
| RN04 | Implementada | CUS11 |
| RN05 | No automatizada — el buffer/solapamiento (RT03) ya evita que dos citas de la misma especialista se crucen en el sistema, así que el conflicto que RN05 resuelve solo ocurre fuera de esa validación (dos personas compitiendo por un walk-in, una llamada telefónica simultánea a una reserva en línea); hoy el staff lo decide manualmente al gestionar la agenda. | CUS16 |
| RN06 | Implementada de forma implícita — `Cita.estado` permanece `pendiente` hasta confirmar el depósito (CUS18) — sin mecanismo activo que reasigne el horario si la clienta no paga. | CUS03, CUS04, CUS16 |
| RN07 | Implementada — mecanismo concreto en RT01 (ficha crítica) para la escalación en el momento del servicio. | CUS03, CUS12, CUS16, CUS17 |
| RN08 | **No implementada** — no existe ningún flujo, endpoint ni caso de uso que registre reclamos hoy. Se documenta para dejar explícita la política operativa del salón; sin CUS propio todavía. | Ninguno |
| RN09 | Implementada | CUS01 |

Notas de implementación transversales:
- **N horas de cancelación**: siempre se lee `servicio.horas_cancelacion_sin_penalidad` — nunca
  un valor global fijo (distintos servicios tienen distinta anticipación razonable). 5 horas es
  el valor de referencia histórico del salón, no un umbral hardcodeado en el sistema.
- **Depósito**: siempre se lee `servicio.monto_deposito` — nunca un monto fijo genérico.

---

## 2. Reglas técnicas del sistema (RT01–RT05)

Mecanismos que el software **ya construyó** para sostener el negocio (sobre todo como
implementación de RN07 y como reglas operativas de agenda/fidelización), pero que no forman
parte del catálogo de 9 reglas de negocio oficiales — son decisiones de diseño técnico, no
reglas que el negocio haya definido de forma independiente. Se numeran aparte (`RT`, no `RN`)
para poder seguir citándolas desde los casos de uso y los requerimientos funcionales.

| ID | Condición | Consecuencia | Relación con las RN oficiales |
|----|-----------|--------------|-------------------------------|
| RT01 | La cita tiene asociada una ficha de salud con `severidad='critica'` en el momento en que se intenta pasarla a `en_curso` | La API responde 422 con `codigo: "FICHA_CRITICA"` y el detalle de las fichas; el caller debe reenviar con `confirmar_ficha_critica: true` para proceder | Mecanismo concreto de RN07 (restricciones de salud) en el momento más crítico: justo antes de empezar el servicio |
| RT02 | `cliente.esta_bloqueada=true` | Se rechaza cualquier intento de reserva con un mensaje genérico, sin exponer el motivo del bloqueo | Protege la capacidad del salón de cumplir RN01/RN02/RN05/RN06 con clientas de buena fe, apartando a las conflictivas |
| RT03 | Dos citas de la misma especialista compiten por una franja de tiempo | Disponibilidad real = `termina_en + personal.minutos_buffer`; ninguna cita nueva puede solaparse contra una existente (salvo estados terminales) | Es la validación que en la práctica hace que el conflicto de RN05 (prioridad de atención) sea infrecuente: al no permitir solapamiento, rara vez compiten dos citas por el mismo horario exacto |
| RT04 | `descuento.max_usos_por_cliente` (por defecto 1) | Se valida el conteo de usos previos antes de aplicar cualquier descuento | Regla operativa de la fidelización — sin ID de negocio propio en la tabla de 9 |
| RT05 | Al completar una cita (`estado → completada`) | Se llama automáticamente a `fidelizacion_service.verificar_retos_completados`; si la clienta cumplió un reto, se genera su descuento premio de forma idempotente | Regla operativa de la fidelización — sin ID de negocio propio en la tabla de 9 |

**Todas están implementadas y corriendo en producción hoy** — la separación de RN01–09 es solo
para mantener el catálogo de negocio oficial exactamente en las 9 reglas validadas, no un
indicador de que estas 5 falten por construir.

CUS relacionados: RT01 → CUS11, CUS12. RT02 → CUS03, CUS16, CUS17. RT03 → CUS03, CUS15, CUS16.
RT04 → CUS09, CUS19. RT05 → CUS09, CUS11.

Transiciones de estado válidas centralizadas en `backend/app/services/citas_service.py`
(`_TRANSICIONES_VALIDAS`) — cualquier regla nueva sobre estados de cita debe respetar esa tabla
como fuente única de verdad.

---

## 3. Reglas planeadas (RN10–RN18) — módulos nuevos, no implementadas

A diferencia de las reglas técnicas (RT, ya construidas), estas sí son reglas de **negocio**
prospectivas — política que el negocio quiere para dos módulos futuros — solo que todavía sin
ningún código detrás. Por eso siguen numeradas como `RN`, en continuación del catálogo oficial.

### Asesoría de belleza con IA (`docs/MODULO_ASESORIA_IA.md`)

| ID | Condición | Consecuencia | Por qué |
|----|-----------|--------------|---------|
| RN10 | Cliente o trabajador activa la cámara para una consulta de IA | Debe aceptar explícitamente el consentimiento de procesamiento de imagen antes de que se envíe cualquier foto al backend | La foto capturada es un dato biométrico sensible — el consentimiento explícito no es opcional, aunque la foto nunca se almacene (ver RN11). |
| RN11 | Cualquier foto capturada para análisis de IA | Se procesa en memoria y se descarta inmediatamente después de obtener la recomendación — **nunca se persiste** en disco/storage | Minimiza superficie de riesgo de privacidad: no hay nada que guardar. |
| RN12 | Límite de consultas de IA por cliente por día (configurable por admin) | Al superar el límite, la API rechaza nuevas consultas hasta el siguiente día, mostrando cuántas quedan | Controla el costo de la API de IA y evita abuso del feature. |
| RN13 | Selección de estilo enviada a un especialista | Solo válida si está ligada a una `Cita` futura del mismo cliente con ese especialista (o sin especialista fijo) | Evita que el historial de estilos se desligue del contexto real de atención. |

### Fidelización avanzada (`docs/MODULO_FIDELIZACION_AVANZADA.md`)

| ID | Condición | Consecuencia | Por qué |
|----|-----------|--------------|---------|
| RN14 | Recalcular nivel de fidelización de un cliente | Job periódico evalúa visitas/gasto acumulado contra los umbrales activos y asigna el nivel más alto que el cliente cumple | El nivel debe reflejar comportamiento reciente, no solo el histórico acumulado. |
| RN15 | Cliente baja de nivel tras un recálculo | Pierde acceso a productos del catálogo exclusivo cuyo `nivel_minimo` ya no cumple — pero **no se revoca** ningún pedido ya realizado | Un downgrade no debe sentirse punitivo retroactivamente. |
| RN16 | Compra en el catálogo exclusivo | Requiere `cliente.nivel_actual >= producto.nivel_minimo`, validado en backend | La restricción de acceso es una regla de negocio, no un detalle visual. |
| RN17 | Pago vía pasarela (Culqi u otra) confirmado por webhook | `PedidoCatalogo.estado → pagado` de forma idempotente | Los webhooks nunca garantizan entrega única. |
| RN18 | Pago de pasarela rechazado o webhook de fallo | `PedidoCatalogo.estado → cancelado`, sin afectar el nivel de fidelización del cliente | Un intento fallido no debe tener efectos secundarios en el progreso del cliente. |

Un proceso automático sin ningún punto de decisión humana (RN14, recálculo periódico de niveles)
no se modela como caso de uso propio — se documenta directamente aquí. El no-show automático
(parte de RN03/RN04) sí se mantiene como flujo alternativo de CUS11 pese a dispararlo Celery
Beat, porque tiene una consecuencia visible y accionable por el trabajador.

CUS relacionados: RN10–RN13 → CUS22, CUS26, CUS27, CUS29, CUS31 (según la ficha). RN14 → ninguno
(sin punto de decisión humana). RN15–RN18 → CUS25, CUS32, CUS33.

---

## Matriz de trazabilidad RN/RT ↔ CUS ↔ RF

Vista consolidada: qué caso de uso invoca cada regla, y a través de qué requerimiento funcional
del catálogo de `docs/tesis/11_REQUERIMIENTOS_FUNCIONALES.md`. "—" significa que la regla no
tiene un RF propio (se aplica dentro de otro RF ya listado, o el caso de uso no existe todavía).

| Regla | CUS | RF que la aplica |
|-------|-----|-------------------|
| RN01 — Cancelación sin penalidad | CUS08, CUS16, CUS18 | RF-017, RF-029 |
| RN02 — Cancelación tardía | CUS08, CUS16, CUS18 | RF-017 |
| RN03 — No-show | CUS11 | RF-018, RF-024 |
| RN04 — Tolerancia de llegada | CUS11 | RF-024 |
| RN05 — Prioridad de atención | CUS16 | RF-022 |
| RN06 — Garantía de cita | CUS03, CUS04, CUS16 | RF-015, RF-022, RF-027 |
| RN07 — Restricciones de salud | CUS03, CUS12, CUS16, CUS17 | RF-013, RF-015, RF-041, RF-042 |
| RN08 — Reclamos post-servicio | — | — (sin CU ni RF: fuera del alcance actual) |
| RN09 — Validez de magic link | CUS01 | RF-001, RF-002 |
| RT01 — Ficha crítica al iniciar servicio | CUS11, CUS12 | RF-018, RF-042 |
| RT02 — Cliente bloqueada | CUS03, CUS16, CUS17 | RF-015, RF-022, RF-043, RF-044 |
| RT03 — Buffer entre citas | CUS03, CUS15, CUS16 | RF-010, RF-015, RF-022, RF-033, RF-034 |
| RT04 — Límite de descuento por cliente | CUS09, CUS19 | RF-053, RF-054 |
| RT05 — Fidelización automática | CUS09, CUS11 | RF-052, RF-059 |
| RN10–RN13 — Asesoría IA (planeadas) | CUS22, CUS26, CUS27, CUS29, CUS31 | RF-060–RF-062, RF-066, RF-067 |
| RN14–RN18 — Fidelización avanzada (planeadas) | CUS25, CUS32, CUS33 | RF-069–RF-078 |

Este documento es la vista **generalizada** (por regla y por caso de uso); el detalle completo de
cada requerimiento funcional (entrada → proceso → salida) vive en
`docs/tesis/11_REQUERIMIENTOS_FUNCIONALES.md`, que a su vez cita RN/RT por fila en su columna
**RN** — las dos tablas se leen juntas sin duplicar información.
