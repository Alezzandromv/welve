# Diagramas de Estado

## Ciclo de vida de `Cita`

Reflejo exacto de `_TRANSICIONES_VALIDAS` en `backend/app/services/citas_service.py:20` —
cualquier cambio a este diagrama debe reflejarse primero en ese diccionario, es la única fuente
de verdad en código.

```mermaid
stateDiagram-v2
    [*] --> pendiente : crear (CU-C01)

    pendiente --> confirmada : admin/trabajador confirma
    pendiente --> cancelada : cliente cancela a tiempo (RN01)

    confirmada --> en_curso : trabajador inicia servicio (RN09)
    confirmada --> cancelada : cliente cancela a tiempo (RN01)
    confirmada --> cancelada_tardia : cliente cancela tarde (RN02)
    confirmada --> no_show : automático tras 15min (RN05) o manual (RN03)

    en_curso --> completada : trabajador termina el servicio (RN15)
    en_curso --> no_show : marcado manualmente

    completada --> [*]
    cancelada --> [*]
    cancelada_tardia --> [*]
    no_show --> [*]

    note right of pendiente
        Nota: las citas en 'pendiente' NO son
        candidatas al no-show automático de RN05 —
        solo 'confirmada' lo es.
    end note

    note right of completada
        Al entrar aquí se dispara
        verificar_retos_completados() (RN15/CU-C05).
    end note
```

Estados terminales (`completada`, `cancelada`, `cancelada_tardia`, `no_show`): ninguno tiene
transición de salida — una vez ahí, la cita es inmutable en cuanto a estado (`_ESTADOS_
BLOQUEADOS` en el código, usado también para excluir estas citas del cálculo de solapamiento de
RN13).

## Ciclo de vida de `PedidoCatalogo` *(planeado)*

```mermaid
stateDiagram-v2
    [*] --> pendiente : cliente inicia checkout (CU-C14)

    pendiente --> pagado : webhook Culqi confirma (RN23, idempotente)
    pendiente --> cancelado : webhook Culqi rechaza (RN24)

    pagado --> entregado : admin marca entrega física (CU-A15)

    entregado --> [*]
    cancelado --> [*]

    note right of pendiente
        El UPDATE a 'pagado'/'cancelado' debe ser
        idempotente: Culqi puede reintentar el
        mismo webhook más de una vez.
    end note

    note right of pagado
        No se puede pasar a 'entregado' un pedido
        que no esté en 'pagado' (RN23) — 422 si se
        intenta.
    end note
```

## Nivel de fidelización de un cliente *(planeado, ilustrativo)*

Los niveles no son fijos en el diseño — el admin los configura (nombre, orden, umbral, ver
`docs/MODULO_FIDELIZACION_AVANZADA.md`). Este diagrama ilustra la dinámica con un ejemplo de
tres niveles (Bronce/Plata/Oro); en producción puede haber cualquier cantidad configurada.

```mermaid
stateDiagram-v2
    [*] --> SinNivel : cliente nuevo

    SinNivel --> Bronce : cumple umbral de Bronce (RN20)
    Bronce --> Plata : cumple umbral de Plata (RN20)
    Plata --> Oro : cumple umbral de Oro (RN20)

    Oro --> Plata : recálculo — ya no cumple Oro (RN21)
    Plata --> Bronce : recálculo — ya no cumple Plata (RN21)
    Bronce --> SinNivel : recálculo — ya no cumple Bronce (RN21)

    Oro --> SinNivel : recálculo — cae directo (umbral por ventana de tiempo)

    note right of Oro
        RN21: un downgrade nunca revoca
        pedidos ya hechos mientras el
        cliente tenía el nivel superior.
    end note
```
