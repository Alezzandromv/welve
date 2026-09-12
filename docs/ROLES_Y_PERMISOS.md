# Roles y Permisos — Welve

Fuente de verdad funcional para los tres roles del sistema, incluyendo los módulos nuevos
planeados. El mecanismo técnico es `requerir_rol(*roles)` en `backend/app/core/security.py`
(dependency de FastAPI que valida el claim `rol` del JWT); algunos endpoints de autoservicio
usan solo `obtener_usuario_actual` y se autolimitan a los datos del propio usuario dentro del
service (ver notas al final).

Este documento reemplaza la descripción de roles antes dispersa entre `PRODUCT.md` y
`CLAUDE.md` — ambos ahora apuntan aquí para el detalle de permisos.

## Trabajador / Especialista

Rol operativo, sin visibilidad financiera ni de gestión. Todo lo que ve está acotado a su
propia agenda y sus propias clientas del día.

| Módulo | Ver | Crear | Editar | Eliminar |
|---|---|---|---|---|
| Agenda propia | ✅ (solo la suya) | — | — | — |
| Estado de cita (confirmar / iniciar / completar / no-show) | ✅ | — | ✅ (solo citas propias) | — |
| Llegada de clienta | ✅ | — | ✅ (solo citas propias) | — |
| Servicios de una cita | ✅ (solo citas propias) | — | — | — |
| Ficha de salud crítica (alerta) | ✅ (solo al iniciar cita) | — | — | — |
| Clientes / Pagos / Personal / Usuarios (admin) | ❌ | ❌ | ❌ | ❌ |
| Fidelización (descuentos/retos admin) | ❌ | ❌ | ❌ | ❌ |
| **(planeado)** Consulta de IA | ✅ (propias + iniciar nuevas) | ✅ | — | — |
| **(planeado)** Historial de estilos de clientas agendadas | ✅ | — | — | — |
| **(planeado)** Feedback post-servicio (¿el resultado coincidió con el estilo elegido?) | — | ✅ | — | — |
| **(planeado)** Catálogo de estilos (IA) | ✅ (lectura) | ❌ (solo admin) | ❌ | ❌ |
| **(planeado)** Nivel de fidelización de la clienta que atiende | ✅ (solo informativo) | — | — | — |
| **(planeado)** Niveles / catálogo exclusivo / pedidos (gestión) | ❌ | ❌ | ❌ | ❌ |

## Admin

Acceso total a todo lo anterior más las secciones exclusivas de gestión y finanzas.

| Módulo | Ver | Crear | Editar | Eliminar |
|---|---|---|---|---|
| Todo lo de Trabajador (cualquier especialista, no solo la propia) | ✅ | ✅ | ✅ | — |
| Citas (todas) | ✅ | ✅ | ✅ | — |
| Pagos (confirmar/rechazar/reembolsar) | ✅ | ✅ | ✅ | — |
| Personal y disponibilidad | ✅ | ✅ | ✅ | ✅ (disponibilidad) |
| Usuarios (todos los roles) | ✅ | ✅ | ✅ | — (desactivar, no borrar) |
| Clientes (perfil, historial, fichas de salud, bloqueo) | ✅ | ✅ (fichas) | ✅ | — |
| Servicios y categorías | ✅ | ✅ | ✅ | — |
| Descuentos y retos | ✅ | ✅ | ❌ *(hoy sin PATCH/DELETE — ver `docs/FASES.md`)* | ❌ |
| **(planeado)** Niveles de fidelización | ✅ | ✅ | ✅ | ✅ |
| **(planeado)** Catálogo exclusivo (productos) | ✅ | ✅ | ✅ | ✅ |
| **(planeado)** Pedidos del catálogo | ✅ | — | ✅ (estado manual si hace falta) | — |
| **(planeado)** Catálogo de estilos (IA) | ✅ | ✅ | ✅ | ✅ |
| **(planeado)** Configuración del módulo de IA (límites, activar/desactivar) | ✅ | — | ✅ | — |
| **(planeado)** Métricas de uso de IA (no fotos) | ✅ | — | — | — |

