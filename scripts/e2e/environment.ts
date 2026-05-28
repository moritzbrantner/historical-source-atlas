import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  getComposeDatabaseUrl,
  getComposePostgresPort,
} from '@/src/testing/environment';

const DEFAULT_E2E_BASE_URL = 'http://127.0.0.1:3006';
const DEFAULT_MAILPIT_BASE_URL = 'http://127.0.0.1:8025';
const DEFAULT_SMTP_HOST = '127.0.0.1';
const DEFAULT_SMTP_PORT = '1025';
const DEFAULT_MINIO_HOST = '127.0.0.1';
const DEFAULT_MINIO_API_PORT = '9000';
const DEFAULT_MINIO_CONSOLE_PORT = '9001';
const DEFAULT_MINIO_ROOT_USER = 'minioadmin';
const DEFAULT_MINIO_ROOT_PASSWORD = 'minioadmin';
const DEFAULT_PROFILE_IMAGE_STORAGE_BUCKET = 'profile-images';
const DEFAULT_PROFILE_IMAGE_STORAGE_REGION = 'us-east-1';
const PROJECT_PROFILE_IMAGE_STORAGE_PLACEHOLDERS: Record<string, string> = {
  PROFILE_IMAGE_STORAGE_ENDPOINT: 'https://example.r2.cloudflarestorage.com',
  PROFILE_IMAGE_STORAGE_ACCESS_KEY_ID: 'replace-me',
  PROFILE_IMAGE_STORAGE_SECRET_ACCESS_KEY: 'replace-me',
  PROFILE_IMAGE_PUBLIC_BASE_URL: 'https://cdn.example.com/profile-images',
  PROFILE_IMAGE_STORAGE_FORCE_PATH_STYLE: 'false',
  PROFILE_IMAGE_STORAGE_REGION: 'auto',
};
const APP_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);

let cachedExampleEnvironment: Record<string, string> | null = null;
let cachedE2EExampleEnvironment: Record<string, string> | null = null;
let cachedProjectEnvironment: Record<string, string> | null = null;

function parseEnvFile(contents: string) {
  const environment: Record<string, string> = {};

  for (const line of contents.split(/\r?\n/u)) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }

    const match = trimmedLine.match(
      /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/u,
    );

    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    let value = rawValue.trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/u, '');
    }

    environment[key] = value;
  }

  return environment;
}

function loadExampleEnvironment(filename: '.env.example' | '.env.e2e.example') {
  const cache =
    filename === '.env.example'
      ? cachedExampleEnvironment
      : cachedE2EExampleEnvironment;

  if (cache) {
    return cache;
  }

  const examplePath = path.join(APP_ROOT, filename);
  const environment = parseEnvFile(readFileSync(examplePath, 'utf8'));

  if (filename === '.env.example') {
    cachedExampleEnvironment = environment;
  } else {
    cachedE2EExampleEnvironment = environment;
  }

  return environment;
}

function loadProjectEnvironment() {
  if (cachedProjectEnvironment) {
    return cachedProjectEnvironment;
  }

  const envPath = path.join(APP_ROOT, '.env');

  try {
    cachedProjectEnvironment = parseEnvFile(readFileSync(envPath, 'utf8'));
  } catch {
    cachedProjectEnvironment = {};
  }

  return cachedProjectEnvironment;
}

function getEnvironmentValue(
  key: string,
  exampleEnvironment: Record<string, string>,
  fallback?: string,
) {
  return process.env[key] ?? exampleEnvironment[key] ?? fallback;
}

function getE2EEnvironmentValue(
  key: string,
  e2eExampleEnvironment: Record<string, string>,
  exampleEnvironment: Record<string, string>,
  fallback?: string,
) {
  const processValue = process.env[key];
  const projectEnvironmentValue = loadProjectEnvironment()[key];
  const isStoragePlaceholder =
    processValue !== undefined &&
    isProjectProfileImageStoragePlaceholder(key, processValue);

  if (
    processValue !== undefined &&
    !isStoragePlaceholder &&
    (isProjectProfileImageStorageKey(key) ||
      processValue !== projectEnvironmentValue)
  ) {
    return processValue;
  }

  return (
    e2eExampleEnvironment[key] ??
    processValue ??
    exampleEnvironment[key] ??
    fallback
  );
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/u, '');
}

