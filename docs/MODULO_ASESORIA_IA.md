# Módulo: Asesoría de Belleza con IA

**Estado: planeado, no implementado.** Este documento es la especificación completa para su
futura implementación (Fase 4 en `docs/FASES.md`). No hay ningún código de este módulo en el
repositorio todavía — se documenta a nivel de arquitectura, modelo de datos y flujo para que la
implementación no tenga ambigüedades.

## El problema que resuelve

Una clienta que llega a Eunoia sin tener claro qué estilo quiere pierde tiempo de consulta con
la especialista, y la especialista pierde tiempo "adivinando" gustos en vez de ejecutar. La
idea: dejar que la clienta explore opciones de estilo *antes* de sentarse en la silla, usando
su propia cámara y una IA que entienda su forma de rostro/cabello, y que esa elección llegue
lista a la especialista.

## La decisión de diseño central: nunca almacenar la foto original

Guardar una foto por cada consulta de cada clienta es, simultáneamente: (a) pesado en storage a
escala (miles de sesiones × varios MB cada una), y (b) un riesgo de privacidad innecesario — es
literalmente un dato biométrico facial. La alternativa elegida evita el problema de raíz en vez
de optimizarlo después:

> **La IA no genera imágenes nuevas por sesión — recomienda ítems de un catálogo curado que el
> salón carga una sola vez.** La foto de la clienta se usa solo como entrada efímera para el
> análisis y se descarta inmediatamente después.

Esto acota el costo de storage de imágenes a **O(tamaño del catálogo)**, no a
**O(sesiones × clientas)** — el catálogo tiene decenas o cientos de estilos, no miles de fotos
de clientas creciendo indefinidamente. Es, a la vez, la opción más eficiente en storage y la
más simple en materia de privacidad (no hay dato biométrico que proteger porque no se guarda).

### Qué se descarta y qué se guarda

| Dato | ¿Se persiste? | Dónde |
|---|---|---|
| Foto original capturada por la cámara | **No, nunca.** Se usa en memoria del proceso que llama a la IA y se descarta al terminar la request. | — |
| Atributos detectados por la IA (forma de rostro, tipo/largo de cabello inferido) | Sí, como JSON estructurado — no es una imagen. | `ConsultaIA.analisis_ia` |
| Estilos sugeridos y su score | Sí, como referencias a IDs del catálogo. | `ConsultaIA.estilos_sugeridos` |
| Estilo(s) que la clienta eligió y envió a su especialista | Sí. | `SeleccionEstilo` |
| Imagen del estilo en sí | Sí, pero es **una sola imagen por ítem del catálogo**, reutilizada por todas las clientas — la mantiene el salón, no crece con el uso. | `EstiloCatalogo.imagen_url` |

## Modelo de datos

```
EstiloCatalogo
  id, nombre, descripcion, imagen_url, atributos (jsonb: formas_rostro[], tipos_cabello[],
  largo, tags[]), esta_activo, creado_por (usuario_id), fecha_creacion

ConsultaIA
  id, cliente_id → Cliente, personal_id → Personal (opcional, si la inició el trabajador),
  cita_id → Cita (opcional), creada_en,
  analisis_ia (jsonb: atributos detectados por la IA — NO la imagen),
  estilos_sugeridos (jsonb: [{estilo_catalogo_id, score}, ...])

SeleccionEstilo
  id, consulta_id → ConsultaIA (opcional — null cuando origen=favorito, ver CU-C08),
  estilo_catalogo_id → EstiloCatalogo, cliente_id → Cliente,
  cita_id → Cita (opcional — se llena al presionar "enviar a mi estilista"; RN19 exige que,
  si se llena, sea una cita futura en estado no terminal del mismo cliente),
  origen (consulta_ia|favorito), seleccionado_por (cliente|trabajador),
  enviado_a_trabajador (bool), fecha_seleccion,
  feedback_coincidio (bool, opcional — lo llena el trabajador al completar la cita, CU-T06),
  feedback_nota (texto, opcional)
```

