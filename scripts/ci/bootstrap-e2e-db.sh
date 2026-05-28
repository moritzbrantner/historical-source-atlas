#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd -- "${SCRIPT_DIR}/../.." && pwd)"
COMPOSE_FILE_PATH="${APP_ROOT}/docker-compose.yml"
MARKER_FILE="${TMPDIR:-/tmp}/historical-source-atlas-e2e-db-bootstrap.started"

source "${SCRIPT_DIR}/e2e-env.sh"
load_e2e_env_defaults "$APP_ROOT"

BUN_BINARY="${BUN_BINARY:-bun}"

BOOTSTRAP_STARTED=0
STARTED_SERVICES=()
OBJECT_STORAGE_MANAGED=0

can_reach_database() {
  (
    cd "$APP_ROOT"
    "$BUN_BINARY" --eval '
      (async () => {
        const { Client } = require("pg");
        if (!process.env.DATABASE_URL) process.exit(1);

        const client = new Client({ connectionString: process.env.DATABASE_URL });

        try {
          await client.connect();
          await client.query("SELECT 1");
          process.exit(0);
        } catch {
          process.exit(1);
        } finally {
          await client.end().catch(() => undefined);
        }
      })();
    ' >/dev/null 2>&1
  )
}

docker_available() {
  command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1
}

docker_compose_available() {
  env -u COMPOSE_FILE docker compose version >/dev/null 2>&1
}

docker_compose() {
  env -u COMPOSE_FILE docker compose -f "$COMPOSE_FILE_PATH" --project-directory "$APP_ROOT" "$@"
}

container_name_for_service() {
  case "$1" in
    postgres)
      printf 'historical-source-atlas-postgres'
      ;;
    mailpit)
      printf 'historical-source-atlas-mailpit'
      ;;
    minio)
      printf 'historical-source-atlas-minio'
      ;;
    *)
      return 1
      ;;
  esac
}

compose_default_network_name() {
  printf 'historical-source-atlas_default'
}

expected_default_network_subnet() {
  awk '
    /^[[:space:]]+default:$/ { in_default = 1; next }
    in_default && /^[^[:space:]]/ { exit }
    in_default && /subnet:/ {
      sub(/^.*subnet:[[:space:]]*/, "")
      print
      exit
    }
  ' "$COMPOSE_FILE_PATH"
}

current_default_network_subnet() {
  docker network inspect "$(compose_default_network_name)" \
    --format '{{range .IPAM.Config}}{{.Subnet}}{{end}}' 2>/dev/null || true
}

default_network_has_active_endpoints() {
  local network_name
  network_name="$(compose_default_network_name)"

  [[ -n "$(docker network inspect "$network_name" \
    --format '{{range $id, $_ := .Containers}}{{$id}}{{end}}' 2>/dev/null || true)" ]]
}

assert_default_network_matches_compose() {
  local expected_subnet current_subnet
  expected_subnet="$(expected_default_network_subnet)"
  current_subnet="$(current_default_network_subnet)"

  if [[ -z "$expected_subnet" || -z "$current_subnet" ]]; then
    return 0
  fi

  if [[ "$expected_subnet" == "$current_subnet" ]]; then
    return 0
  fi

  if ! default_network_has_active_endpoints; then
    return 0
  fi

  cat >&2 <<EOF
❌ The existing $(compose_default_network_name) Docker network does not match docker-compose.yml.
   Current subnet:  ${current_subnet}
   Expected subnet: ${expected_subnet}

   Run:
     bun run services:down
   Then rerun:
     bun run test:with-services
EOF
  exit 1
}

remove_stale_named_containers() {
  local service container_name container_ids

  for service in "$@"; do
    if ! container_name="$(container_name_for_service "$service")"; then
      continue
    fi

    container_ids="$(docker ps -aq --filter "name=^/${container_name}$" 2>/dev/null || true)"

    if [[ -z "$container_ids" ]]; then
      continue
    fi

    echo "ℹ️ Removing stale e2e container ${container_name} before compose startup."
    docker rm -f $container_ids >/dev/null
  done
}

