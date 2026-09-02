#!/usr/bin/env bash
# Levanta todo el stack de desarrollo de Welve en un solo comando:
#   ./dev.sh
#
# - Redis (docker compose) y el backend (uvicorn) quedan corriendo en segundo plano,
#   con logs en logs/backend.log — no hace nada si ya están arriba.
# - El frontend (Vite) corre en primer plano, para que veas su output y Codespaces
#   te ofrezca reenviar el puerto automáticamente.
#
# Para bajar el backend/redis del background: ./dev.sh stop
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
mkdir -p logs

if [ "${1:-}" = "stop" ]; then
  docker compose stop redis 2>/dev/null || true
  pkill -f "uvicorn app.main:app" 2>/dev/null || true
  echo "Backend y Redis detenidos."
  exit 0
fi

echo "==> Redis"
docker compose up -d redis

echo "==> Backend (uvicorn)"
if curl -s -o /dev/null -w "" http://localhost:8000/health 2>/dev/null; then
  echo "  ya está arriba en :8000"
else
  ( cd backend && nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > ../logs/backend.log 2>&1 & )
  for i in $(seq 1 15); do
    curl -s -o /dev/null http://localhost:8000/health 2>/dev/null && break
    sleep 1
  done
  echo "  arriba en :8000 (logs en logs/backend.log)"
fi

echo "==> Frontend (Vite) — Ctrl+C para salir (no afecta al backend/redis)"
cd frontend
npm run dev
