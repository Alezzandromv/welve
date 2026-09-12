# Diagrama de Paquetes

Vista más abstracta que `09_DIAGRAMA_DE_COMPONENTES.md`: agrupa los componentes de ese diagrama
en **paquetes** (carpetas con una responsabilidad única) y muestra únicamente las dependencias
entre paquetes, no entre archivos individuales. Notación UML formal: `package` como contenedor,
flecha punteada abierta para la dependencia (`«import»`/`«access»` implícito) — Mermaid no tiene
un tipo `packageDiagram`, así que se aproxima con `flowchart` y subgrafos anidados, igual que
`02_CASOS_DE_USO_UML.md` aproxima el diagrama de casos de uso.

Regla de lectura: una flecha `A --> B` significa "A depende de B" (A importa símbolos de B), no
al revés — igual que una flecha UML de dependencia.

## Backend (`backend/app/`)

```mermaid
flowchart TB
    subgraph routers["📦 routers"]
        routers_desc["auth · citas · admin · clientes<br/>servicios · fidelizacion · trabajador · usuarios"]
    end

    subgraph services["📦 services"]
        services_desc["auth_service · citas_service · clientes_service<br/>fidelizacion_service · pagos_service<br/>personal_service · servicios_service · usuarios_service"]
    end

    subgraph schemas["📦 schemas"]
        schemas_desc["Pydantic request/response<br/>separados de los modelos"]
    end

    subgraph models["📦 models"]
        models_desc["SQLAlchemy declarativo (Mapped/mapped_column)<br/>base · enums · una clase por entidad"]
    end

    subgraph core["📦 core"]
        core_desc["config (Settings) · security (JWT, requerir_rol)<br/>database (engine async, get_session)"]
    end

    subgraph tasks["📦 tasks"]
        tasks_desc["Celery app · db (sessionmaker perezoso)<br/>no_show · recordatorios"]
    end

    subgraph utils["📦 utils"]
        utils_desc["timezone · whatsapp · horarios"]
    end

    subgraph alembic_pkg["📦 alembic"]
        alembic_desc["migraciones · env.py"]
    end

    routers --> schemas
    routers --> services
    routers --> core
    services --> models
    services --> schemas
    services --> utils
    tasks --> models
    tasks --> core
    tasks --> utils
    alembic_pkg --> models
    alembic_pkg --> core
    core --> models

    classDef pkg fill:#fff,stroke:#333,stroke-width:1px
    class routers,services,schemas,models,core,tasks,utils,alembic_pkg pkg
```

- **`routers` → `schemas`/`services`/`core`**: un router solo enruta — recibe `Depends(core.*)`,
  valida contra un `schema` y delega toda la lógica a un `service` (ver convención en
  `CLAUDE.md`, sección "Convenciones → Python").
- **`services` → `models`/`schemas`/`utils`**: toda la lógica de negocio y las reglas RN01–RN15
  viven aquí — es el único paquete que construye/modifica instancias de `models` y el único que
  llama a `utils/whatsapp.py`.
- **`core` → `models`**: `core/database.py` no depende de un modelo específico (`Base.metadata`
  es genérico), pero `alembic/env.py` sí necesita `target_metadata = Base.metadata` para
  autogenerate — de ahí la flecha `alembic → models`.
- No hay flecha `models → services` ni `models → routers`: los modelos no conocen a quién los
  usa (dirección de dependencia correcta, de afuera hacia adentro).

## Frontend (`frontend/src/`)

```mermaid
flowchart TB
    subgraph pages["📦 pages"]
        pages_desc["admin/* · worker/* · client/* · auth/*<br/>una vista por ruta"]
    end

    subgraph components["📦 components"]
        components_desc["ProtectedRoute · CalendarioModerno<br/>compartidos entre pages"]
    end

    subgraph store["📦 store"]
        store_desc["useAuthStore (persist)<br/>useDashboardStore"]
    end

    subgraph services_fe["📦 services"]
        services_fe_desc["api.ts (Axios + interceptor JWT)<br/>*.service.ts por dominio"]
    end

    subgraph types["📦 types"]
        types_desc["interfaces IPrefijo<br/>index.ts + por dominio"]
    end

    pages --> components
    pages --> store
    pages --> services_fe
    pages --> types
    components --> store
    components --> types
    store --> services_fe
    services_fe --> types

    classDef pkg fill:#fff,stroke:#333,stroke-width:1px
    class pages,components,store,services_fe,types pkg
```

- **`pages` es el único paquete "hoja" del lado de arriba**: no lo importa nadie más — es
  correcto que un router (React Router v7, definido en `App.tsx`) sea el único consumidor.
- **`services` (frontend) → `types`**: cada `*.service.ts` tipa la respuesta de Axios contra la
  interfaz de dominio correspondiente antes de devolverla a quien lo llama.
- **`store` → `services`**: `useDashboardStore` llama a los `*.service.ts` de citas/pagos/
  personal para poblarse; no hay dependencia inversa (`services` nunca importa `store`).
- No hay flecha `types → *`: es el único paquete sin dependencias salientes, como corresponde a
  un paquete de solo definiciones.

## Dependencia entre los dos paquetes raíz

`backend` y `frontend` no se importan entre sí — la única relación es en tiempo de ejecución, vía
HTTP (`services/api.ts` → API REST expuesta por `routers`), fuera del alcance de un diagrama de
paquetes (esa relación ya está en `03_ARQUITECTURA_DEL_SISTEMA.md` y `10_DIAGRAMA_DE_DESPLIEGUE.md`).
