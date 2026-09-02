# Diagramas de Secuencia

Interacción temporal actor → frontend → router → service → base de datos (y actor secundario
cuando aplica) para los flujos más representativos de cada capa de la arquitectura.

## Login de staff (email + contraseña)

```mermaid
sequenceDiagram
    actor U as Admin/Trabajador
    participant FE as Frontend (LoginPage)
    participant R as routers/auth.py
    participant S as auth_service
    participant DB as Postgres (usuarios)

    U->>FE: ingresa correo + contraseña
    FE->>R: POST /api/v1/auth/login
    R->>S: login_staff(session, correo, contrasena)
    S->>DB: SELECT * FROM usuarios WHERE correo = :correo
    DB-->>S: fila Usuario o vacío
    alt usuario no existe o sin hashed_password
        S-->>R: HTTPException 401
        R-->>FE: 401 Unauthorized
        FE-->>U: "Credenciales incorrectas"
    else usuario existe
        S->>S: verificar_password(contrasena, hashed_password)
        alt contraseña incorrecta
            S-->>R: HTTPException 401
            R-->>FE: 401
            FE-->>U: "Credenciales incorrectas"
        else contraseña correcta
            S->>S: ¿esta_activo?
            alt cuenta inactiva
                S-->>R: HTTPException 403
                R-->>FE: 403
                FE-->>U: "Cuenta inactiva"
            else cuenta activa
                S->>S: crear_access_token(id, rol, nombre)
                S-->>R: {access_token, rol, nombre_completo, usuario_id}
                R-->>FE: 200 TokenResponse
                FE->>FE: setAuth(token, usuario) [Zustand + localStorage]
                FE-->>U: redirige según rol (/admin, /trabajador/agenda)
            end
        end
    end
```

## Flujo completo de magic link (cliente)

```mermaid
sequenceDiagram
    actor C as Cliente
    participant FE as Frontend
    participant R as routers/auth.py
    participant S as auth_service
    participant DB as Postgres
    participant WA as WhatsApp Cloud API

    C->>FE: ingresa su teléfono
    FE->>R: POST /auth/solicitar-acceso
    R->>S: solicitar_magic_link(session, telefono)
    S->>DB: SELECT usuarios WHERE telefono=...
    alt usuario no existe
        S->>DB: INSERT Usuario(rol=cliente) + INSERT Cliente
        Note over S,DB: race condition: si otro request<br/>lo crea primero → IntegrityError →<br/>rollback + SELECT de nuevo
    end
    S->>DB: INSERT MagicLink(expira_en = ahora+1h)
    S->>WA: enviar_mensaje(telefono, url con token)
    WA-->>C: mensaje de WhatsApp con el enlace
    S-->>R: {"mensaje": "Enlace enviado"}
    R-->>FE: 200

    C->>FE: abre el enlace (?token=xxx)
    FE->>R: GET /auth/verificar?token=xxx
    R->>S: verificar_magic_link(session, token)
    S->>DB: SELECT MagicLink WHERE token=...
    alt token no encontrado
        S-->>R: 404
    else token usado o expirado
        S-->>R: 410 Gone
    else token válido
        S->>DB: UPDATE magic_links SET usado=true<br/>WHERE id=... AND usado=false<br/>RETURNING usuario_id
        Note over S,DB: UPDATE atómico condicionado —<br/>evita reuso concurrente del mismo token
        DB-->>S: usuario_id (o ninguna fila si ya se usó)
        S->>DB: SELECT Usuario por id
        S->>S: crear_access_token(...)
        S-->>R: {access_token, rol, nombre}
        R-->>FE: 200
        FE->>FE: setAuth(token, usuario)
        FE-->>C: redirige a su vista de cliente
    end
```

## Crear una cita (con validaciones RN08/RN11/RN13)

```mermaid
sequenceDiagram
    actor C as Cliente
    participant FE as Frontend (Reservar)
    participant R as routers/citas.py
    participant S as citas_service
    participant DB as Postgres

    C->>FE: elige servicios, especialista, horario
    FE->>R: POST /api/v1/citas
    R->>S: crear(session, body, usuario_id)
    S->>DB: SELECT Cliente WHERE usuario_id=...
    alt esta_bloqueada = true
        S-->>R: 403 (RN11)
        R-->>FE: 403
    else no bloqueada
        S->>DB: SELECT Servicio.* WHERE id IN (servicio_ids)
        alt algún servicio requiere ficha y no existe activa
            S-->>R: 422 (RN08)
            R-->>FE: 422
        else validación de ficha OK
            S->>DB: SELECT Personal WHERE id=personal_id
            S->>DB: SELECT DisponibilidadPersonal (buffer)
            S->>DB: SELECT Cita WHERE personal_id=... AND ventana de ±1 día
            alt solapamiento detectado (RN13)
                S-->>R: 409
                R-->>FE: 409
                FE-->>C: refresca disponibilidad
            else sin solapamiento
                S->>DB: INSERT Cita(estado=pendiente)
                S->>DB: INSERT CitaServicio (por cada servicio)
                S->>S: enriquecer_cita(session, cita)
                Note over S,DB: 3 queries secuenciales —<br/>nunca asyncio.gather sobre la misma sesión
                S-->>R: CitaResponse enriquecida
                R-->>FE: 201 Created
                FE-->>C: confirmación de reserva
            end
        end
    end
```

