# Reglas de Negocio — Welve

Convención de numeración: `RN01`–`RN15` son las reglas ya implementadas (código en
`backend/app/services/`). `RN16` en adelante pertenecen a los módulos nuevos documentados en
`docs/MODULO_ASESORIA_IA.md` y `docs/MODULO_FIDELIZACION_AVANZADA.md` — **no implementadas
aún**, incluidas aquí para que el diseño de negocio quede completo desde ya.

## Implementadas

| ID | Condición | Consecuencia | Por qué |
|----|-----------|--------------|---------|
| RN01 | Cliente cancela con ≥ N horas de anticipación (N = `servicio.horas_cancelacion_sin_penalidad`, **nunca hardcodeado**) | `Cita.estado → cancelada`, reembolso completo del depósito | Da flexibilidad real al cliente sin castigar un cambio de planes de buena fe, siempre que el salón tenga tiempo de reasignar el horario. |
| RN02 | Cliente cancela con < N horas | `Cita.estado → cancelada_tardia`, pierde el depósito, `penalizacion_aplicada=true` | El horario ya no es reasignable a tiempo — el depósito compensa el hueco en la agenda de la especialista. |
| RN03 | Cliente no se presenta (marcado manualmente por staff) | `Cita.estado → no_show`, pierde depósito, `penalizacion_aplicada=true` | Mismo fundamento que RN02: el hueco de agenda ya se perdió. |
| RN05 | Cita `confirmada` con `programada_en + 15min < now()` y sin `hora_llegada_real` | Celery beat (cada 5 min) la marca `no_show` automáticamente. Las citas `pendiente` **no** se ven afectadas | Evita que el no-show dependa de que el staff recuerde marcarlo manualmente; 15 min de margen cubre demoras razonables de tráfico/parking en Lima. |
| RN08 | `servicio.requiere_ficha_salud=true` | No se puede **crear** la cita sin una ficha de salud activa registrada para esa clienta | Servicios de riesgo (tintes, tratamientos químicos) no deben agendarse a ciegas sobre alergias/restricciones desconocidas. |
| RN09 | Ficha con `severidad='critica'` al pasar la cita a `en_curso` | API responde 422 con `codigo: "FICHA_CRITICA"` y el detalle de las fichas; el caller reenvía con `confirmar_ficha_critica: true` para proceder | No bloquea el servicio (la especialista puede decidir proceder con cuidado extra), pero garantiza que no arranque sin que alguien haya visto la alerta explícitamente. |
| RN11 | `cliente.esta_bloqueada=true` | Se rechaza la reserva con un mensaje genérico (sin exponer el motivo del bloqueo al cliente) | Protege al salón de clientas conflictivas sin generar una disputa pública sobre el motivo. |
| RN13 | Buffer entre citas de una misma especialista | Disponibilidad real = `termina_en + personal.minutos_buffer`; una nueva cita no puede solaparse contra ninguna cita existente (salvo estados terminales: cancelada/cancelada_tardia/no_show) considerando ese buffer en ambas direcciones | El buffer modela tiempo real de limpieza/preparación entre clientas — sin él, la agenda "cabe" en el sistema pero no en la realidad. |
| RN14 | `descuento.max_usos_por_cliente` (default 1) | Se valida el conteo de usos previos antes de aplicar cualquier descuento | Evita que un código promocional pensado como "una vez por clienta" se explote repetidamente. |
| RN15 | Al completar una cita (`estado → completada`) | Se llama automáticamente `fidelizacion_service.verificar_retos_completados` — si la clienta cumplió un reto, se genera su descuento premio de forma idempotente | La fidelización debe sentirse automática — ninguna clienta debería tener que "reclamar" un reto cumplido. |

Notas de implementación transversales:
- **N horas de cancelación**: siempre se lee `servicio.horas_cancelacion_sin_penalidad` — nunca
  un valor global fijo (distintos servicios tienen distinta anticipación razonable).
- **Depósito**: siempre se lee `servicio.monto_deposito` — nunca un monto fijo genérico.
- Transiciones de estado válidas centralizadas en `backend/app/services/citas_service.py`
  (`_TRANSICIONES_VALIDAS`) — cualquier regla nueva sobre estados de cita debe respetar esa
  tabla como fuente única de verdad.

## Planeadas (módulos nuevos — no implementadas)

### Asesoría de belleza con IA (`docs/MODULO_ASESORIA_IA.md`)

| ID | Condición | Consecuencia | Por qué |
|----|-----------|--------------|---------|
| RN16 | Cliente o trabajador activa la cámara para una consulta de IA | Debe aceptar explícitamente el consentimiento de procesamiento de imagen antes de que se envíe cualquier foto al backend | La foto capturada es un dato biométrico sensible — el consentimiento explícito no es opcional, aunque la foto nunca se almacene (ver RN17). |
| RN17 | Cualquier foto capturada para análisis de IA | Se procesa en memoria y se descarta inmediatamente después de obtener la recomendación — **nunca se persiste** en disco/storage | Minimiza superficie de riesgo de privacidad y elimina el problema de "guardar fotos es pesado" de raíz: no hay nada que guardar. |
| RN18 | Límite de consultas de IA por cliente por día (configurable por admin) | Al superar el límite, la API rechaza nuevas consultas hasta el siguiente día, mostrando cuántas quedan | Controla el costo de la API de IA y evita abuso del feature. |
| RN19 | Selección de estilo enviada a un especialista | Solo válida si está ligada a una `Cita` futura del mismo cliente con ese especialista (o sin especialista fijo, a cualquiera que la atienda) | Evita que el historial de estilos se desligue del contexto real de atención. |

### Fidelización avanzada (`docs/MODULO_FIDELIZACION_AVANZADA.md`)

| ID | Condición | Consecuencia | Por qué |
|----|-----------|--------------|---------|
| RN20 | Recalcular nivel de fidelización de un cliente | Job periódico (o cálculo on-demand cacheado) evalúa visitas/gasto acumulado contra los umbrales de `NivelFidelizacion` activos, en orden descendente, y asigna el nivel más alto que el cliente cumple | El nivel debe reflejar comportamiento reciente, no solo el histórico acumulado desde siempre (según cómo el admin configure la ventana del umbral). |
| RN21 | Cliente baja de nivel tras un recálculo | Pierde acceso a partir de ese momento a productos del catálogo exclusivo cuyo `nivel_minimo` ya no cumple — pero **no se revoca** ningún pedido ya realizado mientras tenía el nivel | Un downgrade no debe sentirse punitivo retroactivamente; solo afecta compras futuras. |
| RN22 | Compra en el catálogo exclusivo | Requiere `cliente.nivel_actual >= producto.nivel_minimo` en el momento de la compra, validado en backend (no solo ocultar la UI) | La restricción de acceso es una regla de negocio, no un detalle visual — debe ser imposible de saltarse manipulando el cliente HTTP. |
| RN23 | Pago vía pasarela (Culqi u otra) confirmado por webhook | `PedidoCatalogo.estado → pagado` de forma idempotente (el webhook puede reintentar entregas) | Los webhooks de pasarelas de pago nunca garantizan entrega única — la actualización de estado debe poder procesarse más de una vez sin duplicar efectos. |
| RN24 | Pago de pasarela rechazado o webhook de fallo | `PedidoCatalogo.estado → cancelado`, sin afectar el nivel de fidelización del cliente | Un intento de compra fallido no es una señal de comportamiento del cliente, no debe tener efectos secundarios en su progreso. |
