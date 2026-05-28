#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd -- "${SCRIPT_DIR}/../.." && pwd)"

cleanup() {
  "${SCRIPT_DIR}/bootstrap-e2e-db.sh" --teardown || true
}

trap cleanup EXIT INT TERM

cd "$APP_ROOT"

"${SCRIPT_DIR}/bootstrap-e2e-db.sh"

bun run db:atlas:seed
bun run db:atlas:seed

echo "Atlas seed idempotency check passed."