can_reach_mailpit() {
  "$BUN_BINARY" --eval '
    (async () => {
      const baseUrl = process.env.MAILPIT_BASE_URL;

      try {
        const response = await fetch(baseUrl + "/api/v1/info");
        process.exit(response.ok ? 0 : 1);
      } catch {
        process.exit(1);
      }
    })();
  ' >/dev/null 2>&1
}

can_reach_object_storage() {
  curl --silent --show-error --fail --max-time 5 "${PROFILE_IMAGE_STORAGE_ENDPOINT%/}/minio/health/live" >/dev/null 2>&1
}

force_managed_services() {
  [[ "${E2E_REUSE_SERVICES:-false}" != "true" ]] \
    && { [[ "${CI:-false}" == "true" ]] || [[ "${E2E_FORCE_MANAGED_SERVICES:-false}" == "true" ]]; }
}

cleanup_services() {
  if docker_available && docker_compose_available; then
    (
      cd "$APP_ROOT"
      docker_compose stop "${STARTED_SERVICES[@]}"
      docker_compose rm -f "${STARTED_SERVICES[@]}"
    )
    echo "✅ Compose cleanup complete."
  else
    echo "⚠️ Docker is not available for cleanup. Remove the services manually if still running."
  fi
}

teardown() {
  if [[ -f "$MARKER_FILE" ]]; then
    mapfile -t STARTED_SERVICES <"$MARKER_FILE"

    echo "ℹ️ Cleaning up compose services started by bootstrap script: ${STARTED_SERVICES[*]}"
    cleanup_services
    rm -f "$MARKER_FILE"
  elif [[ "${E2E_FORCE_MANAGED_SERVICES:-false}" == "true" ]]; then
    STARTED_SERVICES=("postgres" "mailpit" "minio")
    echo "ℹ️ No marker file found; cleaning compose-managed e2e services: ${STARTED_SERVICES[*]}"
    cleanup_services
  else
    echo "ℹ️ No bootstrap-owned compose services detected; skipping cleanup."
  fi
}

cleanup_on_error() {
  local exit_code=$?
  trap - EXIT

  if [[ $exit_code -ne 0 && $BOOTSTRAP_STARTED -eq 1 ]]; then
    echo "⚠️ Bootstrap failed after starting compose services; cleaning them up..."
    if docker_available && docker_compose_available; then
      (
        cd "$APP_ROOT"
        docker_compose stop "${STARTED_SERVICES[@]}"
        docker_compose rm -f "${STARTED_SERVICES[@]}"
      ) || true
    fi
    rm -f "$MARKER_FILE"
  fi

  exit "$exit_code"
}

if [[ "${1:-}" == "--teardown" ]]; then
  teardown
  exit 0
fi

trap cleanup_on_error EXIT

if force_managed_services; then
  echo "ℹ️ Using compose-managed e2e services."
  STARTED_SERVICES+=("postgres" "mailpit" "minio")
  OBJECT_STORAGE_MANAGED=1
else
  if can_reach_database; then
    echo "ℹ️ Reusing already-reachable Postgres instance from DATABASE_URL."
  else
    STARTED_SERVICES+=("postgres")
  fi

  if can_reach_mailpit; then
    echo "ℹ️ Reusing already-reachable Mailpit instance from ${MAILPIT_BASE_URL}."
  else
    STARTED_SERVICES+=("mailpit")
  fi

  if can_reach_object_storage; then
    echo "ℹ️ Reusing already-reachable object storage instance from ${PROFILE_IMAGE_STORAGE_ENDPOINT}."
  else
    STARTED_SERVICES+=("minio")
    OBJECT_STORAGE_MANAGED=1
  fi
fi

