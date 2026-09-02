# Requerimientos Funcionales

Especificación completa de requerimientos funcionales (RF), organizada por módulo del sistema
— formato estándar de especificación de requerimientos de software (ERS): código, nombre,
descripción (entrada → proceso → salida), actor(es), prioridad, caso de uso relacionado y regla
de negocio asociada. **77 requerimientos funcionales en total**: 59 implementados, 18 planeados
(ver el resumen cuantitativo al final del documento).

Cada módulo trae su propio diagrama de casos de uso (notación UML formal — actor como
rectángulo `«actor»`, requerimiento como elipse) para que ningún RF quede sin representación
gráfica, tal como exige una especificación profesional completa.

Prioridad: **Alta** (crítico para la operación diaria), **Media** (valor claro, no bloqueante),
**Baja** (mejora incremental). Los RF planeados se marcan `«planeado»` y remiten a
`docs/MODULO_ASESORIA_IA.md` / `docs/MODULO_FIDELIZACION_AVANZADA.md`.

---

## Módulo 1 — Autenticación

```mermaid
flowchart LR
    Cliente["«actor»<br/>Cliente"]
    Staff["«actor»<br/>Trabajador / Administrador"]

    subgraph M1["Módulo: Autenticación"]
        RF001(["RF-001<br/>Solicitar acceso<br/>por magic link"])
        RF002(["RF-002<br/>Verificar magic link"])
        RF003(["RF-003<br/>Registrar personal"])
        RF004(["RF-004<br/>Iniciar sesión staff"])
        RF005(["RF-005<br/>Consultar perfil propio"])
        RF006(["RF-006<br/>Actualizar perfil propio"])
        RF007(["RF-007<br/>Cambiar contraseña"])
    end

    Cliente --- RF001
    Cliente --- RF002
    Cliente --- RF005
    Cliente --- RF006
    Staff --- RF003
    Staff --- RF004
    Staff --- RF005
    Staff --- RF006
    Staff --- RF007

    classDef actor fill:#fff,stroke:#333,stroke-width:1px
    class Cliente,Staff actor
```

| Código | Nombre | Descripción | Actor(es) | Prioridad | CU | RN |
|---|---|---|---|---|---|---|
| RF-001 | Solicitar acceso por magic link | Entrada: teléfono. Proceso: busca o crea `Usuario`+`Cliente`, genera `MagicLink` (TTL 1h), envía enlace por WhatsApp si `acepta_whatsapp=true`. Salida: confirmación de envío. | Cliente | Alta | — | — |
| RF-002 | Verificar magic link | Entrada: token UUID. Proceso: valida no usado/no expirado, `UPDATE` atómico `usado=true`, emite JWT. Salida: `access_token`, rol, nombre. | Cliente | Alta | — | — |
| RF-003 | Registrar personal (staff) | Entrada: nombre, correo, contraseña, rol (`admin`\|`trabajador`). Proceso: valida correo único, hashea contraseña, crea `Usuario`. Salida: JWT. | Admin/Trabajador (auto-registro) | Media | — | — |
| RF-004 | Iniciar sesión staff | Entrada: correo, contraseña. Proceso: valida credenciales y `esta_activo`. Salida: JWT. | Trabajador, Admin | Alta | — | — |
| RF-005 | Consultar perfil propio | Entrada: JWT. Salida: datos del `Usuario` autenticado. | Cliente, Trabajador, Admin | Media | — | — |
| RF-006 | Actualizar perfil propio | Entrada: nombre/correo/teléfono (parciales). Proceso: valida unicidad de correo/teléfono. Salida: perfil actualizado. | Cliente, Trabajador, Admin | Media | — | — |
| RF-007 | Cambiar contraseña | Entrada: contraseña actual + nueva (≥8 caracteres). Proceso: valida actual, hashea nueva. Salida: confirmación. | Trabajador, Admin | Baja | — | — |

---

## Módulo 2 — Gestión de Servicios y Categorías

