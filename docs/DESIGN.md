# Sistema de Diseño — Welve

> Este documento explica el **razonamiento** del sistema visual. Los valores técnicos
> (variables CSS) viven como fuente única de verdad en `frontend/src/index.css`; la tabla
> resumen para desarrollo día a día está en `CLAUDE.md`. Aquí se documenta el *por qué*,
> con los valores reales citados para que el diseño no se desincronice del código.

## Overview

Welve no es un dashboard genérico — es la herramienta operativa de un salón premium. El
sistema visual tiene carácter: sidebar oscuro (Haiti) como columna vertebral permanente,
contenido en Blue Chalk con tipografía display bold para métricas que impactan, y un layout
asimétrico que crea jerarquía visual sin depender del color.

El violet eléctrico ancla acciones primarias. El amarillo Turbo aparece solo en momentos de
alta energía. El movimiento es deliberado — cada animación tiene una razón.

## Design Language

**Strategy:** Committed en el sidebar (Haiti, ~240px fijo / 56px colapsado — `--sidebar-width`,
`--sidebar-collapsed`). Asimétrico en el contenido — las grillas varían según la jerarquía de
la información, no por convención.

**Physical scene:** Admin en escritorio tras el mostrador mirando métricas del día.
Especialista en tablet entre cliente y cliente. Clienta en móvil eligiendo horario desde casa.
Tres contextos, tres velocidades de lectura — ver `docs/ROLES_Y_PERMISOS.md` para el detalle
funcional de cada rol.

**Typographic hierarchy:** Los números importantes van en display bold grande (`--text-3xl`,
30px, `--font-bold`). Las tablas van en `--text-sm` denso. Los labels van en `--text-xs`
con `--ink-muted`. La jerarquía se construye con tamaño y peso, no solo con color.

**Layout philosophy:** No todas las cards son iguales. Una métrica clave puede ocupar el doble
de espacio. El calendario puede dominar una columna completa. Los elementos secundarios se
comprimen. La grilla sirve al contenido, no al revés — nunca "tres cards iguales en fila".

## Colors

Todos los valores en OKLCH, definidos en `frontend/src/index.css`.

### Primitivos

```css
/* Violet — identidad de marca, de fondo claro a sidebar oscuro */
--color-violet-50:  oklch(0.97 0.015 285);   /* Blue Chalk — fondo general */
--color-violet-100: oklch(0.93 0.028 284);
--color-violet-200: oklch(0.87 0.055 284);
--color-violet-300: oklch(0.78 0.098 284);
--color-violet-400: oklch(0.67 0.158 285);
--color-violet-500: oklch(0.51 0.261 286);   /* Electric Violet — acento primario */
--color-violet-600: oklch(0.45 0.230 286);
--color-violet-700: oklch(0.38 0.190 287);
--color-violet-800: oklch(0.30 0.140 288);
--color-violet-900: oklch(0.20 0.075 288);
--color-violet-950: oklch(0.12 0.038 288);   /* Haiti — sidebar */

/* Turbo — alertas de alta energía y recompensas, uso deliberadamente escaso */
--color-turbo-400: oklch(0.92 0.178 106);
--color-turbo-500: oklch(0.877 0.196 105);
--color-turbo-600: oklch(0.79 0.165 96);

/* Semánticos — estado de sistema, nunca decorativos */
--color-success: oklch(0.58 0.155 152);
--color-warning: oklch(0.76 0.17 72);
--color-error:   oklch(0.57 0.21 22);
--color-info:    oklch(0.56 0.17 245);
```

### Por qué OKLCH

Se eligió OKLCH sobre HSL/RGB porque su luminosidad percibida es uniforme: subir o bajar el
canal `L` mantiene el mismo "peso visual" entre paletas (violet, turbo, semánticos), lo que
hace que las escalas de 50→950 luzcan consistentes entre sí sin ajuste manual por color. Esto
importa especialmente en los pares "estado sólido + estado-bg al 15% opacidad" (ver más abajo),
donde una L uniforme evita que un estado se sienta más "fuerte" que otro solo por el matiz.

### Superficies y texto

`--surface-bg` (fondo general, Blue Chalk) → `--surface-base` (tarjetas) → `--surface-raised`
(modales/popovers) forman una escalera de elevación de claro a más claro — nunca sombras
oscuras sobre fondo claro para simular profundidad, sino un salto sutil de luminosidad más
`--shadow-*`. El sidebar es la única superficie oscura (`--surface-sidebar`, Haiti), con su
propia escala de texto (`--sidebar-ink-*`) independiente de `--ink-*` — nunca reutilizar los
tokens de texto de superficie clara sobre el sidebar ni viceversa, el contraste no está
calibrado para eso.

