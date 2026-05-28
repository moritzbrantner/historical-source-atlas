#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd -- "${SCRIPT_DIR}/../.." && pwd)"
WORKSPACE_ROOT="$(cd -- "${APP_ROOT}/.." && pwd)"
MAPS_ROOT="${WORKSPACE_ROOT}/maps"
EXPECTED_BUN_VERSION="1.3.14"

actual_bun_version="$(bun --version)"

if [[ "$actual_bun_version" != "$EXPECTED_BUN_VERSION" ]]; then
  cat >&2 <<EOF
Expected Bun ${EXPECTED_BUN_VERSION}, but found ${actual_bun_version}.
Install the Bun version pinned by packageManager before installing dependencies.
EOF
  exit 1
fi

if [[ ! -f "${MAPS_ROOT}/package.json" ]]; then
  cat >&2 <<EOF
Missing sibling maps checkout at ${MAPS_ROOT}.
This repository currently depends on file:../maps packages. Checkout the maps
repository next to historical-source-atlas before installing dependencies.
EOF
  exit 1
fi

echo "Installing sibling maps dependencies..."
(
  cd "$MAPS_ROOT"
  bun install --frozen-lockfile
)

echo "Installing historical-source-atlas dependencies..."
(
  cd "$APP_ROOT"
  bun install --frozen-lockfile
)