function isProjectProfileImageStorageKey(key: string) {
  return key in PROJECT_PROFILE_IMAGE_STORAGE_PLACEHOLDERS;
}

function isProjectProfileImageStoragePlaceholder(key: string, value: string) {
  const expectedValue = PROJECT_PROFILE_IMAGE_STORAGE_PLACEHOLDERS[key];

  if (!expectedValue || !hasProjectProfileImageStoragePlaceholderSignal()) {
    return false;
  }

  if (
    key === 'PROFILE_IMAGE_STORAGE_ENDPOINT' ||
    key === 'PROFILE_IMAGE_PUBLIC_BASE_URL'
  ) {
    return trimTrailingSlash(value) === trimTrailingSlash(expectedValue);
  }

  return value === expectedValue;
}

function hasProjectProfileImageStoragePlaceholderSignal() {
  return [
    'PROFILE_IMAGE_STORAGE_ENDPOINT',
    'PROFILE_IMAGE_STORAGE_ACCESS_KEY_ID',
    'PROFILE_IMAGE_STORAGE_SECRET_ACCESS_KEY',
    'PROFILE_IMAGE_PUBLIC_BASE_URL',
  ].some((key) => {
    const value = process.env[key];
    const expectedValue = PROJECT_PROFILE_IMAGE_STORAGE_PLACEHOLDERS[key];

    if (value === undefined || expectedValue === undefined) {
      return false;
    }

    if (
      key === 'PROFILE_IMAGE_STORAGE_ENDPOINT' ||
      key === 'PROFILE_IMAGE_PUBLIC_BASE_URL'
    ) {
      return trimTrailingSlash(value) === trimTrailingSlash(expectedValue);
    }

    return value === expectedValue;
  });
}

export function getE2EBaseURL() {
  return process.env.E2E_BASE_URL ?? DEFAULT_E2E_BASE_URL;
}

