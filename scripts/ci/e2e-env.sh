#!/usr/bin/env bash

load_e2e_env_defaults() {
  local app_root="$1"
  local env_file="${app_root}/.env.e2e.example"

  if [[ -f "$env_file" ]]; then
    local line key value

    while IFS= read -r line || [[ -n "$line" ]]; do
      line="${line%$'\r'}"

      if [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]]; then
        continue
      fi

      line="${line#export }"

      if [[ "$line" != *=* ]]; then
        continue
      fi

      key="${line%%=*}"
      value="${line#*=}"
      key="${key//[[:space:]]/}"
      value="${value#"${value%%[![:space:]]*}"}"
      value="${value%"${value##*[![:space:]]}"}"

      if [[ "$value" == \"*\" && "$value" == *\" ]]; then
        value="${value:1:${#value}-2}"
      elif [[ "$value" == \'*\' && "$value" == *\' ]]; then
        value="${value:1:${#value}-2}"
      fi

      if [[ -n "$key" ]]; then
        printf -v "$key" '%s' "$value"
        export "$key"
      fi
    done < "$env_file"
  fi

  export POSTGRES_PORT="${POSTGRES_PORT:-55434}"
  export DB_BOOTSTRAP_TIMEOUT_SECONDS="${DB_BOOTSTRAP_TIMEOUT_SECONDS:-90}"
  export POSTGRES_DB="${POSTGRES_DB:-historical_source_atlas}"
  export POSTGRES_USER="${POSTGRES_USER:-atlas}"
  export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-atlas_password}"
  export DATABASE_URL="${DATABASE_URL:-postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@127.0.0.1:${POSTGRES_PORT}/${POSTGRES_DB}?schema=public}"
  export AUTH_SECRET="${AUTH_SECRET:-e2e-auth-secret-0123456789abcdef}"
  export SITE_URL="${SITE_URL:-http://127.0.0.1:3006}"
  export AUTH_URL="${AUTH_URL:-$SITE_URL}"
  export NEXTAUTH_URL="${NEXTAUTH_URL:-$SITE_URL}"
  export EMAIL_PROVIDER="${EMAIL_PROVIDER:-smtp}"
  export EMAIL_FROM="${EMAIL_FROM:-no-reply@example.com}"
  export MAILPIT_BASE_URL="${MAILPIT_BASE_URL:-http://127.0.0.1:8025}"
  export SMTP_HOST="${SMTP_HOST:-127.0.0.1}"
  export SMTP_PORT="${SMTP_PORT:-1025}"
  export SMTP_USER="${SMTP_USER:-e2e}"
  export SMTP_PASSWORD="${SMTP_PASSWORD:-e2e}"
  export SMTP_SECURE="${SMTP_SECURE:-false}"
  export MINIO_API_PORT="${MINIO_API_PORT:-9000}"
  export MINIO_CONSOLE_PORT="${MINIO_CONSOLE_PORT:-9001}"
  export MINIO_ROOT_USER="${MINIO_ROOT_USER:-minioadmin}"
  export MINIO_ROOT_PASSWORD="${MINIO_ROOT_PASSWORD:-minioadmin}"
  export MINIO_BUCKET="${MINIO_BUCKET:-profile-images}"
  export PROFILE_IMAGE_STORAGE_BUCKET="${PROFILE_IMAGE_STORAGE_BUCKET:-$MINIO_BUCKET}"
  export PROFILE_IMAGE_STORAGE_REGION="${PROFILE_IMAGE_STORAGE_REGION:-us-east-1}"
  export PROFILE_IMAGE_STORAGE_ENDPOINT="${PROFILE_IMAGE_STORAGE_ENDPOINT:-http://127.0.0.1:${MINIO_API_PORT}}"
  export PROFILE_IMAGE_STORAGE_ACCESS_KEY_ID="${PROFILE_IMAGE_STORAGE_ACCESS_KEY_ID:-$MINIO_ROOT_USER}"
  export PROFILE_IMAGE_STORAGE_SECRET_ACCESS_KEY="${PROFILE_IMAGE_STORAGE_SECRET_ACCESS_KEY:-$MINIO_ROOT_PASSWORD}"
  export PROFILE_IMAGE_PUBLIC_BASE_URL="${PROFILE_IMAGE_PUBLIC_BASE_URL:-${PROFILE_IMAGE_STORAGE_ENDPOINT%/}/${PROFILE_IMAGE_STORAGE_BUCKET}}"
  export PROFILE_IMAGE_STORAGE_FORCE_PATH_STYLE="${PROFILE_IMAGE_STORAGE_FORCE_PATH_STYLE:-true}"
  export INTERNAL_CRON_SECRET="${INTERNAL_CRON_SECRET:-e2e-internal-cron-secret}"
}
