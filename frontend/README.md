# Welve — Frontend

React + TypeScript + Vite. Ver `../CLAUDE.md` (raíz del repo) para el detalle completo de
arquitectura, convenciones y comandos — este archivo es solo un mapa rápido de `src/`.

## Comandos

```bash
npm install
npm run dev          # servidor de desarrollo (proxy /api → localhost:8000)
npm run build        # build de producción (incluye type check)
npx tsc --noEmit      # solo type check
npm run lint
```

## Estructura de `src/`

- `pages/auth/` — login y registro de staff (magic link para clientes vive en `pages/`)
- `pages/admin/` — rutas anidadas bajo `AdminLayout`
- `pages/worker/` — vista de agenda para trabajador (y admin)
- `pages/client/` — reservar y ver citas, solo rol cliente
- `components/` — componentes compartidos (`ProtectedRoute`, calendario, etc.)
- `store/` — Zustand (`useAuthStore` con persist, `useDashboardStore` sin persist)
- `services/` — llamadas Axios a la API, un archivo por recurso
- `types/` — interfaces con prefijo `I`, un archivo por dominio

Alias `@/` → `./src/` (configurado en `vite.config.ts`).

## Sistema de diseño

Variables CSS en `src/index.css` — nunca usar valores de color arbitrarios. Ver
`../docs/DESIGN.md` para el razonamiento detrás de los tokens.
