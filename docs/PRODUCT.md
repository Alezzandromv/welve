# Producto — Welve

## Qué es Welve

Welve es el sistema operativo de **Eunoia Beauty Salon** (Lima, Perú). Centraliza citas,
disponibilidad de especialistas, cobros, historial de salud y fidelización de clientes. No es
un producto genérico de scheduling — está diseñado específicamente alrededor de cómo opera un
salón de belleza premium en Lima: reservas por WhatsApp, pagos mixtos (efectivo, Yape, Plin,
transferencia, tarjeta), fichas de salud por restricciones capilares/dermatológicas, y una
relación de largo plazo con clientas recurrentes que el salón quiere fidelizar activamente.

## Misión

Que el salón opere **sin papel, sin WhatsApps sueltos y sin dobles reservas** — toda la
operación (agenda, cobros, historial, fidelización) vive en un solo sistema, accesible según
el rol de quien lo usa y el contexto físico en el que lo usa.

## Visión

Que Welve sea, además de la base operativa, un diferenciador de experiencia: que una clienta
sienta que reservar en Eunoia es tan cuidado como el servicio mismo, que una especialista
tenga toda la información que necesita sin fricción entre tratamientos, y que la administración
tenga visibilidad total del negocio sin tener que reconciliar información de tres canales
distintos (agenda física, WhatsApp, cuadernos de cobro).

A mediano plazo (ver `docs/FASES.md`), Welve también se convierte en el canal donde el salón
profundiza la relación con sus clientas más allá de la transacción: asesoría de estilo asistida
por IA y un programa de fidelización con beneficios tangibles y configurables, no solo
descuentos genéricos.

## Objetivos de producto (medibles)

- **Cero dobles reservas**: ninguna cita se agenda solapada con otra de la misma especialista
  (RN13), validado en backend, no solo en la UI.
- **Cero fricción de acceso para clientas**: alta y login sin contraseña (magic link por
  WhatsApp) — el tiempo entre "quiero reservar" y "ver el calendario disponible" debe sentirse
  instantáneo.
- **Visibilidad financiera en tiempo real para admin**: pagos pendientes, ingresos del día/mes
  y no-shows visibles sin exportar nada a Excel.
- **Retención medible**: el módulo de fidelización (actual y el avanzado planeado, ver
  `docs/MODULO_FIDELIZACION_AVANZADA.md`) debe poder mostrarle al admin, con datos reales, si
  los retos/niveles están moviendo la frecuencia de visita y el ticket promedio.

## Perfiles de usuario

### Admin (dueña / gerente del salón)

Contexto físico: escritorio o tablet en el back-office. Necesita control total pero presentado
con personalidad: los datos deben sentirse como un dashboard de revista especializada, no como
una hoja de cálculo. Densidad informativa bienvenida cuando está bien jerarquizada. Los números
grandes deben impactar.

Necesidades centrales: ver el estado del negocio de un vistazo (citas del día, ingresos,
no-shows), gestionar personal y su disponibilidad, configurar servicios y precios, confirmar/
rechazar/reembolsar pagos, gestionar clientas (incluyendo bloqueo por mal comportamiento y
fichas de salud), y configurar las reglas del programa de fidelización.

### Trabajador / Especialista

Contexto físico: tablet o móvil entre tratamientos, con las manos ocupadas la mayor parte del
tiempo — cada interacción debe ser rápida y de bajo esfuerzo cognitivo. Vista limpia y de
consulta rápida. Sin ruido, sin gestión financiera. Debe sentirse como una herramienta que da
confianza, no ansiedad, y nunca debe exponer datos de otras especialistas ni información
financiera del salón (comisiones, ingresos totales).

Necesidades centrales: ver su agenda del día, registrar la llegada de una clienta, avanzar el
estado de una cita (confirmar → en curso → completada), estar alertada de restricciones de
salud críticas antes de empezar un servicio (RN09), y — con el módulo de IA planeado — iniciar
o consultar una asesoría de estilo durante la cita.

### Cliente