## Cliente

Autoservicio total sobre sus propios datos, sin visibilidad sobre otras clientas ni sobre la
operación interna del salón.

| Módulo | Ver | Crear | Editar | Eliminar |
|---|---|---|---|---|
| Sus propias citas | ✅ | ✅ | ✅ (cancelar) | — |
| Su perfil | ✅ | — | ✅ | — |
| Contraseña (si aplica — staff) | — | — | ✅ | — |
| Sus retos y descuentos disponibles | ✅ | — | — | — |
| Canjear un descuento | — | ✅ | — | — |
| **(planeado)** Sus consultas de IA | ✅ (propias) | ✅ | — | — |
| **(planeado)** Enviar selección de estilo a su especialista | — | ✅ | — | — |
| **(planeado)** Favoritos de estilos (sin pasar por la cámara) | ✅ | ✅ | — | ✅ |
| **(planeado)** Catálogo exclusivo | ✅ (según nivel; superiores bloqueados con teaser) | ✅ (pedido) | — | — |
| **(planeado)** Su nivel de fidelización y progreso | ✅ | — | — | — |
| Datos de otras clientas, agenda ajena, pagos, gestión | ❌ | ❌ | ❌ | ❌ |

## Endpoints públicos (sin autenticación)

`POST /auth/solicitar-acceso`, `GET /auth/verificar`, `POST /auth/login`, `GET /servicios`
(catálogo), `GET /servicios/categorias`, `GET /servicios/{id}/disponibilidad`, `GET /health`.

**(planeado)** `POST /webhooks/culqi` (ver `docs/MODULO_FIDELIZACION_AVANZADA.md`) también será
público en el sentido de no requerir JWT — pero no es "sin autenticación": se valida por la
firma que envía Culqi en la cabecera del webhook, nunca por sesión de usuario.

## Notas de implementación (para no perder de vista al tocar código)

- Varios endpoints de autoservicio de cliente (`/citas`, `/auth/perfil`, `/fidelizacion/mis-*`)
  usan `obtener_usuario_actual` sin `requerir_rol("cliente")` explícito — técnicamente
  cualquier rol autenticado puede llamarlos, pero el service busca un documento `Cliente` por
  `usuario_id` y falla si no existe (admin/trabajador normalmente no tienen uno). Es un
  autolímite de datos, no un control de rol — suficiente hoy, pero a tener en cuenta si algún
  admin/trabajador llegara a tener también un perfil de cliente.
- **Observación de seguridad pendiente de revisión** (no corregida en esta ronda de
  documentación, ver `docs/FASES.md`): `POST /auth/registrar` (crea usuarios `admin` o
  `trabajador`) no tiene ninguna dependencia de rol/autenticación visible en el router — el
  service sí restringe el `rol` del body a `admin`/`trabajador`, pero cualquiera sin sesión
  podría invocarlo. Debe revisarse antes de exponer el backend fuera de un entorno controlado.
- **Brecha de permisos identificada en la revisión de casos de uso** (`CUS12`/`CUS14` en
  `docs/CASOS_DE_USO.md`): la fila "Ficha de salud crítica (alerta)" de la tabla de Trabajador
  arriba es hoy la **única** vía por la que la especialista se entera de una ficha crítica —
  reactiva, dentro del 422 de `PATCH /citas/{id}/estado`. `GET /clientes/{id}/fichas-salud` y
  `GET /clientes/{id}/historial` (consulta proactiva de alertas e historial) existen pero tienen
  `requerir_rol("admin")` en `backend/app/routers/clientes.py` — el trabajador no puede llamarlos
  todavía. Ampliar a `requerir_rol("admin", "trabajador")` es candidato natural (es información
  de la clienta, no financiera ni de otra especialista), pero no se aplicó en esta ronda —
  documentación solamente, ver `docs/FASES.md`.