Un "favorito" (CU-C08, explorar el catálogo sin cámara) es una `SeleccionEstilo` con
`consulta_id=null` y `origen=favorito` — misma tabla, para que la especialista vea ambos
orígenes en un solo lugar sin distinguir de dónde vino cada uno (tal como pide CU-C08), en vez
de duplicar el concepto en una tabla `EstiloFavorito` aparte.

Ninguna de estas tablas tiene una columna de imagen de la clienta — es una garantía a nivel de
esquema, no solo de "disciplina" de la aplicación: si alguien intenta guardar la foto original,
no hay dónde ponerla sin agregar una columna nueva, lo cual sería una señal de alarma en
cualquier revisión de código futura.

## Flujo end-to-end

1. **Consentimiento**: antes de activar la cámara, el cliente (o trabajador) acepta un texto de
   consentimiento explícito: *"Tu foto se usa solo para generar sugerencias de estilo y se
   elimina inmediatamente después — no se guarda."* Sin aceptar, la cámara no se activa
   (RN16).
2. **Captura**: el frontend (móvil del cliente en `Reservar`/`MisCitas`, o tablet del
   trabajador durante la cita) abre la cámara nativa del navegador (`getUserMedia`), captura un
   frame, y lo envía al backend como `multipart/form-data` en un único request — nunca queda
   guardado en el estado de la app más tiempo del necesario para el envío.
3. **Análisis**: el backend reenvía la imagen a la API de Gemini (modelo multimodal de la
   familia rápida/económica vigente al momento de implementar — verificar en la documentación
   oficial de Gemini cuál es el modelo de visión recomendado en ese momento; no fijar aquí un
   nombre de modelo que puede quedar obsoleto) junto con la metadata del catálogo activo
   (atributos de cada `EstiloCatalogo`, no las imágenes en sí, para mantener el prompt liviano).
   La IA devuelve una lista rankeada de IDs del catálogo con su score de afinidad.
4. **Descarte**: apenas se obtiene la respuesta de la IA, el backend libera la imagen recibida
   — no se escribe a disco ni a ningún bucket de storage en ningún punto del flujo (RN17).
5. **Selección**: el cliente ve las sugerencias (imágenes ya existentes del catálogo, no
   generadas), elige una o varias, y presiona "enviar a mi especialista".
6. **Entrega**: se crea `SeleccionEstilo` ligado a la próxima `Cita` del cliente — solo si esa
   cita existe y está en un estado no terminal (RN19); si el cliente no tiene ninguna cita
   futura agendada todavía, la consulta queda guardada pero el botón "enviar a mi estilista"
   permanece deshabilitado hasta que reserve una. La especialista ve la selección en su agenda
   (tablet) antes de que la clienta llegue.
7. **Historial**: al completarse la cita, la selección queda en el historial de estilos de esa
   clienta — visible para cualquier especialista que la atienda después, sin volver a analizar
   nada (CU-T05 en `docs/CASOS_DE_USO.md`).
8. **Trabajador en vivo**: la especialista también puede iniciar el mismo flujo durante la cita
   presencial (CU-T04) — mismo modelo de datos, con `personal_id` poblado.

## Configuración por el admin

- Activar/desactivar el módulo globalmente.
- Límite de consultas por cliente por día (RN18) — control de costo de la API de Gemini.
- Gestión del catálogo de estilos (`EstiloCatalogo`): alta, edición, baja — CU-A05.
- Métricas de uso agregadas (número de consultas, estilos más elegidos) — nunca fotos, porque
  no existen.

## Archivos nuevos (backend)

Siguiendo la convención ya establecida en `backend/app/` (un archivo por capa, nunca lógica de
negocio en el router):

```
app/models/ia.py            # EstiloCatalogo, ConsultaIA, SeleccionEstilo (SQLAlchemy)
app/schemas/ia.py            # requests/responses Pydantic — EstiloCatalogoResponse,
                              # CrearEstiloCatalogoRequest, ConsultaIAResponse,
                              # SeleccionEstiloRequest, ConfiguracionIARequest/Response
app/services/ia_service.py   # lógica de negocio: crear_consulta(), seleccionar_estilo(),
                              # CRUD de EstiloCatalogo, cálculo de métricas agregadas
app/routers/ia.py            # monta en /api/v1/ia (ver tabla de endpoints)
app/utils/gemini_client.py   # cliente HTTP a la API de Gemini — mismo patrón que
                              # utils/whatsapp.py (una función async, sin estado, lee
                              # settings.gemini_api_key)
```