Contexto físico: móvil, generalmente desde casa o en movimiento. Experiencia de reserva que se
siente premium, no utilitaria. El magic link por WhatsApp ya elimina la fricción de
contraseñas; la UI debe mantener esa sensación de fluidez en cada paso siguiente (elegir
servicio, ver disponibilidad real, confirmar, pagar depósito).

Necesidades centrales: reservar y cancelar citas sin llamar al salón, ver su historial, conocer
sus descuentos y progreso de retos disponibles, y — con los módulos planeados — recibir
sugerencias de estilo antes de su cita y acceder a un catálogo exclusivo si es clienta frecuente.

Ver la matriz completa de qué puede hacer cada rol, módulo por módulo, en
`docs/ROLES_Y_PERMISOS.md`.

## Brand Personality

**Elegante · Preciso · Vivo**

No es un SaaS genérico. No es un marketplace de belleza colorido. Es una herramienta con
carácter: el violet profundo da identidad, la tipografía bold da jerarquía, el espacio en
blanco da respiro. Las métricas importantes se muestran grandes. El movimiento es intencional y
refinado, nunca decorativo.

Referencia de feeling: la precisión de Linear, la calidez de una boutique, la confianza de un
dashboard financiero moderno.

## Anti-references

- **Fresha / Booksy**: marketplaces coloridos y busy — demasiado escaparate, cero carácter
  propio.
- **Calendly genérico**: scheduling funcional sin identidad — gris, anónimo, podría ser
  cualquier empresa.
- **SaaS-cream estándar**: fondo beige / tarjetas con border-radius exagerado / gradiente lila
  genérico de plantilla. Exactamente lo que Welve no es.
- **Dashboard de RRHH corporativo**: densidad cruda sin jerarquía visual ni estado emocional —
  Excel con CSS.
- **Tres cards iguales en fila**: el patrón más genérico del diseño de producto. Nunca en
  Welve.

## Design Principles

1. **Los números grandes mandan.** Las métricas clave (citas hoy, ingresos, no-shows) se
   muestran en tipografía display bold. El admin debe ver el estado del día de un vistazo, sin
   leer.
2. **El rol dicta la vista.** Admin: densidad y control. Worker: agenda limpia. Cliente:
   claridad y confianza. Mismo sistema, tres experiencias calibradas.
3. **Layout asimétrico con propósito.** Las grillas no tienen que ser todas iguales. Una KPI
   card puede ser el doble de ancha. El calendario puede dominar una columna entera. La
   asimetría crea jerarquía sin necesidad de más color.
4. **Movimiento que informa.** Las animaciones existen para mostrar estado, no para decorar.
   El cambio de estado de una cita se siente. La entrada de datos tiene ritmo. El stagger de
   cards al cargar da sensación de sistema vivo.
5. **Violet con intención.** El Electric Violet no es decoración — es el acento que indica
   acción, estado activo y datos importantes. Turbo yellow solo para alertas de alta energía y
   recompensas de fidelización.
6. **Estado siempre visible.** Ningún usuario queda en duda sobre qué acaba de pasar.
   Confirmaciones, errores, estados de carga y mensajes vacíos son parte del diseño, no
   afterthoughts.

Ver `docs/DESIGN.md` para cómo estos principios se traducen a tokens de diseño concretos.

## Accessibility & Inclusion

WCAG 2.1 AA. Contraste mínimo 4.5:1 para texto de cuerpo, 3:1 para texto grande y UI. Soporte
de navegación por teclado. Alternativas para `prefers-reduced-motion`. Se considera
explícitamente que clientas y trabajadoras usan el sistema en móvil bajo luz variable
(interiores del salón, luz natural de ventana, pantallas compartidas entre especialistas en un
mismo dispositivo tablet) — el contraste y el tamaño táctil no son un checkbox de compliance,
son una condición real de uso.

## Alcance actual vs. planeado

Este documento describe el producto en su totalidad, incluyendo módulos que **aún no están
implementados**. El estado real de cada pieza vive en:

- `docs/FASES.md` — qué está hecho, qué está en construcción, qué es roadmap.
- `docs/MODULO_ASESORIA_IA.md` y `docs/MODULO_FIDELIZACION_AVANZADA.md` — especificación
  completa de los dos módulos nuevos, documentados a nivel de arquitectura pero pendientes de
  implementación.
