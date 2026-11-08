#!/usr/bin/env bash
set -Eeuo pipefail

# ---------------------------------------------------------------------------
# Despliegue reproducible de MinerTrack.
#
# Uso:
#   cp .env.example .env.deploy   # completar valores reales
#   ./deploy.sh
# ---------------------------------------------------------------------------

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$ROOT_DIR/apps/api"
WEB_DIR="$ROOT_DIR/apps/web"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env.deploy}"
VERCEL_CLI_VERSION="${VERCEL_CLI_VERSION:-65.12.1}"
CURRENT_STEP="inicio"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/miningtracks-deploy.XXXXXX")"

if [[ -t 1 ]]; then
  BOLD="\033[1m"
  CYAN="\033[1;36m"
  GREEN="\033[1;32m"
  YELLOW="\033[1;33m"
  RED="\033[1;31m"
  RESET="\033[0m"
else
  BOLD=""
  CYAN=""
  GREEN=""
  YELLOW=""
  RED=""
  RESET=""
fi

cleanup() {
  local exit_code=$?
  rm -rf "$TMP_DIR"

  if [[ $exit_code -ne 0 ]]; then
    printf "\n${RED}[deploy] Falló el paso: %s (código de salida %s)${RESET}\n" \
      "$CURRENT_STEP" "$exit_code" >&2
  fi
}

trap cleanup EXIT

step() {
  CURRENT_STEP="$1"
  printf "\n${CYAN}==> %s${RESET}\n" "$1"
}

ok() {
  printf "${GREEN}    OK${RESET} %s\n" "$1"
}

warn() {
  printf "${YELLOW}    AVISO${RESET} %s\n" "$1"
}

fail() {
  printf "\n${RED}[deploy] ERROR:${RESET} %s\n" "$1" >&2
  exit 1
}

vercel_cli() {
  npx --yes "vercel@$VERCEL_CLI_VERSION" "$@"
}

