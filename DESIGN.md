# Design

## Overview

Welve es una herramienta de gestión de citas para Eunoia Beauty Salon (Lima, Perú). El sistema visual refleja la calidad del salón: elegante, preciso, cálido. Usa una arquitectura de superficie dividida — sidebar oscuro (Haiti) para navegación permanente, contenido claro (Blue Chalk) para la tarea en curso. El violet eléctrico ancla las acciones primarias y el estado de selección. El amarillo Turbo aparece solo en señales de alta energía (alertas críticas, recompensas de fidelización).

## Design Language

**Strategy:** Committed en el sidebar (Haiti lleva ~30% de la superficie de pantalla); Restrained en el panel de contenido. El acento violet lleva acciones primarias y estado activo — no decoración.

**Physical scene:** Tres actores: la admin en escritorio tras mostrador, la especialista en tablet entre tratamientos, la clienta en móvil buscando disponibilidad. La UI debe sentirse como la recepción del salón: ordenada, acogedora, eficiente.

**Register:** product

## Colors

Todos los valores de color en OKLCH. El oklch() nativo es compatible con todos los navegadores modernos (Chromium 111+, Firefox 116+, Safari 16.4+).

### Primitives

```css
/* Marca */
--color-violet-50:   oklch(0.97 0.015 285);   /* #F5F3FF  Blue Chalk  */
--color-violet-100:  oklch(0.93 0.028 284);
--color-violet-200:  oklch(0.87 0.055 284);
--color-violet-300:  oklch(0.78 0.098 284);
--color-violet-400:  oklch(0.67 0.158 285);
--color-violet-500:  oklch(0.51 0.261 286);   /* #834DFB  Electric Violet */
--color-violet-600:  oklch(0.45 0.230 286);
--color-violet-700:  oklch(0.38 0.190 287);
--color-violet-800:  oklch(0.30 0.140 288);
--color-violet-900:  oklch(0.20 0.075 288);
--color-violet-950:  oklch(0.12 0.038 288);   /* #18102B  Haiti */

/* Amarillo Turbo */
--color-turbo-400:   oklch(0.92 0.178 106);
--color-turbo-500:   oklch(0.877 0.196 105);  /* #F0E100  Turbo */
--color-turbo-600:   oklch(0.79 0.165 96);

/* Semánticos de estado */
--color-success-light: oklch(0.92 0.08 152);
--color-success:       oklch(0.58 0.155 152);
--color-success-dark:  oklch(0.38 0.12 152);

--color-warning-light: oklch(0.95 0.08 88);
--color-warning:       oklch(0.76 0.17 72);
--color-warning-dark:  oklch(0.52 0.14 68);

--color-error-light:   oklch(0.94 0.06 22);
--color-error:         oklch(0.57 0.21 22);
--color-error-dark:    oklch(0.40 0.17 22);

--color-info-light:    oklch(0.93 0.06 245);
--color-info:          oklch(0.56 0.17 245);
--color-info-dark:     oklch(0.39 0.13 245);
```

### Roles semánticos

