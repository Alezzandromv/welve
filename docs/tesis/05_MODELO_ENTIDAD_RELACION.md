# Modelo Entidad-Relación

Nombres de tabla y columnas exactamente como en la migración real de Alembic
(`backend/alembic/versions/b1b681b3a2a7_esquema_inicial.py`) para las 14 tablas implementadas.
Las tablas planeadas usan la misma convención de nombres (`snake_case`, plural) que tendrían al
generarse su propia migración.

## Esquema implementado (14 tablas)

```mermaid
erDiagram
    USUARIOS ||--o| PERSONAL : "es"
    USUARIOS ||--o| CLIENTES : "es"
    USUARIOS ||--o{ MAGIC_LINKS : "solicita"
    PERSONAL ||--o{ DISPONIBILIDAD_PERSONAL : "define"
    PERSONAL ||--o{ CITAS : "atiende"
    CLIENTES ||--o{ FICHAS_SALUD : "tiene"
    CLIENTES ||--o{ CITAS : "reserva"
    CLIENTES ||--o{ PAGOS : "realiza"
    CLIENTES ||--o{ DESCUENTO_USOS : "canjea"
    CATEGORIAS ||--o{ SERVICIOS : "agrupa"
    SERVICIOS ||--o{ CITA_SERVICIOS : "referenciado en"
    CITAS ||--o{ CITA_SERVICIOS : "incluye"
    CITAS ||--o{ PAGOS : "genera"
    CITAS ||--o| DESCUENTO_USOS : "aplicado en"
    DESCUENTOS ||--o{ DESCUENTO_USOS : "canjeado como"
    RETOS ||--o{ DESCUENTO_USOS : "origina (premio)"

    USUARIOS {
        uuid id PK
        varchar telefono UK "único parcial (no null)"
        varchar nombre_completo
        varchar correo UK "único parcial (no null)"
        varchar hashed_password
        boolean correo_verificado
        varchar rol "CHECK: cliente|trabajador|admin"
        boolean esta_activo
        varchar foto_perfil_url
        boolean acepta_whatsapp
        timestamptz ultimo_acceso
        timestamptz fecha_creacion
        timestamptz actualizado_en
    }

    PERSONAL {
        uuid id PK
        uuid usuario_id FK "UNIQUE"
        varchar especialidad
        text biografia
        varchar color_agenda
        numeric comision_porcentaje
        varchar tipo_contrato "CHECK: planilla|honorarios"
        date fecha_ingreso
        boolean esta_activo
    }

    DISPONIBILIDAD_PERSONAL {
        uuid id PK
        uuid personal_id FK
        int dia_semana "0=domingo..6=sábado"
        time hora_inicio
        time hora_fin
        int minutos_buffer
        boolean esta_activo
    }

    CLIENTES {
        uuid id PK
        uuid usuario_id FK "UNIQUE"
        date fecha_nacimiento
        varchar canal_captacion
        text[] etiquetas
        text notas_internas
        boolean esta_bloqueada
        text motivo_bloqueo
        timestamptz fecha_bloqueo
    }

    FICHAS_SALUD {
        uuid id PK
        uuid cliente_id FK
        varchar tipo_restriccion
        text descripcion
        varchar severidad "CHECK: informativa|moderada|critica"
        boolean esta_activo
    }

    MAGIC_LINKS {
        uuid id PK
        uuid usuario_id FK
        uuid token UK
        timestamptz expira_en
        boolean usado
        timestamptz fecha_creacion
    }

    CATEGORIAS {
        uuid id PK
        varchar nombre UK
        text descripcion
        varchar icono_url
        varchar color_hex
        int orden_visualizacion
        boolean esta_activo
    }

    SERVICIOS {
        uuid id PK
        uuid categoria_id FK
        varchar nombre
        text descripcion_tecnica
        int duracion_minutos
        numeric precio
        numeric monto_deposito
        boolean requiere_ficha_salud
        int horas_cancelacion_sin_penalidad
        varchar imagen_referencia_url
        boolean esta_activo
    }

    CITAS {
        uuid id PK
        uuid cliente_id FK
        uuid personal_id FK
        timestamptz programada_en
        timestamptz termina_en
        varchar estado "CHECK: 7 valores, ver 08_DIAGRAMAS_DE_ESTADO"
        timestamptz hora_llegada_real
        text notas_cliente
        text notas_especialista
        text motivo_cancelacion
        timestamptz fecha_cancelacion
        boolean penalizacion_aplicada
        timestamptz creada_en
    }

    CITA_SERVICIOS {
        uuid id PK
        uuid cita_id FK
        uuid servicio_id FK
        numeric precio_unitario
        int duracion_minutos
    }

    PAGOS {
        uuid id PK
        uuid cita_id FK
        uuid cliente_id FK
        varchar tipo "CHECK: deposito|saldo|total|penalizacion|reembolso"
        varchar metodo "CHECK: efectivo|transferencia|yape|plin|tarjeta"
        varchar estado "CHECK: pendiente|confirmado|rechazado|reembolsado"
        numeric monto
        varchar referencia_externa
        varchar comprobante_url
        uuid confirmado_por FK "→ usuarios.id"
        timestamptz fecha_confirmacion
        text nota_admin
    }

    DESCUENTOS {
        uuid id PK
        varchar nombre
        text descripcion
        varchar tipo "CHECK: porcentaje|monto_fijo"
        varchar scope "CHECK: publico|privado|reto"
        varchar codigo UK "único parcial (no null)"
        numeric valor
        numeric monto_minimo
        int max_usos_global
        int max_usos_por_cliente
        timestamptz vigente_desde
        timestamptz vigente_hasta
        boolean esta_activo
    }

    RETOS {
        uuid id PK
        varchar nombre
        text descripcion_visible
        int visitas_requeridas
        int dias_ventana
        varchar recompensa_tipo "CHECK: descuento|servicio_gratis|credito"
        numeric recompensa_valor
        boolean esta_activo
        timestamptz vigente_hasta
    }

    DESCUENTO_USOS {
        uuid id PK
        uuid descuento_id FK
        uuid cliente_id FK
        uuid cita_id FK
        uuid reto_origen_id FK "nullable"
        timestamptz fecha_canje
    }
```