```mermaid
flowchart LR
    Publico["«actor»<br/>Visitante / Cualquier rol"]
    Admin["«actor»<br/>Administrador"]

    subgraph M2["Módulo: Servicios"]
        RF008(["RF-008<br/>Listar servicios"])
        RF009(["RF-009<br/>Listar categorías"])
        RF010(["RF-010<br/>Consultar disponibilidad<br/>de un servicio"])
        RF011(["RF-011<br/>Crear categoría"])
        RF012(["RF-012<br/>Editar categoría"])
        RF013(["RF-013<br/>Crear servicio"])
        RF014(["RF-014<br/>Editar servicio"])
    end

    Publico --- RF008
    Publico --- RF009
    Publico --- RF010
    Admin --- RF011
    Admin --- RF012
    Admin --- RF013
    Admin --- RF014

    classDef actor fill:#fff,stroke:#333,stroke-width:1px
    class Publico,Admin actor
```

| Código | Nombre | Descripción | Actor(es) | Prioridad | CU | RN |
|---|---|---|---|---|---|---|
| RF-008 | Listar servicios | Salida: catálogo de `Servicio` activos, sin autenticación. | Público | Alta | CU-C01 | — |
| RF-009 | Listar categorías | Salida: `Categoria` ordenadas por `orden_visualizacion`. | Público | Media | CU-C01 | — |
| RF-010 | Consultar disponibilidad de un servicio | Entrada: `servicio_id`. Salida: horarios libres considerando duración, buffer y citas existentes. | Público | Alta | CU-C01 | RN13 |
| RF-011 | Crear categoría | Entrada: nombre, ícono, color, orden. Salida: `Categoria` creada. | Admin | Media | CU-A01 | — |
| RF-012 | Editar categoría | Entrada: campos parciales. Salida: `Categoria` actualizada. | Admin | Baja | CU-A01 | — |
| RF-013 | Crear servicio | Entrada: nombre, duración, precio, depósito, `requiere_ficha_salud`, `horas_cancelacion_sin_penalidad`. Salida: `Servicio` creado. | Admin | Alta | CU-A01 | RN01, RN02, RN08 |
| RF-014 | Editar servicio | Entrada: campos parciales. Salida: `Servicio` actualizado. | Admin | Media | CU-A01 | — |

---

## Módulo 3 — Gestión de Citas

```mermaid
flowchart LR
    Cliente["«actor»<br/>Cliente"]
    Staff["«actor»<br/>Trabajador / Administrador"]
    Beat["«actor»<br/>Programador de Tareas"]

    subgraph M3["Módulo: Citas"]
        RF015(["RF-015<br/>Crear cita"])
        RF016(["RF-016<br/>Listar mis citas"])
        RF017(["RF-017<br/>Cancelar cita"])
        RF018(["RF-018<br/>Cambiar estado de cita"])
        RF019(["RF-019<br/>Registrar llegada"])
        RF020(["RF-020<br/>Consultar servicios<br/>de una cita"])
        RF021(["RF-021<br/>Listar todas las citas"])
        RF022(["RF-022<br/>Crear cita para un cliente"])
        RF023(["RF-023<br/>Consultar pagos<br/>de una cita"])
        RF024(["RF-024<br/>Verificar no-show<br/>automático"])
    end

    Cliente --- RF015
    Cliente --- RF016
    Cliente --- RF017
    Staff --- RF018
    Staff --- RF019
    Staff --- RF020
    Staff --- RF021
    Staff --- RF022
    Staff --- RF023
    Beat --- RF024

    RF017 -. "«includes»" .-> RF015
    RF024 -. "«extends»" .-> RF018

    classDef actor fill:#fff,stroke:#333,stroke-width:1px
    class Cliente,Staff,Beat actor
```

