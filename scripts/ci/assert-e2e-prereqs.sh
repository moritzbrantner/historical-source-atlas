#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd -- "${SCRIPT_DIR}/../.." && pwd)"

source "${SCRIPT_DIR}/e2e-env.sh"
load_e2e_env_defaults "$APP_ROOT"

missing=()

require_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    missing+=("$name")
  fi
}

require_env "DATABASE_URL"
require_env "AUTH_SECRET"

if [[ -z "${AUTH_URL:-}" && -z "${NEXTAUTH_URL:-}" ]]; then
  missing+=("AUTH_URL or NEXTAUTH_URL")
fi

if [[ "${EMAIL_PROVIDER:-console}" == "resend" ]]; then
  require_env "RESEND_API_KEY"
  require_env "EMAIL_FROM"
fi

if [[ "${EMAIL_PROVIDER:-console}" == "mailpit" ]]; then
  require_env "MAILPIT_BASE_URL"
fi

require_env "PROFILE_IMAGE_STORAGE_BUCKET"
require_env "PROFILE_IMAGE_STORAGE_REGION"
require_env "PROFILE_IMAGE_STORAGE_ENDPOINT"
require_env "PROFILE_IMAGE_STORAGE_ACCESS_KEY_ID"
require_env "PROFILE_IMAGE_STORAGE_SECRET_ACCESS_KEY"
require_env "PROFILE_IMAGE_PUBLIC_BASE_URL"

if (( ${#missing[@]} > 0 )); then
  printf '❌ Missing required e2e environment values:\n' >&2
  for name in "${missing[@]}"; do
    printf '  - %s\n' "$name" >&2
  done
  exit 1
fi

if (( ${#AUTH_SECRET} < 32 )); then
  echo "❌ AUTH_SECRET must be at least 32 characters for the session store." >&2
  exit 1
fi

bun --eval '
  (async () => {
    const { Client } = require("pg");

    const connectionString = process.env.DATABASE_URL;
    const client = new Client({ connectionString });

    try {
      await client.connect();
      await client.query("SELECT 1");
    } catch (error) {
      console.error("❌ Unable to reach Postgres using DATABASE_URL.");
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    } finally {
      await client.end().catch(() => undefined);
    }
  })();
'

if [[ "${EMAIL_PROVIDER:-console}" == "mailpit" ]]; then
  bun --eval '
    (async () => {
      try {
        const response = await fetch(process.env.MAILPIT_BASE_URL + "/api/v1/info");
        if (response.ok) return;
        console.error("❌ Mailpit returned HTTP " + response.status + ".");
        process.exit(1);
      } catch (error) {
        console.error("❌ Unable to reach Mailpit using MAILPIT_BASE_URL.");
        console.error(error instanceof Error ? error.message : error);
        process.exit(1);
      }
    })();
  '
fi

bun --eval '
  (async () => {
    try {
      const endpoint = process.env.PROFILE_IMAGE_STORAGE_ENDPOINT.replace(/\/$/u, "");
      const response = await fetch(endpoint + "/minio/health/live");
      if (response.ok) return;
      console.error("❌ MinIO returned HTTP " + response.status + ".");
      process.exit(1);
    } catch (error) {
      console.error("❌ Unable to reach MinIO using PROFILE_IMAGE_STORAGE_ENDPOINT.");
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  })();
'

echo "✅ E2E prerequisites verified."
