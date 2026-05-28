#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd -- "${SCRIPT_DIR}/../.." && pwd)"

source "${SCRIPT_DIR}/e2e-env.sh"
load_e2e_env_defaults "$APP_ROOT"

BUN_BINARY="${BUN_BINARY:-bun}"
BUNX_BINARY="${BUNX_BINARY:-bunx}"

cleanup() {
  if [[ "${CI:-false}" == "true" ]]; then
    "${SCRIPT_DIR}/bootstrap-e2e-db.sh" --teardown
  fi
}

resolve_e2e_base_url() {
  "$BUN_BINARY" "${SCRIPT_DIR}/resolve-e2e-base-url.mjs"
}

trap cleanup EXIT

cd "$APP_ROOT"

E2E_BASE_URL="$(resolve_e2e_base_url)"
export E2E_BASE_URL
export SITE_URL="$E2E_BASE_URL"
export AUTH_URL="$E2E_BASE_URL"
export NEXTAUTH_URL="$E2E_BASE_URL"

if [[ "${SKIP_PLAYWRIGHT_INSTALL:-false}" != "true" ]]; then
  if [[ "${CI:-false}" == "true" ]] || sudo -n true >/dev/null 2>&1; then
    "$BUNX_BINARY" playwright install --with-deps chrome
  else
    echo "ℹ️ Passwordless sudo is unavailable; installing Playwright browser without system dependencies."
    "$BUNX_BINARY" playwright install chrome
  fi
fi

"${SCRIPT_DIR}/bootstrap-e2e-db.sh"
"${SCRIPT_DIR}/assert-e2e-prereqs.sh"
E2E_SKIP_GLOBAL_BOOTSTRAP=true E2E_SKIP_GLOBAL_TEARDOWN=true E2E_SKIP_PLAYWRIGHT_INSTALL=true "$BUN_BINARY" run test:e2e