if (( ${#STARTED_SERVICES[@]} > 0 )); then
  COMPOSE_SERVICES=""

  if ! docker_available; then
    echo "❌ Required e2e services are unavailable, and Docker is not available." >&2
    echo "   Start Postgres/Mailpit yourself or run with Docker available." >&2
    exit 1
  fi

  if ! docker_compose_available; then
    echo "❌ Docker is available, but 'docker compose' is not." >&2
    exit 1
  fi

  if ! COMPOSE_SERVICES="$(
    cd "$APP_ROOT"
    docker_compose config --services
  )"; then
    echo "❌ Failed to read docker compose services from $COMPOSE_FILE_PATH." >&2
    exit 1
  fi

  for service in "${STARTED_SERVICES[@]}"; do
    if ! grep -Fxq "$service" <<<"$COMPOSE_SERVICES"; then
      echo "❌ docker compose service '$service' is not defined in $APP_ROOT." >&2
      exit 1
    fi
  done

  echo "ℹ️ Starting compose services for e2e bootstrap: ${STARTED_SERVICES[*]}"
  assert_default_network_matches_compose
  remove_stale_named_containers "${STARTED_SERVICES[@]}"
  (
    cd "$APP_ROOT"
    docker_compose up -d "${STARTED_SERVICES[@]}"
  )
  BOOTSTRAP_STARTED=1
  printf '%s\n' "${STARTED_SERVICES[@]}" >"$MARKER_FILE"
fi

echo "ℹ️ Waiting for Postgres readiness..."
(
  cd "$APP_ROOT"
  "$BUN_BINARY" --eval '
    (async () => {
      const { Client } = require("pg");
      const timeoutSeconds = Number(process.env.DB_BOOTSTRAP_TIMEOUT_SECONDS ?? "90");
      const start = Date.now();

      while (Date.now() - start < timeoutSeconds * 1_000) {
        const client = new Client({ connectionString: process.env.DATABASE_URL });

        try {
          await client.connect();
          await client.query("SELECT 1");
          console.log("✅ Postgres is ready.");
          process.exit(0);
        } catch {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } finally {
          await client.end().catch(() => undefined);
        }
      }

      console.error("❌ Timed out waiting for Postgres after " + timeoutSeconds + "s.");
      process.exit(1);
    })();
  '
)

echo "ℹ️ Waiting for Mailpit readiness..."
"$BUN_BINARY" --eval '
  (async () => {
    const timeoutSeconds = Number(process.env.DB_BOOTSTRAP_TIMEOUT_SECONDS ?? "90");
    const start = Date.now();

    while (Date.now() - start < timeoutSeconds * 1_000) {
      try {
        const response = await fetch(process.env.MAILPIT_BASE_URL + "/api/v1/info");

        if (response.ok) {
          console.log("✅ Mailpit is ready.");
          process.exit(0);
        }
      } catch {}

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.error("❌ Timed out waiting for Mailpit after " + timeoutSeconds + "s.");
    process.exit(1);
  })();
'

echo "ℹ️ Waiting for object storage readiness..."
"$BUN_BINARY" --eval '
  (async () => {
    const timeoutSeconds = Number(process.env.DB_BOOTSTRAP_TIMEOUT_SECONDS ?? "90");
    const endpoint = process.env.PROFILE_IMAGE_STORAGE_ENDPOINT.replace(/\/$/u, "");
    const start = Date.now();

    while (Date.now() - start < timeoutSeconds * 1_000) {
      try {
        const response = await fetch(endpoint + "/minio/health/live");

        if (response.ok) {
          console.log("✅ Object storage is ready.");
          process.exit(0);
        }
      } catch {}

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.error("❌ Timed out waiting for object storage after " + timeoutSeconds + "s.");
    process.exit(1);
  })();
'

if [[ "$OBJECT_STORAGE_MANAGED" -eq 1 ]] && docker_available && docker_compose_available; then
  echo "ℹ️ Ensuring object storage bucket exists..."
  (
    cd "$APP_ROOT"
    docker_compose run --rm -T minio-create-bucket
  )
  echo "✅ Object storage bucket is ready."
fi

echo "ℹ️ Applying migrations..."
(
  cd "$APP_ROOT"
  "$BUN_BINARY" run db:migrate
  "$BUN_BINARY" run db:atlas:migrate
)

echo "ℹ️ Seeding baseline e2e users..."
(
  cd "$APP_ROOT"
  "$BUN_BINARY" run db:seed:test-users
  "$BUN_BINARY" run db:atlas:seed
)

echo "✅ E2E DB bootstrap complete."
trap - EXIT
