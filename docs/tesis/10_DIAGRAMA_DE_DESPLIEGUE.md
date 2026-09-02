# Diagrama de Despliegue

Nodos físicos/lógicos de infraestructura y el protocolo de comunicación entre ellos, para el
entorno de desarrollo actual (GitHub Codespaces) — la topología de producción real (fuera de
Codespaces) es la misma salvo por dónde corren el proceso web y el worker de Celery, que en
producción irían en su propio contenedor/servidor en vez de convivir en la misma máquina de
desarrollo.

```mermaid
flowchart TB
    subgraph DevBox["Nodo: GitHub Codespace (entorno de desarrollo)"]
        direction TB
        FE_proc["Proceso: Vite dev server<br/>(frontend, puerto 5173)"]
        BE_proc["Proceso: Uvicorn<br/>(FastAPI, puerto 8000, --reload)"]
        Worker["Proceso: Celery worker"]
        Beat["Proceso: Celery beat<br/>(scheduler)"]
        Redis[("Contenedor Docker: Redis<br/>(docker-compose.yml, puerto 6379)")]
    end

    subgraph Supabase["Nodo externo: Supabase (Postgres gestionado)"]
        Pooler["Supavisor<br/>(connection pooler, modo transacción,<br/>puerto 6543)"]
        PG[("Postgres 17<br/>(datos reales de la app)")]
        Pooler --> PG
    end

    subgraph Meta["Nodo externo: Meta / WhatsApp"]
        WA["WhatsApp Business<br/>Cloud API"]
    end

    subgraph GeminiNode["Nodo externo: Google «planeado»"]
        Gemini["Gemini API<br/>(análisis multimodal)"]
    end

    subgraph CulqiNode["Nodo externo: Culqi «planeado»"]
        Culqi["Culqi API<br/>(checkout + webhooks)"]
    end

    Browser(["Navegador del usuario<br/>(cliente/trabajador/admin)"])

    Browser -- "HTTPS" --> FE_proc
    FE_proc -- "HTTP (proxy /api → :8000, solo dev)" --> BE_proc
    BE_proc -- "asyncpg sobre TCP<br/>(statement_cache_size=0)" --> Pooler
    Worker -- "asyncpg sobre TCP" --> Pooler
    BE_proc -- "Redis protocol" --> Redis
    Worker -- "Redis protocol (broker)" --> Redis
    Beat -- "Redis protocol (encola tareas)" --> Redis
    Worker -.->|consume tareas| Beat

    BE_proc -- "HTTPS REST" --> WA
    BE_proc -. "HTTPS REST «planeado»" .-> Gemini
    BE_proc -. "HTTPS REST «planeado» (crear cargo)" .-> Culqi
    Culqi -. "HTTPS webhook «planeado» (Culqi llama a Welve)" .-> BE_proc

    classDef planeado stroke-dasharray: 5 5
    class GeminiNode,Gemini,CulqiNode,Culqi planeado
```

## Notas de despliegue

- **Por qué el pooler y no conexión directa**: Supabase resuelve por defecto solo IPv6 en la
  conexión directa (`db.<project_ref>.supabase.co:5432`), que falla en Codespaces (sin salida
  IPv6). El pooler (`aws-0-<region>.pooler.supabase.com:6543`) sí resuelve IPv4.
- **`statement_cache_size=0` es obligatorio** en cualquier conexión que pase por el pooler en
  modo transacción (PgBouncer) — sin este flag, asyncpg intenta reutilizar prepared statements
  entre requests que PgBouncer no garantiza que vuelvan a la misma conexión física de Postgres.
- **Worker y Beat como procesos separados del proceso web**: permite que una tarea larga (o un
  reintento de WhatsApp) no bloquee el hilo de eventos de FastAPI — se comunican solo a través
  de Redis como broker, nunca por llamada directa de función entre procesos.
- **El único actor secundario que abre una conexión *hacia* Welve** es Culqi (webhook) — todos
  los demás (WhatsApp, Gemini) son invocados por Welve, nunca al revés. Esto es relevant para el
  diseño de seguridad: el endpoint del webhook no puede depender de JWT de sesión (no hay
  usuario logueado del lado de Culqi) y debe validarse por firma criptográfica del payload.
- **Frontend en producción**: el proxy `/api` de Vite es solo de desarrollo (`vite.config.ts`);
  en un build de producción, `VITE_API_URL` apunta directo a la URL pública del backend — no hay
  proxy intermedio.
