# Documentación de Welve

Índice de toda la documentación de contexto del proyecto. `CLAUDE.md` (en la raíz del repo)
sigue siendo la referencia técnica operativa día a día (comandos, arquitectura de código,
convenciones) — estos documentos son su complemento de producto, diseño y planeamiento.

| Documento | Qué encontrarás ahí |
|---|---|
| [`PRODUCT.md`](./PRODUCT.md) | Qué es Welve, misión, visión, perfiles de usuario, personalidad de marca, principios de diseño y accesibilidad a nivel de producto. |
| [`DESIGN.md`](./DESIGN.md) | El sistema de diseño explicado — el razonamiento detrás de los tokens visuales (color, tipografía, espaciado, motion) que viven como código en `frontend/src/index.css`. |
| [`REGLAS_DE_NEGOCIO.md`](./REGLAS_DE_NEGOCIO.md) | Todas las reglas de negocio (RN01 en adelante), implementadas y planeadas, con su motivación. |
| [`CASOS_DE_USO.md`](./CASOS_DE_USO.md) | Casos de uso completos por rol y módulo, actuales y planeados, con flujo principal y alternativo. |
| [`ROLES_Y_PERMISOS.md`](./ROLES_Y_PERMISOS.md) | Matriz completa de qué puede ver/crear/editar/eliminar cada rol (Admin, Trabajador, Cliente) en cada módulo. |
| [`FASES.md`](./FASES.md) | Roadmap del proyecto: qué está hecho, qué se cerró en la última ronda de trabajo, y qué es futuro. |
| [`MODULO_ASESORIA_IA.md`](./MODULO_ASESORIA_IA.md) | Especificación completa del módulo planeado de asesoría de belleza con IA (cámara + Gemini). |
| [`MODULO_FIDELIZACION_AVANZADA.md`](./MODULO_FIDELIZACION_AVANZADA.md) | Especificación completa del módulo planeado de niveles de fidelización, catálogo exclusivo y pasarela de pago. |
| [`DEPENDENCIAS.md`](./DEPENDENCIAS.md) | Estado de las dependencias del proyecto, qué se verificó y cuándo, y qué saltos de versión mayor quedaron pospuestos deliberadamente. |

## Cómo se relaciona esto con `CLAUDE.md`

`CLAUDE.md` vive en la raíz del repositorio porque Claude Code (y cualquier agente que trabaje
en este código) lo carga automáticamente como contexto de cada sesión — no se movió aquí para
no romper esa convención. Su contenido se recortó para no duplicar lo que ahora vive en
`docs/`: sigue teniendo comandos, arquitectura de código, convenciones y las reglas de negocio
operativas (RN01–RT05), pero la filosofía de producto/diseño extendida y los módulos planeados
ahora se documentan aquí, con un puntero desde `CLAUDE.md`.
