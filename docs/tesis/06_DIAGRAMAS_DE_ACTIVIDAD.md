# Diagramas de Actividad

Mermaid no soporta carriles (swimlanes) nativos en `flowchart`; se aproximan con `subgraph` por
actor/componente cuando aporta claridad, y con nodos de decisión (`{...}`) para las reglas de
negocio. Cada diagrama corresponde a uno o más casos de uso de `02_CASOS_DE_USO_UML.md`.

## Reservar una cita (CUS03)

```mermaid
flowchart TD
    Start([Cliente inicia reserva]) --> A[Elegir uno o más servicios]
    A --> B{¿Cliente bloqueada?}
    B -->|Sí, esta_bloqueada=true| RejBloq[Rechazar con mensaje genérico]:::reject
    RejBloq --> End1([Fin — RT02])
    B -->|No| C[Elegir especialista y horario]
    C --> D{"¿Algún servicio<br/>requiere_ficha_salud?"}
    D -->|Sí| E{"¿Existe FichaSalud<br/>activa del cliente?"}
    E -->|No| RejFicha[422: registrar ficha con administración]:::reject
    RejFicha --> End2([Fin — RN07])
    E -->|Sí| F
    D -->|No| F{"¿Horario solapa con otra<br/>cita + buffer de la especialista?"}
    F -->|Sí| RejSolape[409: horario no disponible]:::reject
    RejSolape --> End3([Fin — RT03])
    F -->|No| G[Crear Cita en estado 'pendiente']
    G --> H[Crear CitaServicio por cada servicio]
    H --> End4([Fin — reserva confirmada])

    classDef reject fill:#f8d7da,stroke:#dc3545
```

## Cancelar una cita (CUS08)

```mermaid
flowchart TD
    Start([Cliente solicita cancelar]) --> A{"¿Estado actual en<br/>{pendiente, confirmada}?"}
    A -->|No| Rej[422: no cancelable en este estado]:::reject
    Rej --> End1([Fin])
    A -->|Sí| B["Calcular horas_umbral =<br/>MAX(servicio.horas_cancelacion_sin_penalidad)<br/>de todos los servicios de la cita"]
    B --> C["Calcular horas_restantes =<br/>cita.programada_en - ahora()"]
    C --> D{"¿horas_restantes ≥<br/>horas_umbral?"}
    D -->|Sí| E["estado = cancelada<br/>penalizacion_aplicada = false"]:::ok
    E --> End2([Fin — RN01, reembolso completo])
    D -->|No| F["estado = cancelada_tardia<br/>penalizacion_aplicada = true"]:::warn
    F --> End3([Fin — RN02, pierde depósito])

    classDef reject fill:#f8d7da,stroke:#dc3545
    classDef ok fill:#d4edda,stroke:#28a745
    classDef warn fill:#fff3cd,stroke:#ffc107
```

## No-show automático (RN04 — disparado por Celery Beat)

```mermaid
flowchart TD
    Start(["Celery Beat dispara<br/>verificar_no_show cada 5 min"]) --> A["umbral = ahora() - 15min"]
    A --> B["SELECT citas WHERE<br/>estado='confirmada'<br/>AND programada_en ≤ umbral<br/>AND hora_llegada_real IS NULL"]
    B --> C{"¿Hay filas?"}
    C -->|No| End1([Fin — nada que hacer])
    C -->|Sí| D["UPDATE en un solo statement:<br/>estado='no_show'<br/>penalizacion_aplicada=true"]
    D --> End2([Fin — RN04])
```

## Completar una cita y verificar retos (CUS11 → CUS09)

```mermaid
flowchart TD
    Start([Trabajador marca 'completada']) --> A{"¿Transición permitida por<br/>_TRANSICIONES_VALIDAS?"}
    A -->|No| Rej[422: transición no permitida]:::reject
    Rej --> End1([Fin])
    A -->|Sí| B["Cita.estado = completada"]
    B --> C["Por cada Reto activo y vigente:<br/>contar citas 'completada' del cliente<br/>dentro de dias_ventana"]
    C --> D{"¿visitas ≥<br/>visitas_requeridas?"}
    D -->|No| End2([Fin — sin premio])
    D -->|Sí| E["INSERT Descuento premio<br/>ON CONFLICT DO NOTHING<br/>(código único por cliente+reto)"]
    E --> End3([Fin — RT05, descuento disponible])

    classDef reject fill:#f8d7da,stroke:#dc3545
```

## Consulta de asesoría con IA *(planeado, CUS22/CUS26)*

```mermaid
flowchart TD
    Start([Actor activa la cámara]) --> A{"¿Aceptó el<br/>consentimiento?"}
    A -->|No| End1([Cámara no se activa — RN10])
    A -->|Sí| B{"¿Superó el límite<br/>diario de consultas?"}
    B -->|Sí| RejLim["Mostrar cuándo se resetea"]:::reject
    RejLim --> End2([Fin — RN12])
    B -->|No| C[Capturar foto]
    C --> D["Enviar foto + atributos del<br/>catálogo a Gemini (efímero)"]
    D --> E["Gemini devuelve ranking<br/>de EstiloCatalogo"]
    E --> F["Descartar la foto recibida<br/>(nunca se escribe a disco)"]:::critical
    F --> G["Persistir ConsultaIA<br/>(análisis + sugerencias, sin imagen)"]
    G --> H[Cliente/trabajador elige uno o más estilos]
    H --> I{"¿Existe una Cita futura<br/>en estado no terminal?"}
    I -->|No| J["Guardar selección,<br/>botón 'enviar' deshabilitado"]
    J --> End3([Fin])
    I -->|Sí| K["Crear SeleccionEstilo<br/>ligada a esa Cita"]
    K --> End4([Fin — RN13, visible en agenda de la especialista])

    classDef reject fill:#f8d7da,stroke:#dc3545
    classDef critical fill:#fff3cd,stroke:#ffc107,stroke-width:2px
```

## Compra en el catálogo exclusivo *(planeado, CUS25)*

```mermaid
flowchart TD
    Start([Cliente elige un producto]) --> A{"¿nivel_actual ≥<br/>producto.nivel_minimo?"}
    A -->|No| Rej["403 — incluso si la UI<br/>ya lo ocultaba (RN16)"]:::reject
    Rej --> End1([Fin])
    A -->|Sí| B["Generar token de checkout<br/>con el SDK de Culqi"]
    B --> C["Backend crea cargo en Culqi<br/>y PedidoCatalogo en 'pendiente'"]
    C --> D["Culqi procesa el pago"]
    D --> E{"Webhook de Culqi:<br/>¿pago confirmado?"}
    E -->|Sí| F["UPDATE idempotente:<br/>PedidoCatalogo.estado = pagado"]:::ok
    F --> End2([Fin — RN17])
    E -->|No| G["PedidoCatalogo.estado = cancelado<br/>(sin efecto en el nivel del cliente)"]:::warn
    G --> End3([Fin — RN18])

    classDef reject fill:#f8d7da,stroke:#dc3545
    classDef ok fill:#d4edda,stroke:#28a745
    classDef warn fill:#fff3cd,stroke:#ffc107
```