```css
/* Superficies */
--surface-bg:        oklch(0.97 0.015 285);   /* contenido principal */
--surface-base:      oklch(0.99 0.006 285);   /* tarjetas sobre bg */
--surface-raised:    oklch(1 0 0);            /* modales, popovers */
--surface-sidebar:   oklch(0.12 0.038 288);   /* sidebar */
--surface-sidebar-hover: oklch(0.17 0.050 287);
--surface-sidebar-active: oklch(0.22 0.065 286);

/* Texto en superficies claras */
--ink-strong:    oklch(0.15 0.025 285);   /* títulos, datos clave */
--ink-base:      oklch(0.28 0.020 285);   /* cuerpo */
--ink-muted:     oklch(0.48 0.018 285);   /* labels secundarios */
--ink-subtle:    oklch(0.66 0.012 285);   /* placeholders */

/* Texto en sidebar oscuro */
--sidebar-ink-strong:  oklch(0.94 0.010 285);
--sidebar-ink-base:    oklch(0.75 0.018 285);
--sidebar-ink-muted:   oklch(0.52 0.018 286);

/* Bordes */
--border-subtle:   oklch(0.90 0.018 284);
--border-base:     oklch(0.83 0.025 284);
--border-strong:   oklch(0.65 0.045 284);
--sidebar-border:  oklch(0.22 0.048 287);

/* Acento primario (violet) */
--accent:           oklch(0.51 0.261 286);   /* Electric Violet */
--accent-hover:     oklch(0.47 0.245 286);
--accent-active:    oklch(0.43 0.228 286);
--accent-subtle:    oklch(0.93 0.028 284);   /* fondos de pill activo */
--accent-foreground: oklch(1 0 0);           /* texto sobre acento */

/* Acento secundario (turbo — solo estados de alta energía) */
--turbo:          oklch(0.877 0.196 105);
--turbo-subtle:   oklch(0.95 0.065 106);
```

### Estados de cita

Los estados de cita son la verdad central del sistema. Cada estado tiene un rol semántico visual propio.

```css
--estado-pendiente:    oklch(0.76 0.17 72);    /* warning amber */
--estado-confirmada:   oklch(0.56 0.17 245);   /* info blue */
--estado-en-curso:     oklch(0.51 0.261 286);  /* accent violet */
--estado-completada:   oklch(0.58 0.155 152);  /* success green */
--estado-cancelada:    oklch(0.66 0.012 285);  /* muted */
--estado-cancelada-tardia: oklch(0.57 0.21 22); /* error red */
--estado-no-show:      oklch(0.57 0.21 22);    /* error red */
```

## Typography

**Fuente:** Geist Sans (Vercel). Import vía CDN:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

O vía paquete npm: `npm install geist`

**Escala:** Fixed rem (no fluid para UI de producto).

```css
--font-family-base: 'Geist', 'Geist Fallback', ui-sans-serif, system-ui, sans-serif;

/* Escala tipográfica (ratio 1.2) */
--text-2xs:  0.625rem;   /* 10px — badges, timestamps densos */
--text-xs:   0.75rem;    /* 12px — labels de metadato */
--text-sm:   0.875rem;   /* 14px — cuerpo de sidebar, labels de formulario */
--text-base: 1rem;       /* 16px — cuerpo principal */
--text-lg:   1.125rem;   /* 18px — subtítulos de sección */
--text-xl:   1.25rem;    /* 20px — títulos de panel */
--text-2xl:  1.5rem;     /* 24px — títulos de página */
--text-3xl:  1.875rem;   /* 30px — KPIs del dashboard admin */

/* Pesos */
--font-regular: 400;
--font-medium:  500;
--font-semibold: 600;
--font-bold: 700;

/* Tracking */
--tracking-tight:  -0.02em;  /* títulos de página */
--tracking-base:    0em;     /* cuerpo */
--tracking-wide:    0.04em;  /* labels de estado uppercase (usar con moderación) */

/* Altura de línea */
--leading-tight:  1.25;   /* títulos */
--leading-snug:   1.375;  /* subtítulos, celdas de tabla */
--leading-normal: 1.5;    /* cuerpo */
--leading-relaxed: 1.625; /* párrafos en vistas de cliente */
```

**Convenciones:**
- `text-wrap: balance` en h1–h3.
- Una sola familia (Geist) en todos los pesos. Sin pairing serif/display para UI.
- Labels de estado: `font-size: var(--text-xs); font-weight: var(--font-medium); letter-spacing: 0;` — nunca uppercase+tracking como patrón repetido.

## Spacing

Escala de 4px base.

