const DEFAULT_POSTGRES_PORT = '55434';
const DEFAULT_DATABASE_NAME = 'historical_source_atlas';
const DEFAULT_DATABASE_USER = 'atlas';
const DEFAULT_DATABASE_PASSWORD = 'atlas_password';
const DEFAULT_DATABASE_HOST = '127.0.0.1';

export function getComposePostgresPort() {
  return process.env.POSTGRES_PORT ?? DEFAULT_POSTGRES_PORT;
}

export function getComposeDatabaseUrl() {
  return `postgresql://${DEFAULT_DATABASE_USER}:${DEFAULT_DATABASE_PASSWORD}@${DEFAULT_DATABASE_HOST}:${getComposePostgresPort()}/${DEFAULT_DATABASE_NAME}?schema=public`;
}

export function applyVitestEnvironment() {
  process.env.POSTGRES_PORT ??= DEFAULT_POSTGRES_PORT;
  process.env.DATABASE_URL ??= getComposeDatabaseUrl();
}