export function createE2EEnvironment(baseURL = getE2EBaseURL()) {
  const exampleEnvironment = loadExampleEnvironment('.env.example');
  const e2eExampleEnvironment = loadExampleEnvironment('.env.e2e.example');
  const minioApiPort = getE2EEnvironmentValue(
    'MINIO_API_PORT',
    e2eExampleEnvironment,
    exampleEnvironment,
    DEFAULT_MINIO_API_PORT,
  );
  const storageBucket = getEnvironmentValue(
    'MINIO_BUCKET',
    e2eExampleEnvironment,
    getE2EEnvironmentValue(
      'PROFILE_IMAGE_STORAGE_BUCKET',
      e2eExampleEnvironment,
      exampleEnvironment,
      DEFAULT_PROFILE_IMAGE_STORAGE_BUCKET,
    ),
  );
  const storageEndpoint = getE2EEnvironmentValue(
    'PROFILE_IMAGE_STORAGE_ENDPOINT',
    e2eExampleEnvironment,
    exampleEnvironment,
    `http://${DEFAULT_MINIO_HOST}:${minioApiPort}`,
  );
  const storagePublicBaseUrl = getE2EEnvironmentValue(
    'PROFILE_IMAGE_PUBLIC_BASE_URL',
    e2eExampleEnvironment,
    exampleEnvironment,
    `${storageEndpoint.replace(/\/$/u, '')}/${storageBucket}`,
  );
  const minioRootUser = getE2EEnvironmentValue(
    'MINIO_ROOT_USER',
    e2eExampleEnvironment,
    exampleEnvironment,
    DEFAULT_MINIO_ROOT_USER,
  );
  const minioRootPassword = getE2EEnvironmentValue(
    'MINIO_ROOT_PASSWORD',
    e2eExampleEnvironment,
    exampleEnvironment,
    DEFAULT_MINIO_ROOT_PASSWORD,
  );

  return {
    ...exampleEnvironment,
    ...process.env,
    E2E_BASE_URL: baseURL,
    DATABASE_URL: process.env.DATABASE_URL ?? getComposeDatabaseUrl(),
    AUTH_SECRET: getEnvironmentValue('AUTH_SECRET', exampleEnvironment),
    SITE_URL: baseURL,
    AUTH_URL: baseURL,
    NEXTAUTH_URL: baseURL,
    EMAIL_PROVIDER: 'smtp',
    EMAIL_FROM: getE2EEnvironmentValue(
      'EMAIL_FROM',
      e2eExampleEnvironment,
      exampleEnvironment,
      'no-reply@example.com',
    ),
    MAILPIT_BASE_URL: getE2EEnvironmentValue(
      'MAILPIT_BASE_URL',
      e2eExampleEnvironment,
      exampleEnvironment,
      DEFAULT_MAILPIT_BASE_URL,
    ),
    SMTP_HOST: getE2EEnvironmentValue(
      'SMTP_HOST',
      e2eExampleEnvironment,
      exampleEnvironment,
      DEFAULT_SMTP_HOST,
    ),
    SMTP_PORT: getE2EEnvironmentValue(
      'SMTP_PORT',
      e2eExampleEnvironment,
      exampleEnvironment,
      DEFAULT_SMTP_PORT,
    ),
    SMTP_USER: getE2EEnvironmentValue(
      'SMTP_USER',
      e2eExampleEnvironment,
      exampleEnvironment,
      'e2e',
    ),
    SMTP_PASSWORD: getE2EEnvironmentValue(
      'SMTP_PASSWORD',
      e2eExampleEnvironment,
      exampleEnvironment,
      'e2e',
    ),
    SMTP_SECURE: getE2EEnvironmentValue(
      'SMTP_SECURE',
      e2eExampleEnvironment,
      exampleEnvironment,
      'false',
    ),
    INTERNAL_CRON_SECRET: getE2EEnvironmentValue(
      'INTERNAL_CRON_SECRET',
      e2eExampleEnvironment,
      exampleEnvironment,
      'e2e-internal-cron-secret',
    ),
    POSTGRES_PORT: process.env.POSTGRES_PORT ?? getComposePostgresPort(),
    MINIO_API_PORT: minioApiPort,
    MINIO_CONSOLE_PORT: getE2EEnvironmentValue(
      'MINIO_CONSOLE_PORT',
      e2eExampleEnvironment,
      exampleEnvironment,
      DEFAULT_MINIO_CONSOLE_PORT,
    ),
    MINIO_ROOT_USER: minioRootUser,
    MINIO_ROOT_PASSWORD: minioRootPassword,
    MINIO_BUCKET: storageBucket,
    PROFILE_IMAGE_STORAGE_BUCKET: getE2EEnvironmentValue(
      'PROFILE_IMAGE_STORAGE_BUCKET',
      e2eExampleEnvironment,
      exampleEnvironment,
      storageBucket,
    ),
    PROFILE_IMAGE_STORAGE_REGION: getE2EEnvironmentValue(
      'PROFILE_IMAGE_STORAGE_REGION',
      e2eExampleEnvironment,
      exampleEnvironment,
      DEFAULT_PROFILE_IMAGE_STORAGE_REGION,
    ),
    PROFILE_IMAGE_STORAGE_ENDPOINT: storageEndpoint,
    PROFILE_IMAGE_STORAGE_ACCESS_KEY_ID: getE2EEnvironmentValue(
      'PROFILE_IMAGE_STORAGE_ACCESS_KEY_ID',
      e2eExampleEnvironment,
      exampleEnvironment,
      minioRootUser,
    ),
    PROFILE_IMAGE_STORAGE_SECRET_ACCESS_KEY: getE2EEnvironmentValue(
      'PROFILE_IMAGE_STORAGE_SECRET_ACCESS_KEY',
      e2eExampleEnvironment,
      exampleEnvironment,
      minioRootPassword,
    ),
    PROFILE_IMAGE_PUBLIC_BASE_URL: storagePublicBaseUrl,
    PROFILE_IMAGE_STORAGE_FORCE_PATH_STYLE: getE2EEnvironmentValue(
      'PROFILE_IMAGE_STORAGE_FORCE_PATH_STYLE',
      e2eExampleEnvironment,
      exampleEnvironment,
      'true',
    ),
  };
}

export function applyE2EEnvironment(baseURL = getE2EBaseURL()) {
  Object.assign(process.env, createE2EEnvironment(baseURL));
}
