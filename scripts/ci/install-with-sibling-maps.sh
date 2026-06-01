#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd -- "${SCRIPT_DIR}/../.." && pwd)"
WORKSPACE_ROOT="$(cd -- "${APP_ROOT}/.." && pwd)"
MAPS_ROOT="${WORKSPACE_ROOT}/maps"
PLATFORM_PACKAGES_ROOT="${WORKSPACE_ROOT}/platform-packages"
RUST_PACKAGES_ROOT="${WORKSPACE_ROOT}/rust-packages"
TIMELINE_EDITOR_ROOT="${WORKSPACE_ROOT}/timeline-editor"
EXPECTED_BUN_VERSION="1.3.14"

actual_bun_version="$(bun --version)"

if [[ "$actual_bun_version" != "$EXPECTED_BUN_VERSION" ]]; then
  cat >&2 <<EOF
Expected Bun ${EXPECTED_BUN_VERSION}, but found ${actual_bun_version}.
Install the Bun version pinned by packageManager before installing dependencies.
EOF
  exit 1
fi

missing_sibling=0

for sibling_path in \
  "${MAPS_ROOT}" \
  "${PLATFORM_PACKAGES_ROOT}" \
  "${RUST_PACKAGES_ROOT}" \
  "${TIMELINE_EDITOR_ROOT}"; do
  if [[ -f "${sibling_path}/package.json" ]]; then
    continue
  fi

  cat >&2 <<EOF
Missing sibling checkout at ${sibling_path}.
EOF
  missing_sibling=1
done

if [[ "$missing_sibling" -ne 0 ]]; then
  cat >&2 <<EOF
This repository currently depends on sibling file: packages. Checkout maps,
platform-packages, rust-packages, and timeline-editor next to
historical-source-atlas before installing dependencies.
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