| Código | Nombre | Descripción | Actor(es) | Prioridad | CU | RN |
|---|---|---|---|---|---|---|
| RF-015 | Crear cita | Entrada: servicios, especialista, horario, notas. Proceso: valida bloqueo, ficha de salud, solapamiento. Salida: `Cita` en `pendiente`. | Cliente | Alta | CU-C01 | RN08, RN11, RN13 |
| RF-016 | Listar mis citas | Salida: citas del cliente autenticado, ordenadas por fecha descendente. | Cliente | Alta | CU-C01 | — |
| RF-017 | Cancelar cita | Entrada: motivo opcional. Proceso: calcula horas restantes vs. umbral del servicio. Salida: `cancelada` o `cancelada_tardia`. | Cliente | Alta | CU-C02, CU-C03 | RN01, RN02 |
| RF-018 | Cambiar estado de cita | Entrada: nuevo estado, `confirmar_ficha_critica` opcional. Proceso: valida transición y ficha crítica. Salida: `Cita` actualizada. | Trabajador, Admin | Alta | CU-T02, CU-T03 | RN09, RN15 |
| RF-019 | Registrar llegada | Entrada: hora de llegada. Salida: `hora_llegada_real` registrada, sin cambiar estado. | Trabajador, Admin | Media | CU-T02 | — |
| RF-020 | Consultar servicios de una cita | Salida: lista de `CitaServicio` con precio y duración congelados al momento de la reserva. | Trabajador, Admin | Baja | — | — |
| RF-021 | Listar todas las citas | Entrada: filtros opcionales (fecha, estado). Salida: citas enriquecidas con nombres de cliente/especialista/servicio. | Admin | Alta | CU-A06 | — |
| RF-022 | Crear cita para un cliente | Igual que RF-015 pero iniciado por el admin en nombre de un cliente, sin restricción de anticipación mínima. | Admin | Media | CU-A01 | RN13 |
| RF-023 | Consultar pagos de una cita | Salida: historial de `Pago` asociados a la cita. | Admin | Media | CU-A02 | — |
| RF-024 | Verificar no-show automático | Proceso batch (cada 5 min): marca `no_show` las citas `confirmada` con 15+ min de retraso sin llegada registrada. | Sistema (Celery Beat) | Alta | — | RN05 |

---

## Módulo 4 — Gestión de Pagos

```mermaid
flowchart LR
    Admin["«actor»<br/>Administrador"]

    subgraph M4["Módulo: Pagos"]
        RF025(["RF-025<br/>Registrar pago"])
        RF026(["RF-026<br/>Listar pagos pendientes"])
        RF027(["RF-027<br/>Confirmar pago"])
        RF028(["RF-028<br/>Rechazar pago"])
        RF029(["RF-029<br/>Reembolsar pago"])
    end

    Admin --- RF025
    Admin --- RF026
    Admin --- RF027
    Admin --- RF028
    Admin --- RF029

    RF027 -. "«includes»" .-> RF026

    classDef actor fill:#fff,stroke:#333,stroke-width:1px
    class Admin actor
```

| Código | Nombre | Descripción | Actor(es) | Prioridad | CU | RN |
|---|---|---|---|---|---|---|
| RF-025 | Registrar pago | Entrada: cita, tipo, método, monto. Salida: `Pago` en `pendiente`. | Admin | Alta | CU-A02 | — |
| RF-026 | Listar pagos pendientes | Salida: `Pago` con `estado=pendiente`, para conciliación diaria. | Admin | Alta | CU-A06 | — |
| RF-027 | Confirmar pago | Proceso: registra `confirmado_por` y `fecha_confirmacion`. Salida: `Pago.estado=confirmado`. | Admin | Alta | CU-A02 | — |
| RF-028 | Rechazar pago | Salida: `Pago.estado=rechazado`. | Admin | Media | CU-A02 | — |
| RF-029 | Reembolsar pago | Salida: `Pago.estado=reembolsado` (proceso manual, sin integración automática). | Admin | Media | CU-A02 | RN01 |

---

## Módulo 5 — Gestión de Personal

```mermaid
flowchart LR
    Admin["«actor»<br/>Administrador"]
    Trabajador["«actor»<br/>Trabajador"]

    subgraph M5["Módulo: Personal"]
        RF030(["RF-030<br/>Listar personal"])
        RF031(["RF-031<br/>Crear personal"])
        RF032(["RF-032<br/>Editar personal"])
        RF033(["RF-033<br/>Consultar disponibilidad<br/>de un personal"])
        RF034(["RF-034<br/>Registrar disponibilidad"])
        RF035(["RF-035<br/>Eliminar franja<br/>de disponibilidad"])
        RF036(["RF-036<br/>Consultar agenda propia"])
    end

    Admin --- RF030
    Admin --- RF031
    Admin --- RF032
    Admin --- RF033
    Admin --- RF034
    Admin --- RF035
    Trabajador --- RF036

    RF031 -. "«includes»" .-> RF034

    classDef actor fill:#fff,stroke:#333,stroke-width:1px
    class Admin,Trabajador actor
```