```css
--space-1:  0.25rem;   /* 4px */
--space-2:  0.5rem;    /* 8px */
--space-3:  0.75rem;   /* 12px */
--space-4:  1rem;      /* 16px */
--space-5:  1.25rem;   /* 20px */
--space-6:  1.5rem;    /* 24px */
--space-8:  2rem;      /* 32px */
--space-10: 2.5rem;    /* 40px */
--space-12: 3rem;      /* 48px */
--space-16: 4rem;      /* 64px */

/* Sidebar */
--sidebar-width: 240px;
--sidebar-collapsed: 56px;
--sidebar-padding: var(--space-4);

/* Contenido */
--content-padding: var(--space-6);
--content-max-width: 1200px;
```

## Radii

```css
--radius-sm:   4px;    /* inputs pequeños, badges */
--radius-base: 8px;    /* cards, botones, inputs */
--radius-lg:   12px;   /* modales, paneles */
--radius-full: 9999px; /* pills, avatares */
```

## Shadows

Una sola sombra o ninguna por elemento. Nunca borde + sombra grande juntos.

```css
--shadow-sm:  0 1px 3px oklch(0.12 0.038 288 / 0.10);
--shadow-base: 0 2px 6px oklch(0.12 0.038 288 / 0.12);
--shadow-lg:  0 4px 16px oklch(0.12 0.038 288 / 0.10);
--shadow-modal: 0 8px 32px oklch(0.12 0.038 288 / 0.18);
```

## Z-index

```css
--z-dropdown:       100;
--z-sticky:         200;
--z-modal-backdrop: 300;
--z-modal:          400;
--z-toast:          500;
--z-tooltip:        600;
```

## Layout

**App shell:** sidebar fijo (240px) a la izquierda, área de contenido scrolleable a la derecha.

```
┌─────────────────────────────────────────────────┐
│  Sidebar 240px   │  Content area (flex-grow)    │
│  bg: Haiti       │  bg: Blue Chalk              │
│  dark surface    │  padding: 24px               │
│                  │  max-width: 1200px            │
└─────────────────────────────────────────────────┘
```

- Mobile (< 768px): sidebar como drawer. Contenido a pantalla completa.
- Tablet (768–1024px): sidebar colapsable a iconos (56px).
- Desktop (> 1024px): sidebar expandido por defecto.

**Grid de contenido:** `repeat(auto-fit, minmax(280px, 1fr))` para secciones de resumen. Tablas a ancho completo.

## Components

### Botones

Tres variantes:

| Variante | Fondo | Texto | Uso |
|----------|-------|-------|-----|
| Primary | `--accent` | `--accent-foreground` | Una acción por pantalla |
| Secondary | `--surface-base` + `--border-base` | `--ink-base` | Acción alternativa |
| Ghost | transparente | `--ink-muted` | Acciones terciarias, sidebar |

- Padding: `var(--space-2) var(--space-4)` (sm) / `var(--space-3) var(--space-5)` (base)
- Border-radius: `var(--radius-base)`
- Un solo tipo de borde (sin border + shadow simultáneos en botones primarios)
- Hover: ligero shift de fondo (-2 steps en L); Active: -3 steps
- Focus: outline 2px solid `--accent`, offset 2px

### Formularios

- Input: `--surface-base` bg, `--border-base` border, `--radius-base`, `--text-sm`
- Placeholder: `--ink-subtle` (debe cumplir 4.5:1 — usar oklch(0.66 0.012 285) como mínimo)
- Focus: border `--accent`, sin glow difuso adicional
- Error: border `--error`, mensaje de error en `--text-xs` bajo el campo
- Disabled: opacity 0.5, cursor not-allowed

### Sidebar

```
Eunoia ─────────────── [avatar]
────────────────────────────
▣ Dashboard                 (activo: --surface-sidebar-active, texto: --sidebar-ink-strong)
📅 Agenda
👤 Clientes
💸 Pagos
⚙  Configuración
────────────────────────────
[Cerrar sesión]
```

- Nav items: `--radius-base`, padding `var(--space-3) var(--space-4)`
- Activo: `--surface-sidebar-active`, acento violet en indicador de 3px (izq), texto `--sidebar-ink-strong`
- Hover: `--surface-sidebar-hover`