## Cambiar estado de cita con alerta de ficha crítica (RN09)

```mermaid
sequenceDiagram
    actor T as Trabajador
    participant FE as Frontend (Agenda)
    participant R as routers/citas.py
    participant S as citas_service
    participant DB as Postgres

    T->>FE: marca "iniciar servicio"
    FE->>R: PATCH /citas/{id}/estado {estado: en_curso}
    R->>S: cambiar_estado(session, cita_id, body, usuario)
    S->>DB: SELECT Cita WHERE id=...
    S->>S: ¿usuario.rol==trabajador? validar que la cita es suya
    S->>S: ¿transición pendiente→en_curso permitida?
    S->>DB: SELECT FichaSalud WHERE cliente_id=... AND severidad=critica AND esta_activo
    alt hay fichas críticas y confirmar_ficha_critica=false
        S-->>R: 422 {codigo: FICHA_CRITICA, fichas: [...]}
        R-->>FE: 422
        FE-->>T: muestra alerta con el detalle
        T->>FE: confirma haber leído la alerta
        FE->>R: PATCH /citas/{id}/estado {estado: en_curso, confirmar_ficha_critica: true}
        R->>S: cambiar_estado(...)
    end
    S->>DB: UPDATE Cita SET estado=en_curso, hora_llegada_real=ahora()
    S-->>R: CitaResponse enriquecida
    R-->>FE: 200
    FE-->>T: cita marcada en curso
```

## Consulta de asesoría con IA *(planeado)*

```mermaid
sequenceDiagram
    actor C as Cliente
    participant FE as Frontend (AsesoriaIA)
    participant R as routers/ia.py
    participant S as ia_service
    participant G as Gemini API
    participant DB as Postgres

    C->>FE: acepta consentimiento y captura foto
    FE->>R: POST /ia/consultas (multipart, foto en memoria)
    R->>S: crear_consulta(session, cliente_id, foto_bytes)
    S->>DB: SELECT EstiloCatalogo WHERE esta_activo=true
    S->>G: analizar(foto_bytes, atributos_catalogo)
    G-->>S: [{estilo_id, score}, ...] + atributos detectados
    S->>S: descartar foto_bytes (nunca se escribe a disco)
    Note over S: RN17 — la foto nunca sale de esta función
    S->>DB: INSERT ConsultaIA(analisis_ia, estilos_sugeridos)
    S-->>R: ConsultaIAResponse
    R-->>FE: 200 (sugerencias, sin ninguna imagen de la clienta)
    FE-->>C: muestra grid de estilos sugeridos

    C->>FE: elige un estilo y confirma envío
    FE->>R: POST /ia/consultas/{id}/seleccion
    R->>S: seleccionar_estilo(session, consulta_id, estilo_id)
    S->>DB: SELECT próxima Cita del cliente (no terminal)
    alt no hay cita futura
        S-->>R: selección guardada, sin cita_id
    else hay cita futura
        S->>DB: INSERT SeleccionEstilo(cita_id=...)
    end
    S-->>R: SeleccionEstiloResponse
    R-->>FE: 200
    FE-->>C: "Enviado a tu especialista"
```

## Webhook de confirmación de pago (Culqi) *(planeado)*

```mermaid
sequenceDiagram
    actor Cq as Culqi
    participant WH as routers/webhooks.py
    participant PS as pasarela_service
    participant CS as catalogo_service
    participant DB as Postgres

    Cq->>WH: POST /webhooks/culqi {evento, firma}
    WH->>PS: verificar_firma_webhook(payload, firma)
    alt firma inválida
        PS-->>WH: False
        WH-->>Cq: 401 Unauthorized
    else firma válida
        PS-->>WH: True
        WH->>CS: confirmar_pago_webhook(session, referencia_pasarela, resultado)
        CS->>DB: SELECT PedidoCatalogo WHERE referencia_pasarela=...
        alt pedido ya estaba en 'pagado' (webhook reintentado)
            CS-->>WH: no-op — idempotente (RN23)
        else pedido en 'pendiente'
            alt resultado = aprobado
                CS->>DB: UPDATE PedidoCatalogo SET estado=pagado
            else resultado = rechazado
                CS->>DB: UPDATE PedidoCatalogo SET estado=cancelado
                Note over CS: RN24 — sin efecto en el nivel del cliente
            end
        end
        WH-->>Cq: 200 OK
    end
```