**Restricción compuesta relevante**: `descuento_usos` tiene `UNIQUE(descuento_id, cliente_id,
cita_id)` — es lo que hace atómica la validación de RN14 bajo `SELECT ... FOR UPDATE`.

## Esquema planeado — Fidelización avanzada

```mermaid
erDiagram
    CLIENTES ||--o| NIVELES_FIDELIZACION : "tiene (nivel_actual_id)"
    NIVELES_FIDELIZACION ||--o{ PRODUCTOS_CATALOGO_EXCLUSIVO : "habilita"
    CLIENTES ||--o{ PEDIDOS_CATALOGO : "compra"
    PRODUCTOS_CATALOGO_EXCLUSIVO ||--o{ PEDIDOS_CATALOGO : "es objeto de"

    NIVELES_FIDELIZACION {
        uuid id PK
        varchar nombre
        int orden
        varchar tipo_umbral "visitas_totales|gasto_acumulado_soles|visitas_en_ventana"
        numeric valor_umbral
        int dias_ventana "solo si tipo_umbral=visitas_en_ventana"
        jsonb beneficios
        boolean esta_activo
    }

    PRODUCTOS_CATALOGO_EXCLUSIVO {
        uuid id PK
        varchar nombre
        text descripcion
        numeric precio
        varchar imagen_url
        uuid nivel_minimo_id FK
        int stock "nullable = sin control de stock"
        boolean esta_activo
    }

    PEDIDOS_CATALOGO {
        uuid id PK
        uuid cliente_id FK
        uuid producto_id FK
        numeric monto
        varchar estado "pendiente|pagado|entregado|cancelado"
        varchar referencia_pasarela
        timestamptz fecha_creacion
        timestamptz fecha_actualizacion
    }
```

## Esquema planeado — Asesoría de belleza con IA

```mermaid
erDiagram
    CLIENTES ||--o{ CONSULTAS_IA : "inicia"
    PERSONAL ||--o{ CONSULTAS_IA : "inicia (en vivo)"
    CITAS ||--o| CONSULTAS_IA : "asociada a"
    CONSULTAS_IA ||--o{ SELECCIONES_ESTILO : "produce"
    ESTILOS_CATALOGO ||--o{ SELECCIONES_ESTILO : "elegido como"
    CLIENTES ||--o{ SELECCIONES_ESTILO : "pertenece a"
    CITAS ||--o{ SELECCIONES_ESTILO : "enviada a (opcional)"

    ESTILOS_CATALOGO {
        uuid id PK
        varchar nombre
        text descripcion
        varchar imagen_url "una sola imagen, reutilizada — nunca crece con el uso"
        jsonb atributos "formas_rostro[], tipos_cabello[], largo, tags[]"
        boolean esta_activo
        uuid creado_por FK "→ usuarios.id"
        timestamptz fecha_creacion
    }

    CONSULTAS_IA {
        uuid id PK
        uuid cliente_id FK
        uuid personal_id FK "nullable"
        uuid cita_id FK "nullable"
        timestamptz creada_en
        jsonb analisis_ia "atributos detectados — NUNCA la imagen"
        jsonb estilos_sugeridos "[{estilo_catalogo_id, score}]"
    }

    SELECCIONES_ESTILO {
        uuid id PK
        uuid consulta_id FK "nullable si origen=favorito"
        uuid estilo_catalogo_id FK
        uuid cliente_id FK
        uuid cita_id FK "nullable"
        varchar origen "consulta_ia|favorito"
        varchar seleccionado_por "cliente|trabajador"
        boolean enviado_a_trabajador
        timestamptz fecha_seleccion
        boolean feedback_coincidio "nullable"
        text feedback_nota "nullable"
    }
```

**Garantía de esquema (RN17)**: ninguna de las tres tablas de este bloque tiene una columna de
tipo imagen/blob para la foto de la clienta — la única columna de imagen del bloque completo es
`estilos_catalogo.imagen_url`, que es una imagen de referencia del catálogo, no de una clienta.