| Código | Nombre | Descripción | Actor(es) | Prioridad | CU | RN |
|---|---|---|---|---|---|---|
| RF-030 | Listar personal | Salida: especialistas con especialidad, comisión, estado. | Admin | Media | CU-A01 | — |
| RF-031 | Crear personal | Entrada: `usuario_id` (creado previamente como `Usuario` rol `trabajador`), especialidad, comisión, tipo de contrato. Salida: `Personal` creado. | Admin | Alta | CU-A01 | — |
| RF-032 | Editar personal | Entrada: campos parciales. Salida: `Personal` actualizado. | Admin | Media | CU-A01 | — |
| RF-033 | Consultar disponibilidad de un personal | Salida: franjas semanales (`DisponibilidadPersonal`). | Admin | Media | CU-A01 | RN13 |
| RF-034 | Registrar disponibilidad | Entrada: día, hora inicio/fin, buffer. Salida: franja creada. | Admin | Alta | CU-A01 | RN13 |
| RF-035 | Eliminar franja de disponibilidad | Salida: franja eliminada/desactivada. | Admin | Baja | CU-A01 | — |
| RF-036 | Consultar agenda propia | Salida: citas del día de la especialista autenticada, sin datos financieros ni de otras especialistas. | Trabajador | Alta | CU-T01 | — |

---

## Módulo 6 — Gestión de Clientes

```mermaid
flowchart LR
    Admin["«actor»<br/>Administrador"]

    subgraph M6["Módulo: Clientes"]
        RF037(["RF-037<br/>Listar clientes"])
        RF038(["RF-038<br/>Consultar cliente"])
        RF039(["RF-039<br/>Editar cliente"])
        RF040(["RF-040<br/>Consultar historial<br/>de citas"])
        RF041(["RF-041<br/>Listar fichas de salud"])
        RF042(["RF-042<br/>Registrar ficha de salud"])
        RF043(["RF-043<br/>Bloquear cliente"])
        RF044(["RF-044<br/>Desbloquear cliente"])
    end

    Admin --- RF037
    Admin --- RF038
    Admin --- RF039
    Admin --- RF040
    Admin --- RF041
    Admin --- RF042
    Admin --- RF043
    Admin --- RF044

    classDef actor fill:#fff,stroke:#333,stroke-width:1px
    class Admin actor
```

| Código | Nombre | Descripción | Actor(es) | Prioridad | CU | RN |
|---|---|---|---|---|---|---|
| RF-037 | Listar clientes | Salida: clientes con etiquetas, estado de bloqueo. | Admin | Media | CU-A01 | — |
| RF-038 | Consultar cliente | Salida: perfil completo de un `Cliente`. | Admin | Media | — | — |
| RF-039 | Editar cliente | Entrada: etiquetas, notas internas (nunca `correo`/`password`, rechazados explícitamente). Salida: `Cliente` actualizado. | Admin | Media | — | — |
| RF-040 | Consultar historial de citas | Salida: lista de `Cita` pasadas del cliente. | Admin | Media | — | — |
| RF-041 | Listar fichas de salud | Salida: `FichaSalud` del cliente, con severidad. | Admin | Alta | CU-T03 | RN08, RN09 |
| RF-042 | Registrar ficha de salud | Entrada: tipo de restricción, descripción, severidad. Salida: `FichaSalud` creada. | Admin | Alta | CU-T03 | RN08, RN09 |
| RF-043 | Bloquear cliente | Entrada: motivo. Salida: `esta_bloqueada=true`, `fecha_bloqueo` registrada. | Admin | Media | — | RN11 |
| RF-044 | Desbloquear cliente | Salida: `esta_bloqueada=false`. | Admin | Baja | — | RN11 |

---

## Módulo 7 — Administración de Usuarios

```mermaid
flowchart LR
    Admin["«actor»<br/>Administrador"]

    subgraph M7["Módulo: Usuarios"]
        RF045(["RF-045<br/>Crear usuario"])
        RF046(["RF-046<br/>Listar usuarios"])
        RF047(["RF-047<br/>Consultar usuario"])
        RF048(["RF-048<br/>Editar usuario"])
        RF049(["RF-049<br/>Cambiar correo"])
        RF050(["RF-050<br/>Resetear contraseña"])
        RF051(["RF-051<br/>Cambiar estado<br/>(activar/desactivar)"])
    end

    Admin --- RF045
    Admin --- RF046
    Admin --- RF047
    Admin --- RF048
    Admin --- RF049
    Admin --- RF050
    Admin --- RF051

    classDef actor fill:#fff,stroke:#333,stroke-width:1px
    class Admin actor
```