load_env_file() {
  local file="$1"
  local line key value

  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%$'\r'}"
    [[ "$line" =~ ^[[:space:]]*$ ]] && continue
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    line="${line#export }"
    key="${line%%=*}"
    [[ "$key" == "$line" ]] && continue
    value="${line#*=}"

    key="${key#"${key%%[![:space:]]*}"}"
    key="${key%"${key##*[![:space:]]}"}"

    if [[ "$value" == \"*\" && "$value" == *\" ]]; then
      value="${value:1:${#value}-2}"
    elif [[ "$value" == \'*\' && "$value" == *\' ]]; then
      value="${value:1:${#value}-2}"
    fi

    export "$key=$value"
  done < "$file"
}

derive_direct_url() {
  local url="$1"
  printf '%s' "${url/-pooler./.}"
}

strip_trailing_slash() {
  local value="$1"
  while [[ "$value" == */ ]]; do
    value="${value%/}"
  done
  printf '%s' "$value"
}

require_var() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    fail "Falta la variable $name. Revisa .env.deploy (plantilla: .env.example)."
  fi
}

set_default() {
  local name="$1"
  local value="$2"
  if [[ -z "${!name:-}" ]]; then
    export "$name=$value"
  fi
}

ensure_project() {
  local project="$1"

  if vercel_cli project inspect "$project" \
    --scope "$VERCEL_SCOPE" --token "$VERCEL_TOKEN" --json >/dev/null 2>&1; then
    ok "Proyecto Vercel existente: $project"
    return
  fi

  printf "    Creando proyecto Vercel: %s\n" "$project"
  if ! vercel_cli project create "$project" \
    --scope "$VERCEL_SCOPE" --token "$VERCEL_TOKEN" >/dev/null; then
    fail "No se pudo crear el proyecto '$project'. Verifica VERCEL_SCOPE y los permisos del token."
  fi
  ok "Proyecto Vercel creado: $project"
}

link_project() {
  local directory="$1"
  local project="$2"

  if ! (cd "$directory" && vercel_cli link --yes --project "$project" \
    --scope "$VERCEL_SCOPE" --token "$VERCEL_TOKEN" >/dev/null); then
    fail "No se pudo vincular $project al directorio ${directory#$ROOT_DIR/}."
  fi
}

latest_production_deployment() {
  local project="$1"
  local output

  output="$(vercel_cli list "$project" --environment production --status READY \
    --limit 5 --json --scope "$VERCEL_SCOPE" --token "$VERCEL_TOKEN" 2>/dev/null || true)"

  [[ -z "$output" ]] && return 0

  printf '%s' "$output" | node -e '
    let raw = "";
    process.stdin.on("data", (chunk) => (raw += chunk));
    process.stdin.on("end", () => {
      try {
        const parsed = JSON.parse(raw);
        const items = Array.isArray(parsed)
          ? parsed
          : parsed.deployments || parsed.data || [];
        const production = items.find(
          (item) =>
            (item.target === "production" || item.environment === "production") &&
            (item.state === "READY" || item.readyState === "READY"),
        );
        if (production) {
          process.stdout.write(production.uid || production.id || production.url || "");
        }
      } catch {
        // Sin deployment previo disponible.
      }
    });
  '
}

discover_public_url() {
  local project="$1"
  local output

  output="$(vercel_cli project inspect "$project" \
    --scope "$VERCEL_SCOPE" --token "$VERCEL_TOKEN" --json 2>/dev/null || true)"

  [[ -z "$output" ]] && return 0

  printf '%s' "$output" | node -e '
    const raw = require("fs").readFileSync(0, "utf8");
    const project = process.argv[1];
    try {
      const parsed = JSON.parse(raw);
      const domains = new Set();
      const walk = (value) => {
        if (typeof value === "string") {
          const match = value.match(/^(?:https?:\/\/)?([a-z0-9.-]+\.vercel\.app)\/?$/i);
          if (match) domains.add(match[1].toLowerCase());
          return;
        }
        if (Array.isArray(value)) {
          value.forEach(walk);
          return;
        }
        if (value && typeof value === "object") {
          Object.values(value).forEach(walk);
        }
      };
      walk(parsed);
      const all = [...domains];
      const exact = all.find((domain) => domain === `${project}.vercel.app`);
      const named = all.find((domain) => domain.startsWith(`${project}-`));
      const chosen = exact || named || all[0] || "";
      if (chosen) process.stdout.write(`https://${chosen}`);
    } catch {
      // Fallback al dominio por defecto.
    }
  ' "$project"
}

sync_env() {
  local project="$1"
  local key="$2"
  local value="$3"
  local visibility="$4"

  vercel_cli env remove "$key" --environment production --yes \
    --project "$project" --scope "$VERCEL_SCOPE" --token "$VERCEL_TOKEN" \
    >/dev/null 2>&1 || true

  local args=(
    env add "$key"
    --environment production
    --value "$value"
    --yes
    --project "$project"
    --scope "$VERCEL_SCOPE"
    --token "$VERCEL_TOKEN"
  )

  if [[ "$visibility" == "secret" ]]; then
    args+=(--sensitive)
  else
    args+=(--no-sensitive)
  fi

  if ! vercel_cli "${args[@]}" >/dev/null; then
    fail "No se pudo configurar $key en el proyecto $project."
  fi

  ok "$project: $key sincronizado"
}

wait_for_api_health() {
  local url="$1"
  local attempts="${2:-30}"
  local attempt

  for ((attempt = 1; attempt <= attempts; attempt++)); do
    if curl -fsS --max-time 10 "$url" -o "$TMP_DIR/health.json" 2>/dev/null; then
      if node -e '
        const fs = require("fs");
        const payload = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
        process.exit(payload.status === "ok" && payload.database === "up" ? 0 : 1);
      ' "$TMP_DIR/health.json" 2>/dev/null; then
        return 0
      fi
    fi
    sleep 2
  done

  return 1
}

wait_for_web() {
  local url="$1"
  local attempts="${2:-30}"
  local attempt

  for ((attempt = 1; attempt <= attempts; attempt++)); do
    if curl -fsS --max-time 10 "$url" -o "$TMP_DIR/web.html" 2>/dev/null; then
      if grep -q 'id="root"' "$TMP_DIR/web.html"; then
        return 0
      fi
    fi
    sleep 2
  done

  return 1
}

extract_deployment_url() {
  local log_file="$1"
  grep -Eo 'https://[A-Za-z0-9._-]+\.vercel\.app' "$log_file" 2>/dev/null | tail -n 1 || true
}

rollback_project() {
  local directory="$1"
  local label="$2"
  local deployment_id="$3"

  if [[ -z "$deployment_id" ]]; then
    warn "No hay un despliegue anterior de $label para hacer rollback."
    return 1
  fi

  step "Revirtiendo $label al despliegue anterior"
  if (cd "$directory" && vercel_cli rollback "$deployment_id" --yes \
    --scope "$VERCEL_SCOPE" --token "$VERCEL_TOKEN"); then
    ok "Rollback de $label completado."
    return 0
  fi

  warn "El rollback automático de $label no se pudo completar. Revisa el dashboard de Vercel."
  return 1
}

# ---------------------------------------------------------------------------
# 1. Variables de entorno
# ---------------------------------------------------------------------------
step "Cargando variables de entorno"

if [[ -f "$ENV_FILE" ]]; then
  load_env_file "$ENV_FILE"
  ok "Variables cargadas desde ${ENV_FILE#$ROOT_DIR/}"
else
  warn "No existe ${ENV_FILE#$ROOT_DIR/}. Se usarán variables exportadas en la terminal."
fi

require_var DATABASE_URL
require_var VERCEL_TOKEN
require_var VERCEL_SCOPE
if [[ -z "${DIRECT_URL:-}" ]]; then
  DIRECT_URL="$(derive_direct_url "$DATABASE_URL")"
  ok "DIRECT_URL derivada de DATABASE_URL (sin -pooler)"
fi
set_default API_PROJECT_NAME "mining-equipment-api"
set_default WEB_PROJECT_NAME "mining-equipment-web"
API_PUBLIC_URL="$(strip_trailing_slash "${API_PUBLIC_URL:-}")"
WEB_PUBLIC_URL="$(strip_trailing_slash "${WEB_PUBLIC_URL:-}")"

for project_var in API_PROJECT_NAME WEB_PROJECT_NAME; do
  project_value="${!project_var}"
  if [[ ! "$project_value" =~ ^[a-z0-9][a-z0-9-]*$ ]]; then
    fail "$project_var debe usar minúsculas, números y guiones (valor actual: $project_value)."
  fi
done

ok "Configuración de despliegue válida"
printf "    API: %s\n" "$API_PROJECT_NAME"
printf "    Web: %s\n" "$WEB_PROJECT_NAME"

# ---------------------------------------------------------------------------
# 2. Herramientas necesarias
# ---------------------------------------------------------------------------
step "Verificando herramientas"

for tool in node npm git curl npx; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    fail "Falta la herramienta '$tool'. Instálala antes de continuar."
  fi
done

if ! node -e '
  const [major, minor] = process.versions.node.split(".").map(Number);
  process.exit(major > 20 || (major === 20 && minor >= 19) ? 0 : 1);
'; then
  fail "Se requiere Node.js >= 20.19 (actual: $(node --version))."
fi

ok "Node.js $(node --version)"
ok "npm $(npm --version)"
ok "git $(git --version | awk '{print $3}')"

VERCEL_VERSION_OUTPUT="$(vercel_cli --version 2>&1 | tail -n 1)"
ok "Vercel CLI $VERCEL_VERSION_OUTPUT"

VERCEL_USER="$(vercel_cli whoami --token "$VERCEL_TOKEN" 2>/dev/null || true)"
if [[ -z "$VERCEL_USER" ]]; then
  fail "VERCEL_TOKEN inválido o sin acceso. Genera uno en https://vercel.com/account/tokens."
fi
ok "Autenticado en Vercel como $VERCEL_USER"

# ---------------------------------------------------------------------------
# 3. Dependencias
# ---------------------------------------------------------------------------
step "Instalando dependencias"

if ! npm ci --prefix "$API_DIR" --no-audit --no-fund; then
  fail "Falló npm ci del backend."
fi
ok "Dependencias del backend instaladas"

if ! npm ci --prefix "$WEB_DIR" --no-audit --no-fund; then
  fail "Falló npm ci del frontend."
fi
ok "Dependencias del frontend instaladas"

# ---------------------------------------------------------------------------
# 4. Base de datos
# ---------------------------------------------------------------------------
step "Verificando conexión a PostgreSQL"

if ! printf 'SELECT 1;\n' | (cd "$API_DIR" && ./node_modules/.bin/prisma db execute \
  --stdin --schema=prisma/schema.prisma) >"$TMP_DIR/db-check.log" 2>&1; then
  cat "$TMP_DIR/db-check.log" >&2
  fail "No se pudo conectar a PostgreSQL. Revisa DATABASE_URL/DIRECT_URL."
fi
ok "PostgreSQL responde"

# ---------------------------------------------------------------------------
# 5. Calidad
# ---------------------------------------------------------------------------
step "Ejecutando typecheck y pruebas unitarias"

if ! (cd "$API_DIR" && npm run typecheck); then
  fail "Typecheck del backend falló."
fi
if ! (cd "$API_DIR" && npm run test); then
  fail "Pruebas del backend fallaron."
fi
if ! (cd "$WEB_DIR" && npm run typecheck); then
  fail "Typecheck del frontend falló."
fi
if ! (cd "$WEB_DIR" && npm run test); then
  fail "Pruebas del frontend fallaron."
fi
ok "Typecheck y pruebas unitarias aprobados"

if [[ "${RUN_INTEGRATION_TESTS:-0}" == "1" ]]; then
  step "Ejecutando pruebas de integración"

  require_var TEST_DATABASE_URL
  if [[ "$TEST_DATABASE_URL" == "$DATABASE_URL" ]]; then
    fail "TEST_DATABASE_URL no puede ser igual a la base de producción."
  fi

  if ! (cd "$API_DIR" \
    && DATABASE_URL="$TEST_DATABASE_URL" DIRECT_URL="$TEST_DATABASE_URL" \
      npm run db:migrate:deploy \
    && TEST_DATABASE_URL="$TEST_DATABASE_URL" npm run test:integration); then
    fail "Las pruebas de integración fallaron."
  fi
  ok "Pruebas de integración aprobadas"
fi

# ---------------------------------------------------------------------------
# 6. Build local
# ---------------------------------------------------------------------------
step "Construyendo backend y frontend"

if ! (cd "$API_DIR" && npm run build); then
  fail "El build del backend falló."
fi
ok "Backend compilado"

if ! (cd "$WEB_DIR" && VITE_API_URL="${API_PUBLIC_URL:-http://localhost:3001}" npm run build); then
  fail "El build del frontend falló."
fi
ok "Frontend compilado"

# ---------------------------------------------------------------------------
# 7. Migraciones
# ---------------------------------------------------------------------------
step "Aplicando migraciones de base de datos"

if ! (cd "$API_DIR" && npm run db:migrate:deploy); then
  fail "Las migraciones fallaron. No se publicó ningún servicio."
fi
ok "Migraciones aplicadas (idempotente)"

# ---------------------------------------------------------------------------
# 8. Proyectos de Vercel
# ---------------------------------------------------------------------------
step "Preparando proyectos de Vercel"

ensure_project "$API_PROJECT_NAME"
ensure_project "$WEB_PROJECT_NAME"
link_project "$API_DIR" "$API_PROJECT_NAME"
link_project "$WEB_DIR" "$WEB_PROJECT_NAME"
ok "Directorios vinculados a sus proyectos de Vercel"

if [[ -z "$API_PUBLIC_URL" ]]; then
  API_PUBLIC_URL="$(discover_public_url "$API_PROJECT_NAME")"
fi
if [[ -z "$WEB_PUBLIC_URL" ]]; then
  WEB_PUBLIC_URL="$(discover_public_url "$WEB_PROJECT_NAME")"
fi
set_default API_PUBLIC_URL "https://$API_PROJECT_NAME.vercel.app"
set_default WEB_PUBLIC_URL "https://$WEB_PROJECT_NAME.vercel.app"

ok "URL del backend: $API_PUBLIC_URL"
ok "URL del frontend: $WEB_PUBLIC_URL"

PREVIOUS_API_DEPLOYMENT="$(latest_production_deployment "$API_PROJECT_NAME")"
PREVIOUS_WEB_DEPLOYMENT="$(latest_production_deployment "$WEB_PROJECT_NAME")"

step "Sincronizando variables de entorno en Vercel"
sync_env "$API_PROJECT_NAME" DATABASE_URL "$DATABASE_URL" secret
sync_env "$API_PROJECT_NAME" DIRECT_URL "$DIRECT_URL" secret
sync_env "$API_PROJECT_NAME" WEB_ORIGIN "$WEB_PUBLIC_URL" config
sync_env "$WEB_PROJECT_NAME" VITE_API_URL "$API_PUBLIC_URL" config

# ---------------------------------------------------------------------------
# 9. Backend
# ---------------------------------------------------------------------------
step "Publicando backend en producción"

API_DEPLOY_LOG="$TMP_DIR/api-deploy.log"
if ! (cd "$API_DIR" && vercel_cli deploy --prod --yes \
  --scope "$VERCEL_SCOPE" --token "$VERCEL_TOKEN") 2>&1 | tee "$API_DEPLOY_LOG"; then
  fail "El despliegue del backend falló. Revisa el log anterior."
fi

step "Comprobando salud del backend"

if ! wait_for_api_health "$API_PUBLIC_URL/health"; then
  CANDIDATE_URL="$(extract_deployment_url "$API_DEPLOY_LOG")"
  if [[ -n "$CANDIDATE_URL" && "$CANDIDATE_URL" != "$API_PUBLIC_URL" ]] \
    && wait_for_api_health "$CANDIDATE_URL/health"; then
    warn "La URL configurada no respondió; se usará $CANDIDATE_URL. Define API_PUBLIC_URL para fijarla."
    API_PUBLIC_URL="$CANDIDATE_URL"
    sync_env "$WEB_PROJECT_NAME" VITE_API_URL "$API_PUBLIC_URL" config
  else
    rollback_project "$API_DIR" "backend" "$PREVIOUS_API_DEPLOYMENT" || true
    fail "El backend no pasó /health después del despliegue."
  fi
fi

ok "Backend saludable: $API_PUBLIC_URL/health"

CORS_HEADERS="$(curl -sS -D - -o /dev/null \
  -H "Origin: $WEB_PUBLIC_URL" "$API_PUBLIC_URL/api/equipments" || true)"
if ! grep -qi "access-control-allow-origin: *$WEB_PUBLIC_URL" <<<"$CORS_HEADERS"; then
  fail "El backend responde, pero CORS no permite $WEB_PUBLIC_URL. Define WEB_PUBLIC_URL correctamente y vuelve a ejecutar."
fi
ok "CORS permite el origen del frontend"

# ---------------------------------------------------------------------------
# 10. Frontend
# ---------------------------------------------------------------------------
step "Publicando frontend en producción"

WEB_DEPLOY_LOG="$TMP_DIR/web-deploy.log"
if ! (cd "$WEB_DIR" && vercel_cli deploy --prod --yes \
  --scope "$VERCEL_SCOPE" --token "$VERCEL_TOKEN") 2>&1 | tee "$WEB_DEPLOY_LOG"; then
  rollback_project "$WEB_DIR" "frontend" "$PREVIOUS_WEB_DEPLOYMENT" || true
  fail "El despliegue del frontend falló."
fi

step "Comprobando frontend publicado"

if ! wait_for_web "$WEB_PUBLIC_URL"; then
  CANDIDATE_URL="$(extract_deployment_url "$WEB_DEPLOY_LOG")"
  if [[ -n "$CANDIDATE_URL" && "$CANDIDATE_URL" != "$WEB_PUBLIC_URL" ]] \
    && wait_for_web "$CANDIDATE_URL"; then
    warn "La URL configurada no respondió; se usará $CANDIDATE_URL. Define WEB_PUBLIC_URL para fijarla."
    WEB_PUBLIC_URL="$CANDIDATE_URL"
  else
    rollback_project "$WEB_DIR" "frontend" "$PREVIOUS_WEB_DEPLOYMENT" || true
    fail "El frontend no respondió después del despliegue."
  fi
fi

ok "Frontend saludable: $WEB_PUBLIC_URL"

# ---------------------------------------------------------------------------
# 11. Verificación final
# ---------------------------------------------------------------------------
step "Verificación final"

if ! wait_for_api_health "$API_PUBLIC_URL/health" 10; then
  fail "El backend dejó de responder durante la verificación final."
fi
if ! wait_for_web "$WEB_PUBLIC_URL" 10; then
  fail "El frontend dejó de responder durante la verificación final."
fi

COMMIT_SHA="$(git -C "$ROOT_DIR" rev-parse --short HEAD 2>/dev/null || printf 'sin-commit')"

printf "\n${GREEN}${BOLD}Despliegue completado${RESET}\n"
printf "\n  Frontend : %s\n" "$WEB_PUBLIC_URL"
printf "  Backend  : %s\n" "$API_PUBLIC_URL"
printf "  Health   : %s/health\n" "$API_PUBLIC_URL"
printf "  Commit   : %s\n\n" "$COMMIT_SHA"

CURRENT_STEP="completado"