### Estado Badges

Inline pill con color semántico de estado. Sin iconos adicionales salvo `no_show` y `cancelada_tardia`.

```css
.estado-badge {
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
  /* color y bg según --estado-* */
}
```

### Tablas

- Cabecera: `--text-xs`, `--font-semibold`, `--ink-muted`, `border-bottom: 1px solid var(--border-base)`
- Filas: `--text-sm`, hover `oklch(0.93 0.028 284 / 0.5)`
- Celdas de acción: alineadas a la derecha, visibles solo en hover de fila (opacity 0→1)
- Densidad: `padding: var(--space-3) var(--space-4)` por celda
- Sin border en cada celda; solo separador horizontal entre filas

### Skeletons / Loading

- Fondo: `--border-subtle` con shimmer `oklch(1 0 0 / 0.6)` sweeping 1.5s
- Reemplazar todo el contenido de datos, nunca spinner en medio de contenido ya cargado

### Estados vacíos

Dos tipos:
- **Vacío neutro** (sin citas hoy): ilustración SVG geométrica abstracta + texto orientativo + CTA
- **Vacío de error**: icono de alerta + mensaje específico + acción de reintentar

Sin sketchy SVG. Sin "nothing here yet" como texto final.

## Motion

**Motor:** Framer Motion (ya instalado en el proyecto).

### Tokens de duración y easing

```ts
export const duration = {
  instant: 0,
  fast: 150,
  base: 220,
  slow: 350,
  enter: 300,
  exit: 200,
} as const;

export const ease = {
  out: [0.16, 1, 0.3, 1],      // ease-out-expo
  in: [0.76, 0, 0.24, 1],      // ease-in-expo
  inOut: [0.76, 0, 0.24, 1],
} as const;
```

### Patrones

**Transición de ruta:** `AnimatePresence` con fade + translateY(8px→0) en enter; fade-out rápido (200ms) en exit.

**Cards y list items:** Al montar un listado, stagger de 40ms entre ítems — solo en la primera carga, no en cada re-render.

**Botones primarios:** scale(0.97) en `whileTap`. No en botones de destructive action (psicología: no recompensar acciones de riesgo).

**Sidebar:** Width transition suave (240px↔56px) con `ease-out-expo`, 300ms. Íconos con fade cross-dissolve en labels.

**Modal/Dialog:** Scale 0.95→1 + opacity 0→1, 220ms ease-out. Backdrop fade 150ms.

**Estado de cita (cambio inline):** Color badge cross-fade, 200ms.

```ts
// Reducción de motion — envolver TODAS las variantes de Framer Motion:
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// En variantes: usar opacity-only transitions cuando sea true
```

## Iconografía

**Librería:** Lucide React (ligera, consistente, TSX-native). Peso: `strokeWidth={1.5}`. Tamaño base: 16px en inline, 20px en navegación, 24px en estados vacíos.

Sin mezclar estilos de ícono. Sin SVG custom salvo logo.

## Accesibilidad

- WCAG 2.1 AA
- Contraste mínimo: 4.5:1 texto/fondo (verificar especialmente texto muted sobre White Chalk)
  - `--ink-base` (oklch 0.28) sobre `--surface-bg` (oklch 0.97): ratio ≈ 11:1 ✓
  - `--ink-muted` (oklch 0.48) sobre `--surface-bg` (oklch 0.97): ratio ≈ 5.1:1 ✓
  - `--ink-subtle` (oklch 0.66) sobre `--surface-bg` (oklch 0.97): ratio ≈ 3.2:1 — **solo para placeholders**, no cuerpo
  - `--sidebar-ink-base` (oklch 0.75) sobre Haiti (oklch 0.12): ratio ≈ 8.2:1 ✓
- Focus: outline visible en todos los elementos interactivos
- Labels: todos los inputs tienen `<label>` asociado; iconos sin texto tienen `aria-label`
- Roles ARIA para estados de loading, error y éxito en formularios