| Código | Nombre | Descripción | Actor(es) | Prioridad | CU | RN |
|---|---|---|---|---|---|---|
| RF-045 | Crear usuario | Entrada: nombre, rol, correo/teléfono según rol. Proceso: si `rol=cliente`, crea también el `Cliente` vinculado automáticamente. Salida: `Usuario` creado. | Admin | Alta | CU-A01 | — |
| RF-046 | Listar usuarios | Entrada: filtros `rol`, `esta_activo`. Salida: lista de usuarios. | Admin | Media | — | — |
| RF-047 | Consultar usuario | Salida: detalle de un `Usuario`. | Admin | Baja | — | — |
| RF-048 | Editar usuario | Entrada: nombre, teléfono, `esta_activo`. Salida: `Usuario` actualizado. | Admin | Media | — | — |
| RF-049 | Cambiar correo | Entrada: nuevo correo. Proceso: resetea `correo_verificado=false`. Salida: correo actualizado. | Admin | Baja | — | — |
| RF-050 | Resetear contraseña | Entrada: nueva contraseña. Salida: 204 (sin contenido). | Admin | Media | — | — |
| RF-051 | Cambiar estado de usuario | Salida: `esta_activo` alternado. | Admin | Media | — | — |

---

## Módulo 8 — Fidelización (implementado)

```mermaid
flowchart LR
    Cliente["«actor»<br/>Cliente"]
    Admin["«actor»<br/>Administrador"]
    Sistema["«actor»<br/>Sistema (automático)"]

    subgraph M8["Módulo: Fidelización"]
        RF052(["RF-052<br/>Consultar mis retos"])
        RF053(["RF-053<br/>Consultar mis<br/>descuentos disponibles"])
        RF054(["RF-054<br/>Aplicar descuento"])
        RF055(["RF-055<br/>Listar descuentos"])
        RF056(["RF-056<br/>Crear descuento"])
        RF057(["RF-057<br/>Listar retos"])
        RF058(["RF-058<br/>Crear reto"])
        RF059(["RF-059<br/>Verificar retos<br/>completados"])
    end

    Cliente --- RF052
    Cliente --- RF053
    Cliente --- RF054
    Admin --- RF055
    Admin --- RF056
    Admin --- RF057
    Admin --- RF058
    Sistema --- RF059

    RF059 -. "«extends»" .-> RF054

    classDef actor fill:#fff,stroke:#333,stroke-width:1px
    class Cliente,Admin,Sistema actor
```

| Código | Nombre | Descripción | Actor(es) | Prioridad | CU | RN |
|---|---|---|---|---|---|---|
| RF-052 | Consultar mis retos | Salida: progreso de cada `Reto` activo (visitas completadas / requeridas). | Cliente | Media | CU-C05 | RN15 |
| RF-053 | Consultar mis descuentos disponibles | Salida: `Descuento` vigentes que el cliente aún puede canjear. | Cliente | Media | CU-C04 | RN14 |
| RF-054 | Aplicar descuento | Entrada: código, cita. Proceso: bloqueo optimista, valida vigencia y límites de uso. Salida: `DescuentoUso` registrado. | Cliente | Alta | CU-C04 | RN14 |
| RF-055 | Listar descuentos | Salida: todos los `Descuento` (admin). | Admin | Baja | CU-A03 | — |
| RF-056 | Crear descuento | Entrada: tipo, scope, código, valor, límites, vigencia. Salida: `Descuento` creado. | Admin | Media | CU-A03 | — |
| RF-057 | Listar retos | Salida: todos los `Reto` (admin). | Admin | Baja | CU-A03 | — |
| RF-058 | Crear reto | Entrada: visitas requeridas, ventana de días, recompensa. Salida: `Reto` creado. | Admin | Media | CU-A03 | — |
| RF-059 | Verificar retos completados | Proceso automático al completar una cita: evalúa todos los retos activos, genera descuento premio idempotente. | Sistema (interno) | Alta | CU-C05 | RN15 |

---

## Módulo 9 — Asesoría de Belleza con IA «planeado»

