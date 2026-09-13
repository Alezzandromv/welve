# Módulo: Fidelización Avanzada — Niveles, Catálogo Exclusivo y Pasarela de Pago

**Estado: planeado, no implementado.** Especificación completa para su futura implementación
(Fase 3 en `docs/FASES.md`). El módulo actual de fidelización (`Descuento`, `Reto`,
`DescuentoUso` — ver `CLAUDE.md` y `docs/REGLAS_DE_NEGOCIO.md` RT04/RT05) sigue vigente y no se
reemplaza: este módulo se **suma** como una capa de reconocimiento de largo plazo por encima de
los descuentos/retos puntuales que ya existen.

## El problema que resuelve

Hoy la fidelización de Welve es reactiva y transaccional: un reto puntual ("3 visitas en 30
días") da un descuento puntual. No hay ningún concepto de "esta clienta es fiel de verdad" que
persista en el tiempo ni que le dé acceso a algo que una clienta nueva no tiene. Este módulo
introduce **niveles de fidelización** (tipo bronce/plata/oro, nombres configurables por el
admin) que se calculan sobre el comportamiento acumulado del cliente y desbloquean beneficios
reales — en particular, acceso a un **catálogo de productos exclusivo** con pago vía pasarela.

## Modelo de datos

```
NivelFidelizacion
  id, nombre, orden (entero, para ordenar de menor a mayor nivel),
  tipo_umbral (visitas_totales | gasto_acumulado_soles | visitas_en_ventana),
  valor_umbral, dias_ventana (solo si tipo_umbral=visitas_en_ventana),
  beneficios (jsonb: acceso_catalogo_exclusivo: bool, descuento_automatico_pct: float,
  prioridad_reserva: bool, descripcion_visible: texto libre para mostrar al cliente),
  esta_activo

ProductoCatalogoExclusivo
  id, nombre, descripcion, precio, imagen_url, nivel_minimo_id → NivelFidelizacion,
  stock (opcional, null = sin control de stock), esta_activo

PedidoCatalogo
  id, cliente_id → Cliente, producto_id → ProductoCatalogoExclusivo, monto,
  estado (pendiente | pagado | entregado | cancelado),
  referencia_pasarela (id de transacción/checkout del proveedor de pago), fecha_creacion,
  fecha_actualizacion
```

A diferencia de `Descuento`/`Reto` (que hoy solo tienen crear+listar), este módulo se diseña
desde el inicio con **CRUD completo** para `NivelFidelizacion` y `ProductoCatalogoExclusivo` —
el admin necesita poder ajustar umbrales y catálogo sobre la marcha sin intervención técnica.

## Cálculo del nivel de un cliente

El nivel no es un campo que se setea manualmente — se **calcula** comparando el comportamiento
acumulado del cliente contra los umbrales de todos los `NivelFidelizacion` activos, y se le
asigna el más alto que cumple (RN14). Dos formas de disparar el cálculo, no mutuamente
excluyentes:

1. **Job periódico** (Celery beat, mismo patrón que `no_show.py`): recalcula el nivel de todos
   los clientes activos cada cierto intervalo (p. ej. diario), actualizando un campo
   `nivel_actual_id` sobre `Cliente` (o una tabla de estado separada si se prefiere no tocar el
   modelo `Cliente` existente).
2. **On-demand cacheado**: al consultar el catálogo exclusivo, si el nivel no se recalculó
   recientemente, se recalcula en el momento — útil para que un cliente vea su nuevo nivel sin
   esperar al batch nocturno tras una cita que lo hizo subir de nivel.

Si el cliente baja de nivel en un recálculo, pierde acceso a productos por encima de su nuevo
nivel **a partir de ese momento** — nunca retroactivamente sobre pedidos ya hechos (RN15).

## Pasarela de pago

**Recomendación: Culqi** — procesador de pagos peruano, soporta tarjetas, Yape y Plin
directamente, encaja naturalmente con el contexto Lima/Perú del negocio y con los métodos de
pago que Welve ya maneja manualmente en el módulo de `Pago`. Alternativas documentadas por si
Culqi no encajara en algún momento: MercadoPago Checkout Pro, Niubiz.

Flujo de integración:

1. El frontend cliente genera un token de checkout con el SDK de Culqi (nunca se manejan datos
   de tarjeta directamente en el backend de Welve).
2. El backend recibe el token, crea el cargo vía la API de Culqi, y crea `PedidoCatalogo` en
   `pendiente` mientras se confirma.
3. Culqi notifica el resultado vía **webhook** — el endpoint que lo recibe debe:
   - Verificar la firma del webhook (evitar que cualquiera pueda simular una confirmación de
     pago falsa).
   - Actualizar `PedidoCatalogo.estado` de forma **idempotente** (RN17) — los webhooks de
     pasarelas de pago pueden reintentar la entrega más de una vez; procesar el mismo evento
     dos veces no debe duplicar el efecto (mismo patrón `ON CONFLICT`/chequeo de estado actual
     que ya usa `verificar_retos_completados` en el módulo existente).
4. Pago rechazado o webhook de fallo → `PedidoCatalogo.estado = cancelado`, sin ningún efecto
   sobre el nivel de fidelización del cliente (RN18) — un intento fallido de compra no es una
   señal de comportamiento.

No se reemplaza el modelo `Pago` existente (que sigue siendo para pagos manuales de citas) —
`PedidoCatalogo` es un flujo de pago independiente, específico del catálogo exclusivo, con su
propia pasarela automatizada en vez de confirmación manual por admin.

## Archivos nuevos (backend)

Convención a respetar: el módulo de fidelización actual vive **entero bajo un solo router**
(`app/routers/fidelizacion.py`, montado una vez en `main.py` con `prefix="/api/v1/fidelizacion"`)
que mezcla rutas de cliente y de admin dentro del mismo archivo, distinguidas por
`requerir_rol(...)` en cada endpoint — a diferencia de `citas`/`pagos`/`personal`, que sí viven
bajo un router `admin.py` aparte con prefijo `/api/v1/admin`. El catálogo exclusivo es una
extensión natural de fidelización, así que sus rutas se agregan **al mismo router existente**,
no a uno nuevo con un prefijo distinto:

```
app/models/catalogo.py            # NivelFidelizacion, ProductoCatalogoExclusivo, PedidoCatalogo
app/schemas/catalogo.py            # requests/responses — CrearNivelRequest, NivelResponse,
                                    # CrearProductoRequest, ProductoResponse, PedidoResponse
app/services/catalogo_service.py   # CRUD de niveles/productos, calcular_nivel_cliente(),
                                    # crear_pedido(), confirmar_pago_webhook()
app/services/pasarela_service.py   # integración Culqi: crear_cargo(), verificar_firma_webhook()
app/routers/fidelizacion.py         # EXTENDER (no crear nuevo) — se agregan las rutas de la
                                    # tabla de abajo al router ya montado en /api/v1/fidelizacion
app/routers/webhooks.py            # nuevo router aparte, mount propio /api/v1/webhooks — es un
                                    # endpoint técnico de integración, no de negocio de
                                    # fidelización, por eso sí justifica un prefijo distinto
app/tasks/recalcular_niveles.py    # tarea de Celery beat — mismo patrón que tasks/no_show.py,
                                    # recalcula NivelFidelizacion.nivel_actual_id de cada cliente
```

`core/config.py` gana `culqi_secret_key`, `culqi_public_key`, `culqi_webhook_secret`. Una
migración de Alembic agrega las tres tablas nuevas más la columna `Cliente.nivel_actual_id`
(FK opcional a `NivelFidelizacion`, actualizada por el job o on-demand).

Como parte de esta fase también se cierra el gap ya detectado en `docs/FASES.md`: se agrega
`PATCH`/`DELETE` a `routers/fidelizacion.py` para `Descuento` y `Reto` (hoy solo tienen crear +
listar) — no es estrictamente parte del módulo nuevo, pero es la oportunidad natural de
completarlo ya que se está tocando el mismo router.

## Endpoints nuevos (API)

Todos bajo `/api/v1/fidelizacion/` salvo el webhook (ver arriba por qué es la única excepción):

```
GET    /api/v1/fidelizacion/niveles                          # cualquier rol autenticado
POST   /api/v1/fidelizacion/niveles                          # admin
PATCH  /api/v1/fidelizacion/niveles/{id}                     # admin
DELETE /api/v1/fidelizacion/niveles/{id}                     # admin — baja lógica (esta_activo=false)
PATCH  /api/v1/fidelizacion/descuentos/{id}                  # admin — completa el CRUD existente
DELETE /api/v1/fidelizacion/descuentos/{id}                  # admin
PATCH  /api/v1/fidelizacion/retos/{id}                       # admin — completa el CRUD existente
DELETE /api/v1/fidelizacion/retos/{id}                       # admin
GET    /api/v1/fidelizacion/mi-nivel                         # cliente — nivel actual + progreso
GET    /api/v1/fidelizacion/catalogo-exclusivo               # cliente — productos según su nivel
                                                              # (los de nivel superior vienen
                                                              # igual, marcados `bloqueado: true`,
                                                              # para el teaser de UI)
POST   /api/v1/fidelizacion/catalogo-exclusivo               # admin — crear producto
PATCH  /api/v1/fidelizacion/catalogo-exclusivo/{id}          # admin
DELETE /api/v1/fidelizacion/catalogo-exclusivo/{id}          # admin
POST   /api/v1/fidelizacion/catalogo-exclusivo/{id}/comprar  # cliente — inicia checkout (crea
                                                              # PedidoCatalogo pendiente, devuelve
                                                              # token/config de Culqi)
GET    /api/v1/fidelizacion/pedidos-catalogo                 # admin — filtro por estado/cliente/producto
GET    /api/v1/fidelizacion/pedidos-catalogo/{id}            # admin — detalle
PATCH  /api/v1/fidelizacion/pedidos-catalogo/{id}/entregar   # admin — marcar como entregado
POST   /api/v1/webhooks/culqi                                # público, autenticado por firma
                                                              # (no JWT) — confirma/rechaza el pago
```

## Vistas y componentes nuevos (frontend)

**Admin** (`pages/admin/`):
- `NivelesFidelizacion.tsx` (nueva) — CRUD de niveles: nombre, orden, tipo/valor de umbral,
  beneficios (checkboxes + texto libre visible al cliente).
- `CatalogoExclusivo.tsx` (nueva, admin) — CRUD de productos: nombre, precio, imagen, nivel
  mínimo (select de `NivelFidelizacion`), stock opcional.
- `PedidosCatalogo.tsx` (nueva) — tabla de pedidos con filtro por estado/cliente/producto,
  detalle expandible, botón "Marcar entregado" para pedidos `pagado`.
- `FidelizacionPage.tsx` (extensión) — se agregan las acciones de editar/eliminar a las
  tarjetas de `Descuento`/`Reto` ya existentes (hoy solo listan).
- `Dashboard.tsx` (extensión) — widget "Fidelización": distribución de clientes por nivel
  (barra apilada) e ingresos del catálogo exclusivo del mes.

**Cliente** (`pages/client/`):
- `MiNivel.tsx` (nueva) o sección nueva dentro de `MisCitas.tsx` — barra de progreso visual
  hacia el siguiente nivel ("Te faltan 2 visitas para Oro"), beneficios del nivel actual.
- `CatalogoExclusivo.tsx` (nueva) — grid de productos con `GridEstilos`/tarjeta reutilizada del
  módulo de IA si el diseño coincide; productos bloqueados con overlay y teaser del nivel
  requerido; botón "Comprar" solo habilitado si el nivel alcanza.
- `components/client/CheckoutCulqi.tsx` (nuevo) — modal de checkout que monta el SDK de Culqi,
  genera el token, y llama a `POST /api/v1/fidelizacion/catalogo-exclusivo/{id}/comprar`.

**Trabajador**: opcional — mostrar el nivel de fidelización de la clienta (badge informativo,
sin acceso a comprar/gestionar) en el panel de detalle de una cita en `Agenda.tsx`, para dar
contexto de "esta es una clienta frecuente" sin exponer nada financiero adicional.

**Nuevos archivos de soporte**: `services/catalogo.service.ts`, `types/catalogo.ts`
(`INivelFidelizacion`, `IProductoCatalogo`, `IPedidoCatalogo`).

## Funcionalidades adicionales

- **Notificación de subida de nivel**: cuando el job de recálculo (o el cálculo on-demand)
  detecta que un cliente subió de nivel, se envía un WhatsApp de felicitación con los nuevos
  beneficios desbloqueados (reutiliza `utils/whatsapp.py`).
- **Notificación de pedido confirmado/entregado**: WhatsApp al cliente cuando
  `PedidoCatalogo.estado` pasa a `pagado` y de nuevo cuando pasa a `entregado`.
- **Reporte exportable**: botón "Exportar CSV" en `PedidosCatalogo.tsx` para que el admin pueda
  llevar los canjes a una hoja de cálculo externa si lo necesita.

## Filosofía de UX: gamificación honesta

El principio de diseño para `CatalogoExclusivo.tsx` (cliente): los productos dentro del nivel
actual se ven normales y comprables; los de niveles superiores aparecen visualmente bloqueados
con un teaser ("Disponible desde nivel Oro — te faltan 2 visitas") en vez de ocultarse — esto
gamifica el progreso dando un motivo concreto para seguir siendo clienta frecuente, en vez de
esconder la existencia del beneficio. La restricción real de acceso se valida en el backend al
momento de comprar (RN16) — el bloqueo visual es UX, la seguridad vive en la API.

## Roles y visibilidad

Ver `docs/ROLES_Y_PERMISOS.md`. El trabajador no tiene acceso a este módulo (es
financiero/comercial, fuera de su contexto operativo) salvo, potencialmente, ver de forma
informativa el nivel de fidelización de una clienta que está atendiendo — a decidir en el
diseño de UI de la Fase 3, no bloqueante para la especificación de datos aquí.