`core/config.py` gana `gemini_api_key: str`, `ia_habilitada: bool = False`,
`ia_limite_consultas_diarias: int = 3` (con override en DB vía una fila de configuración, no
solo `.env`, para que el admin la cambie sin redeploy — ver `ConfiguracionIA` más abajo).

Una migración de Alembic nueva agrega las tres tablas del modelo de datos más, opcionalmente,
una tabla pequeña `configuracion_ia` (fila única) si se prefiere configuración persistida en DB
sobre variables de entorno — recomendado, ya que `docs/PRODUCT.md` pide "libertad de
configuración" para el admin sin depender de un redeploy.

## Endpoints nuevos (API)

Un solo router (`app/routers/ia.py`), montado una vez en `/api/v1/ia` — mismo patrón que ya usa
`fidelizacion.py`: rutas de cliente/trabajador y de admin conviven en el mismo archivo y
prefijo, distinguidas por `requerir_rol(...)` en cada endpoint, no por un prefijo `/admin/`
separado (ese patrón de router aparte solo se usa en el proyecto cuando el módulo entero es
admin-only, como `clientes.py`, o cuando el propio recurso ya tiene un router de cliente
independiente con semántica distinta, como `citas.py` vs `admin.py` para listar-todo vs
listar-lo-mío — no es el caso aquí):

```
POST   /api/v1/ia/consultas                  # cliente o trabajador — sube foto (multipart,
                                              # efímera), devuelve sugerencias del catálogo
GET    /api/v1/ia/consultas/mis-consultas    # cliente — su propio historial
GET    /api/v1/ia/consultas/cliente/{id}     # trabajador/admin — historial de un cliente
                                              # (para la especialista que lo va a atender)
POST   /api/v1/ia/consultas/{id}/seleccion   # cliente o trabajador — registra SeleccionEstilo
                                              # y la liga a la próxima cita (RN19)
POST   /api/v1/ia/consultas/{id}/feedback    # trabajador — feedback post-servicio (CU-T06)
GET    /api/v1/ia/catalogo                   # cualquier rol autenticado — estilos activos
POST   /api/v1/ia/favoritos                  # cliente — favorito sin pasar por consulta (CU-C08)
GET    /api/v1/ia/favoritos                  # cliente — sus favoritos
DELETE /api/v1/ia/favoritos/{id}             # cliente
POST   /api/v1/ia/catalogo                   # admin — crear EstiloCatalogo
PATCH  /api/v1/ia/catalogo/{id}              # admin — editar (incluye activar/desactivar)
DELETE /api/v1/ia/catalogo/{id}              # admin — baja lógica (esta_activo=false)
GET    /api/v1/ia/configuracion               # admin — ver config (habilitada, límite diario)
PATCH  /api/v1/ia/configuracion               # admin — activar/desactivar, ajustar límite
GET    /api/v1/ia/metricas                    # admin — consultas totales, estilos más
                                              # elegidos, % de feedback positivo (CU-A08), sin fotos
```

## Vistas y componentes nuevos (frontend)

Siguiendo la estructura ya establecida (`pages/{admin,worker,client}/`, `services/`, `types/`):

**Cliente** (`pages/client/`):
- `AsesoriaIA.tsx` (nueva) — pantalla completa: consentimiento → cámara → grid de sugerencias
  → selección múltiple → botón "Enviar a mi estilista". Accesible desde un botón nuevo
  "Sugerencias con IA" en `Reservar.tsx` (antes o después de elegir servicio) y desde
  `MisCitas.tsx` (si ya tiene una cita próxima confirmada).
- `components/client/CamaraConsulta.tsx` (nuevo) — encapsula `getUserMedia`, captura un frame a
  `<canvas>`, lo exporta a blob para el `multipart/form-data`; nunca persiste el blob en
  estado de React más tiempo del necesario para el envío (refleja RN17 también en frontend).