```mermaid
flowchart LR
    Cliente["«actor»<br/>Cliente"]
    Trabajador["«actor»<br/>Trabajador"]
    Admin["«actor»<br/>Administrador"]
    Gemini["«actor»<br/>Motor de IA (Gemini)"]

    subgraph M9["Módulo: Asesoría IA «planeado»"]
        RF060(["RF-060<br/>Analizar imagen y<br/>sugerir estilos"])
        RF061(["RF-061<br/>Consultar catálogo<br/>de estilos"])
        RF062(["RF-062<br/>Enviar selección<br/>a especialista"])
        RF063(["RF-063<br/>Consultar historial<br/>de estilos de un cliente"])
        RF064(["RF-064<br/>Registrar feedback<br/>de estilo"])
        RF065(["RF-065<br/>Marcar estilo<br/>como favorito"])
        RF066(["RF-066<br/>Gestionar catálogo<br/>de estilos"])
        RF067(["RF-067<br/>Configurar módulo de IA"])
        RF068(["RF-068<br/>Consultar métricas<br/>de uso de IA"])
    end

    Cliente --- RF060
    Trabajador --- RF060
    Cliente --- RF061
    Cliente --- RF062
    Trabajador --- RF062
    Trabajador --- RF063
    Trabajador --- RF064
    Cliente --- RF065
    Admin --- RF066
    Admin --- RF067
    Admin --- RF068
    RF060 --> Gemini

    RF062 -. "«includes»" .-> RF060
    RF065 -. "«extends»" .-> RF061

    classDef actor fill:#fff,stroke:#333,stroke-width:1px
    classDef planeado stroke-dasharray: 5 5
    class Cliente,Trabajador,Admin,Gemini actor
    class RF060,RF061,RF062,RF063,RF064,RF065,RF066,RF067,RF068 planeado
```

| Código | Nombre | Descripción | Actor(es) | Prioridad | CU | RN |
|---|---|---|---|---|---|---|
| RF-060 | Analizar imagen y sugerir estilos | Entrada: foto capturada (efímera). Proceso: envío a Gemini + catálogo, descarte inmediato de la foto. Salida: ranking de `EstiloCatalogo`, nunca la imagen. | Cliente, Trabajador | Alta | CU-C06, CU-T04 | RN16, RN17, RN18 |
| RF-061 | Consultar catálogo de estilos | Salida: `EstiloCatalogo` activos con atributos. | Cualquier rol autenticado | Media | CU-C06 | — |
| RF-062 | Enviar selección a especialista | Entrada: estilo elegido. Proceso: liga a la próxima `Cita` no terminal. Salida: `SeleccionEstilo` creada. | Cliente, Trabajador | Alta | CU-C06, CU-T04 | RN19 |
| RF-063 | Consultar historial de estilos de un cliente | Salida: `SeleccionEstilo` previas de ese cliente, sin reanálisis. | Trabajador, Admin | Media | CU-T05 | RN19 |
| RF-064 | Registrar feedback de estilo | Entrada: coincidió sí/no + nota. Salida: `SeleccionEstilo.feedback_coincidio` actualizado. | Trabajador | Baja | CU-T06 | — |
| RF-065 | Marcar estilo como favorito | Entrada: estilo elegido sin cámara. Salida: `SeleccionEstilo` con `origen=favorito`. | Cliente | Baja | CU-C08 | — |
| RF-066 | Gestionar catálogo de estilos | CRUD completo de `EstiloCatalogo` (alta, edición, baja lógica). | Admin | Media | CU-A05 | RN16–RN19 |
| RF-067 | Configurar módulo de IA | Entrada: activar/desactivar, límite diario de consultas. Salida: configuración persistida. | Admin | Media | — | RN18 |
| RF-068 | Consultar métricas de uso de IA | Salida: consultas totales, estilos más elegidos, % de feedback positivo — nunca fotos. | Admin | Baja | CU-A08 | — |

---

## Módulo 10 — Fidelización Avanzada «planeado»

