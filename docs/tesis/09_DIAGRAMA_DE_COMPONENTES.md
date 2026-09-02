# Diagrama de Componentes

Componentes de software y sus dependencias de compilación/import — no confundir con el
diagrama de despliegue (`10_DIAGRAMA_DE_DESPLIEGUE.md`), que es sobre nodos físicos.

## Backend (`backend/app/`)

```mermaid
flowchart TB
    subgraph Routers["Componente: Routers (presentación)"]
        R_auth["auth.py"]
        R_citas["citas.py"]
        R_admin["admin.py"]
        R_clientes["clientes.py"]
        R_servicios["servicios.py"]
        R_fidelizacion["fidelizacion.py"]
        R_trabajador["trabajador.py"]
        R_usuarios["usuarios.py"]
        R_ia["ia.py «planeado»"]
        R_webhooks["webhooks.py «planeado»"]
    end

    subgraph Security["Componente: Seguridad (transversal)"]
        Sec["core/security.py"]
    end

    subgraph Services["Componente: Services (negocio)"]
        Svc_auth["auth_service"]
        Svc_citas["citas_service"]
        Svc_clientes["clientes_service"]
        Svc_fidelizacion["fidelizacion_service"]
        Svc_pagos["pagos_service"]
        Svc_personal["personal_service"]
        Svc_servicios["servicios_service"]
        Svc_usuarios["usuarios_service"]
        Svc_ia["ia_service «planeado»"]
        Svc_catalogo["catalogo_service «planeado»"]
        Svc_pasarela["pasarela_service «planeado»"]
    end

    subgraph Models["Componente: Modelos (persistencia)"]
        Mod["models/*.py<br/>(SQLAlchemy declarativo)"]
    end

    subgraph Utils["Componente: Utilidades"]
        U_wa["utils/whatsapp.py"]
        U_tz["utils/timezone.py"]
        U_hh["utils/horarios.py"]
        U_gm["utils/gemini_client.py «planeado»"]
    end

    subgraph Tasks["Componente: Tareas asíncronas"]
        T_noshow["tasks/no_show.py"]
        T_record["tasks/recordatorios.py"]
        T_nivel["tasks/recalcular_niveles.py «planeado»"]
        T_db["tasks/db.py"]
    end

    subgraph Core["Componente: Configuración y datos"]
        C_config["core/config.py"]
        C_db["core/database.py"]
    end

    Routers --> Security
    Routers --> Services
    Services --> Models
    Services --> Utils
    Models --> C_db
    Svc_auth --> U_wa
    Svc_fidelizacion --> U_wa
    Svc_ia --> U_gm
    Tasks --> Models
    Tasks --> T_db
    T_db --> C_config
    C_db --> C_config
    Sec --> C_config

    classDef planeado stroke-dasharray: 5 5
    class R_ia,R_webhooks,Svc_ia,Svc_catalogo,Svc_pasarela,U_gm,T_nivel planeado
```

## Frontend (`frontend/src/`)

```mermaid
flowchart TB
    subgraph Pages["Componente: Pages (una vista por ruta)"]
        P_admin["pages/admin/*"]
        P_worker["pages/worker/*"]
        P_client["pages/client/*"]
        P_auth["pages/auth/*"]
    end

    subgraph Shared["Componente: Componentes compartidos"]
        C_protected["ProtectedRoute"]
        C_calendar["CalendarioModerno"]
        C_camara["CamaraConsulta «planeado»"]
        C_grid["GridEstilos «planeado»"]
        C_checkout["CheckoutCulqi «planeado»"]
    end

    subgraph Store["Componente: Estado (Zustand)"]
        S_auth["useAuthStore (persist)"]
        S_dash["useDashboardStore"]
    end

    subgraph Services["Componente: Servicios HTTP"]
        Svc_api["api.ts (Axios + interceptor JWT)"]
        Svc_dom["*.service.ts por dominio"]
    end

    subgraph Types["Componente: Tipos"]
        Ty["types/*.ts (interfaces IPrefijo)"]
    end

    Pages --> Shared
    Pages --> Store
    Pages --> Svc_dom
    Svc_dom --> Svc_api
    Svc_dom --> Ty
    Store --> Svc_dom

    classDef planeado stroke-dasharray: 5 5
    class C_camara,C_grid,C_checkout planeado
```

## Interfaces expuestas entre componentes (contrato)

| Componente proveedor | Interfaz | Componente consumidor |
|---|---|---|
| `core/security.py` | `obtener_usuario_actual()`, `requerir_rol(*roles)` (dependencias FastAPI) | todos los `routers/*.py` |
| `core/database.py` | `get_session()` (dependencia FastAPI, `AsyncSession`) | todos los `routers/*.py` vía `Depends` |
| `services/*.py` | funciones async puras (reciben `session` como primer parámetro) | `routers/*.py` |
| `models/*.py` | clases SQLAlchemy declarativas | `services/*.py`, `alembic/env.py` |
| `services/api.ts` | instancia Axios configurada | todo `services/*.service.ts` del frontend |
| `store/useAuthStore.ts` | `token`, `usuario`, `setAuth()`, `cerrarSesion()` | `ProtectedRoute`, todas las `pages/*` |