- `components/client/GridEstilos.tsx` (nuevo) — grid reutilizable de tarjetas de estilo
  (imagen + nombre + score), reutilizado también en `CatalogoExclusivo` de fidelización si el
  diseño visual coincide.
- Sección "Mis estilos" dentro de `MisCitas.tsx` — historial de `SeleccionEstilo` propias.

**Trabajador** (`pages/worker/`):
- `Agenda.tsx` (extensión) — cada tarjeta de cita con una `SeleccionEstilo` asociada muestra un
  badge "Estilo sugerido" con thumbnail; click abre un panel con el detalle y el historial de
  estilos previos de esa clienta (CU-T05).
- `ConsultaIA.tsx` (nueva) — mismo componente `CamaraConsulta`/`GridEstilos` reutilizados,
  para iniciar una consulta en vivo durante la cita (CU-T04), con `personal_id` poblado.

**Admin** (`pages/admin/`):
- `CatalogoEstilos.tsx` (nueva) — CRUD de `EstiloCatalogo`: grid con imagen, atributos
  (forma de rostro, tipo/largo de cabello, tags), toggle activo/inactivo, formulario de alta/
  edición con subida de imagen (única por estilo, reutilizada — ver política de storage), y un
  indicador de "% feedback positivo" por estilo (CU-A08) para decidir si retirarlo o ajustarlo.
- `ConfiguracionPage.tsx` (extensión) — nueva sección "Asesoría IA": toggle
  activar/desactivar, input de límite de consultas diarias, texto informativo de costo
  estimado por consulta.
- `Dashboard.tsx` (extensión) — widget nuevo "Uso de IA este mes": consultas totales, estilos
  más elegidos (top 5), % de feedback positivo agregado (CU-A08) — sin ningún dato de imagen de
  clienta.

**Nuevos archivos de soporte**: `services/ia.service.ts` (llamadas Axios a los endpoints de
arriba) y `types/ia.ts` (`IEstiloCatalogo`, `IConsultaIA`, `ISeleccionEstilo`,
`IConfiguracionIA`), siguiendo la convención de un archivo de dominio por módulo.

## Funcionalidades adicionales

- **Favoritos sin consulta**: el cliente puede explorar el catálogo de estilos directamente
  (sin usar la cámara) y marcar favoritos — útil para quien ya sabe lo que quiere y solo
  quiere mostrárselo a su especialista sin pasar por el análisis de IA. Reutiliza
  `GET /api/v1/ia/catalogo` + un endpoint liviano `POST /api/v1/ia/favoritos`.
- **Notificación WhatsApp al trabajador**: al enviar una `SeleccionEstilo`, se envía un mensaje
  (reutilizando `utils/whatsapp.py`, mismo patrón que el magic link) a la especialista asignada
  si `usuario.acepta_whatsapp=true` — "Tu próxima clienta [nombre] eligió un estilo para su
  cita del [fecha]".
- **Feedback post-servicio**: al completar la cita, la especialista puede marcar si el
  resultado logrado coincidió con el estilo elegido (sí/no + nota corta) — no afecta al
  cliente, pero alimenta una métrica de confianza del catálogo para que el admin sepa qué
  estilos generan expectativas realistas y cuáles no.

## Costo, latencia y escalado del prompt

- Modelo de visión rápido/económico (evaluar el más barato disponible con capacidad
  multimodal suficiente al momento de implementar) — la tarea es clasificación/ranking contra
  un catálogo cerrado, no generación creativa, así que no se necesita el modelo más potente.
- Si el catálogo crece mucho (cientos de ítems), evaluar pasar de "todo el catálogo en el
  prompt" a una búsqueda por embeddings previa (reducir a los N candidatos más plausibles antes
  de pedirle a la IA que rankee) — no es necesario para un catálogo pequeño/mediano inicial.
- El límite diario por cliente (RN18) es la principal palanca de control de costo total.

## Roles y visibilidad

Ver la fila correspondiente en `docs/ROLES_Y_PERMISOS.md`. Resumen: el cliente ve solo sus
propias consultas; el trabajador ve las de sus clientas agendadas (no las de clientas de otras
especialistas); el admin gestiona el catálogo y ve métricas agregadas, nunca fotos individuales
(porque, de nuevo, no existen).