```mermaid
flowchart LR
    Cliente["«actor»<br/>Cliente"]
    Admin["«actor»<br/>Administrador"]
    Culqi["«actor»<br/>Pasarela de Pago (Culqi)"]
    Beat["«actor»<br/>Programador de Tareas"]

    subgraph M10["Módulo: Fidelización Avanzada «planeado»"]
        RF069(["RF-069<br/>Consultar niveles<br/>de fidelización"])
        RF070(["RF-070<br/>Gestionar niveles<br/>de fidelización"])
        RF071(["RF-071<br/>Consultar mi nivel<br/>y progreso"])
        RF072(["RF-072<br/>Consultar catálogo<br/>exclusivo"])
        RF073(["RF-073<br/>Gestionar catálogo<br/>exclusivo"])
        RF074(["RF-074<br/>Comprar producto<br/>del catálogo"])
        RF075(["RF-075<br/>Confirmar pago<br/>vía webhook"])
        RF076(["RF-076<br/>Gestionar pedidos<br/>del catálogo"])
        RF077(["RF-077<br/>Recalcular niveles<br/>de fidelización"])
    end

    Cliente --- RF069
    Admin --- RF070
    Cliente --- RF071
    Cliente --- RF072
    Admin --- RF073
    Cliente --- RF074
    RF074 --> Culqi
    Culqi --> RF075
    Admin --- RF076
    Beat --- RF077

    RF074 -. "«includes»" .-> RF072
    RF077 -. "«extends»" .-> RF071

    classDef actor fill:#fff,stroke:#333,stroke-width:1px
    classDef planeado stroke-dasharray: 5 5
    class Cliente,Admin,Culqi,Beat actor
    class RF069,RF070,RF071,RF072,RF073,RF074,RF075,RF076,RF077 planeado
```

| Código | Nombre | Descripción | Actor(es) | Prioridad | CU | RN |
|---|---|---|---|---|---|---|
| RF-069 | Consultar niveles de fidelización | Salida: `NivelFidelizacion` activos con sus beneficios visibles. | Cualquier rol autenticado | Media | — | — |
| RF-070 | Gestionar niveles de fidelización | CRUD completo: nombre, orden, tipo/valor de umbral, beneficios. | Admin | Alta | CU-A04 | RN20 |
| RF-071 | Consultar mi nivel y progreso | Salida: nivel actual del cliente + qué falta para el siguiente. | Cliente | Media | — | RN20 |
| RF-072 | Consultar catálogo exclusivo | Salida: `ProductoCatalogoExclusivo`, con los de nivel superior marcados `bloqueado`. | Cliente | Media | CU-C07 | RN22 |
| RF-073 | Gestionar catálogo exclusivo | CRUD completo de productos (nombre, precio, imagen, nivel mínimo, stock). | Admin | Alta | CU-A04 | — |
| RF-074 | Comprar producto del catálogo | Entrada: producto elegido. Proceso: valida nivel, crea `PedidoCatalogo` pendiente, inicia checkout Culqi. Salida: token de pago. | Cliente | Alta | CU-C07 | RN22 |
| RF-075 | Confirmar pago vía webhook | Entrada: evento firmado de Culqi. Proceso: verifica firma, actualiza estado de forma idempotente. Salida: `PedidoCatalogo` en `pagado`/`cancelado`. | Sistema (Culqi) | Alta | CU-C07 | RN23, RN24 |
| RF-076 | Gestionar pedidos del catálogo | Entrada: filtros estado/cliente/producto. Proceso: marcar `entregado`. Salida: pedidos actualizados. | Admin | Media | CU-A07 | RN23 |
| RF-077 | Recalcular niveles de fidelización | Proceso batch periódico: recalcula el nivel de cada cliente contra los umbrales activos. | Sistema (Celery Beat) | Alta | — | RN20, RN21 |

---

## Resumen cuantitativo

| Módulo | RF implementados | RF planeados | Total |
|---|---|---|---|
| 1. Autenticación | 7 | 0 | 7 |
| 2. Servicios y Categorías | 7 | 0 | 7 |
| 3. Citas | 10 | 0 | 10 |
| 4. Pagos | 5 | 0 | 5 |
| 5. Personal | 7 | 0 | 7 |
| 6. Clientes | 8 | 0 | 8 |
| 7. Usuarios | 7 | 0 | 7 |
| 8. Fidelización | 8 | 0 | 8 |
| 9. Asesoría IA | 0 | 9 | 9 |
| 10. Fidelización Avanzada | 0 | 9 | 9 |
| **Total** | **59** | **18** | **77** |