### Estados de cita

Cada estado de `Cita` tiene un par sólido + fondo (15% opacidad) — el sólido para texto/íconos/
bordes de énfasis, el fondo para pills y filas de tabla:

| Estado | Variable sólida | Uso |
|---|---|---|
| Pendiente | `--estado-pendiente` (= `--color-warning`) | requiere acción del salón |
| Confirmada | `--estado-confirmada` (= `--color-info`) | agendada, sin llegar aún |
| En curso | `--estado-en-curso` (= `--accent`) | única vez que un estado toma el violet de marca — la cita activa es, literalmente, la acción primaria del momento |
| Completada | `--estado-completada` (= `--color-success`) | cerrada con éxito |
| Cancelada | `--estado-cancelada` (neutro, `--ink-subtle`) | sin penalidad — no es un "error", es una cancelación a tiempo |
| Cancelada tardía | `--estado-cancelada-tardia` (= `--color-error`) | penalidad aplicada (RN02) |
| No-show | `--estado-no-show` (= `--color-error`) | mismo tratamiento visual que cancelada tardía — ambas implican penalidad |

## Tipografía

Fuente: **Geist** (`--font-sans`), con fallback `Geist Fallback` para minimizar CLS mientras
carga la fuente variable.

Escala (`--text-2xs` a `--text-3xl`, 10px a 30px) pensada para tres necesidades distintas:
metadatos densos (2xs/xs), cuerpo de tablas y formularios (sm/base), y números que deben
"gritar" sin gritar en mayúsculas (2xl/3xl, siempre `--font-bold`, nunca decorados con color
extra — el tamaño y el peso ya hacen el trabajo).

## Espaciado y layout

Escala de 4px (`--space-1` = 4px hasta `--space-16` = 64px) — cualquier separación en el
producto debe caer en esta escala, nunca un valor arbitrario en píxeles sueltos.

`--sidebar-width: 240px` fijo, colapsable a `--sidebar-collapsed: 56px`. `--content-max-width:
1200px` evita que el contenido admin se estire sin límite en monitores anchos, pero el
contenido en sí **no** usa columnas uniformes dentro de ese ancho — ver Design Principles en
`docs/PRODUCT.md`.

## Sombras y radios

Las sombras (`--shadow-sm` a `--shadow-modal`) usan el mismo tono violet oscuro (`oklch(0.12
0.038 288 / alpha)`) en vez de negro puro — un detalle sutil que hace que la profundidad se
sienta parte de la identidad de marca en vez de un efecto de UI genérico.

Radios (`--radius-sm` 4px a `--radius-2xl` 24px, más `--radius-full` para pills/avatares) — se
evita deliberadamente el border-radius exagerado uniforme que caracteriza al "SaaS-cream"
(ver anti-referencias en `docs/PRODUCT.md`): los radios varían por tipo de elemento, no son
todos iguales.

## Z-index

Escala explícita para evitar guerras de `z-index` ad-hoc: `--z-dropdown: 100`, `--z-sticky:
200`, `--z-modal-backdrop: 300`, `--z-modal: 400`, `--z-toast: 500`, `--z-tooltip: 600`.

## Motion

Framer Motion se usa exclusivamente para **comunicar estado**, nunca para decorar:

- Cambio de estado de una cita → transición de color con leve escala, no un fade genérico.
- Carga de listas (agenda, dashboard) → stagger sutil que comunica "esto es un sistema vivo
  procesando datos", no un efecto de aparición porque sí.
- Todo el motion respeta `prefers-reduced-motion` — se reemplaza por transiciones instantáneas
  o de opacidad mínima, nunca se elimina el feedback de estado por completo.

## Accesibilidad

WCAG 2.1 AA: contraste mínimo 4.5:1 para texto de cuerpo, 3:1 para texto grande y UI. Los pares
`--ink-*` sobre `--surface-*` y `--sidebar-ink-*` sobre `--surface-sidebar` están calibrados
para cumplir esto — no crear combinaciones nuevas sin verificar contraste. Ver
`docs/PRODUCT.md` para el detalle de accesibilidad orientado a producto (contexto de uso real:
salón con luz variable, dispositivos compartidos).

## Utilidades globales

`.shimmer` (skeleton de carga con animación) y `.hide-scrollbar` (oculta la barra de scroll
manteniendo el scroll funcional) — definidas en `index.css`, reutilizar en vez de recrear el
efecto.
