#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ ! -d "$ROOT_DIR/apps/api/node_modules" || ! -d "$ROOT_DIR/apps/web/node_modules" ]]; then
  echo "Faltan dependencias. Ejecuta primero: npm run install:all" >&2
  echo "o instala con: npm ci --prefix apps/api && npm ci --prefix apps/web" >&2
  exit 1
fi

cleanup() {
  trap - INT TERM EXIT
  kill 0 2>/dev/null || true
}
trap cleanup INT TERM EXIT

echo "API:  http://localhost:3001"
echo "Web:  http://localhost:5173"
echo "Pulsa Ctrl+C para detener ambos procesos."

(
  cd "$ROOT_DIR/apps/api"
  npm run dev
) &
(
  cd "$ROOT_DIR/apps/web"
  npm run dev
) &

wait
