# Documentación de Tesis — Welve (Eunoia Beauty Salon)

Este directorio contiene la documentación formal de ingeniería de software del proyecto, en el
formato habitual de un capítulo de análisis y diseño de tesis: actores de negocio, casos de uso
con su especificación UML completa, y los diagramas estructurales/de comportamiento del sistema
(clases, entidad-relación, componentes, despliegue, actividad, secuencia, estado).

No es documentación nueva ni contradictoria con `docs/` — es la **misma información**
(`docs/CASOS_DE_USO.md`, `docs/REGLAS_DE_NEGOCIO.md`, `docs/ROLES_Y_PERMISOS.md`,
`docs/MODULO_ASESORIA_IA.md`, `docs/MODULO_FIDELIZACION_AVANZADA.md`, `CLAUDE.md`) reexpresada
en notación UML/formal para uso académico. Los identificadores (CU-XX, RNXX) son **los mismos**
en ambos lados — cualquier cambio futuro debe mantenerse sincronizado en los dos lugares.

Todos los diagramas están escritos en **Mermaid** — se renderizan nativamente en GitHub, en
VS Code (extensión "Markdown Preview Mermaid Support"), y en
[mermaid.live](https://mermaid.live) para exportar a imagen/PDF si la tesis lo requiere en ese
formato.

## Índice

| Documento | Contenido |
|---|---|
| [`01_ACTORES_DE_NEGOCIO.md`](./01_ACTORES_DE_NEGOCIO.md) | Actores primarios y secundarios, responsabilidades, diagrama de jerarquía de actores |
| [`02_CASOS_DE_USO_UML.md`](./02_CASOS_DE_USO_UML.md) | Diagramas de casos de uso (UML) por actor/módulo + especificación detallada de cada caso |
| [`03_ARQUITECTURA_DEL_SISTEMA.md`](./03_ARQUITECTURA_DEL_SISTEMA.md) | Arquitectura en capas, vista lógica, stack tecnológico, decisiones arquitectónicas |
| [`04_DIAGRAMA_DE_CLASES.md`](./04_DIAGRAMA_DE_CLASES.md) | Modelo de dominio completo (implementado + planeado) en notación de clases UML |
| [`05_MODELO_ENTIDAD_RELACION.md`](./05_MODELO_ENTIDAD_RELACION.md) | Esquema físico de base de datos (todas las tablas, PK/FK, cardinalidades) |
| [`06_DIAGRAMAS_DE_ACTIVIDAD.md`](./06_DIAGRAMAS_DE_ACTIVIDAD.md) | Flujo paso a paso de los procesos de negocio clave, con decisiones y actores por carril |
| [`07_DIAGRAMAS_DE_SECUENCIA.md`](./07_DIAGRAMAS_DE_SECUENCIA.md) | Interacción entre actor → frontend → router → service → base de datos por caso de uso |
| [`08_DIAGRAMAS_DE_ESTADO.md`](./08_DIAGRAMAS_DE_ESTADO.md) | Ciclo de vida de las entidades con estado (Cita, Pedido, Nivel de fidelización) |
| [`09_DIAGRAMA_DE_COMPONENTES.md`](./09_DIAGRAMA_DE_COMPONENTES.md) | Componentes de software (routers/services/models, frontend) y sus dependencias |
| [`10_DIAGRAMA_DE_DESPLIEGUE.md`](./10_DIAGRAMA_DE_DESPLIEGUE.md) | Nodos físicos/lógicos de infraestructura y protocolos de comunicación entre ellos |

## Convenciones usadas en todo este directorio

- **Actores primarios**: Cliente, Trabajador/Especialista, Administrador (personas).
- **Actores secundarios**: WhatsApp Business API, Motor de IA (Gemini), Pasarela de Pago
  (Culqi), Programador de Tareas (Celery Beat) — sistemas externos o internos que participan en
  un caso de uso sin ser el usuario humano que lo inicia.
- Los casos de uso conservan la numeración de `docs/CASOS_DE_USO.md` (`CU-C0x` cliente,
  `CU-T0x` trabajador, `CU-A0x` admin) y las reglas de negocio la de `docs/REGLAS_DE_NEGOCIO.md`
  (`RN01`–`RN24`).
- Todo lo marcado **(planeado)** pertenece a los dos módulos aún no implementados
  (`docs/MODULO_ASESORIA_IA.md`, `docs/MODULO_FIDELIZACION_AVANZADA.md`) — se documenta con el
  mismo nivel de detalle que lo ya implementado porque una tesis debe poder evaluar el diseño
  completo del sistema, no solo lo construido hasta la fecha de corte.
