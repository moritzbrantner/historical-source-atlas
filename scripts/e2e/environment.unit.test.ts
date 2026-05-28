import { afterEach, describe, expect, it } from 'vitest';

import { createE2EEnvironment } from '@/scripts/e2e/environment';

const originalEnv = { ...process.env };

function restoreEnv() {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) {
      delete process.env[key];
    }
  }

  Object.assign(process.env, originalEnv);
}

function clearE2EEnvironment() {
  for (const key of [
    'AUTH_SECRET',
    'DATABASE_URL',
    'E2E_BASE_URL',
    'EMAIL_FROM',
    'EMAIL_PROVIDER',
    'INTERNAL_CRON_SECRET',
    'MAILPIT_BASE_URL',
    'MINIO_API_PORT',
    'MINIO_BUCKET',
    'MINIO_CONSOLE_PORT',
    'MINIO_ROOT_PASSWORD',
    'MINIO_ROOT_USER',
    'NEXTAUTH_URL',
    'POSTGRES_DB',
    'POSTGRES_PORT',
    'POSTGRES_PASSWORD',
    'POSTGRES_USER',
    'PROFILE_IMAGE_PUBLIC_BASE_URL',
    'PROFILE_IMAGE_STORAGE_ACCESS_KEY_ID',
    'PROFILE_IMAGE_STORAGE_BUCKET',
    'PROFILE_IMAGE_STORAGE_ENDPOINT',
    'PROFILE_IMAGE_STORAGE_FORCE_PATH_STYLE',
    'PROFILE_IMAGE_STORAGE_REGION',
    'PROFILE_IMAGE_STORAGE_SECRET_ACCESS_KEY',
    'SITE_URL',
    'AUTH_URL',
    'SMTP_HOST',
    'SMTP_PASSWORD',
    'SMTP_PORT',
    'SMTP_SECURE',
    'SMTP_USER',
  ]) {
    delete process.env[key];
  }
}

describe('e2e environment', () => {
  afterEach(() => {
    restoreEnv();
  });

  it('uses .env.example as the baseline for missing e2e values', () => {
    clearE2EEnvironment();

    const environment = createE2EEnvironment();

    expect(environment.AUTH_SECRET).toBe('replace-with-a-long-random-secret');
    expect(environment.INTERNAL_CRON_SECRET).toBe('e2e-internal-cron-secret');
    expect(environment.EMAIL_FROM).toBe('no-reply@example.com');
    expect(environment.MAILPIT_BASE_URL).toBe('http://127.0.0.1:8025');
    expect(environment.SMTP_HOST).toBe('127.0.0.1');
    expect(environment.SMTP_PORT).toBe('1025');
    expect(environment.SMTP_USER).toBe('e2e');
    expect(environment.SMTP_PASSWORD).toBe('e2e');
    expect(environment.SMTP_SECURE).toBe('false');
    expect(environment.MINIO_ROOT_USER).toBe('minioadmin');
    expect(environment.PROFILE_IMAGE_STORAGE_REGION).toBe('us-east-1');
  });

  it('keeps e2e-specific overrides on top of .env.example defaults', () => {
    clearE2EEnvironment();

    const environment = createE2EEnvironment();

    expect(environment.E2E_BASE_URL).toBe('http://127.0.0.1:3006');
    expect(environment.SITE_URL).toBe('http://127.0.0.1:3006');
    expect(environment.AUTH_URL).toBe('http://127.0.0.1:3006');
    expect(environment.NEXTAUTH_URL).toBe('http://127.0.0.1:3006');
    expect(environment.EMAIL_PROVIDER).toBe('smtp');
    expect(environment.DATABASE_URL).toBe(
      'postgresql://atlas:atlas_password@127.0.0.1:55434/historical_source_atlas?schema=public',
    );
  });

  it('lets caller-provided e2e service endpoints override example defaults', () => {
    clearE2EEnvironment();
    process.env.MAILPIT_BASE_URL = 'http://127.0.0.1:18025';
    process.env.MINIO_API_PORT = '19000';
    process.env.PROFILE_IMAGE_STORAGE_ENDPOINT = 'http://127.0.0.1:19000';

    const environment = createE2EEnvironment();

    expect(environment.MAILPIT_BASE_URL).toBe('http://127.0.0.1:18025');
    expect(environment.MINIO_API_PORT).toBe('19000');
    expect(environment.PROFILE_IMAGE_STORAGE_ENDPOINT).toBe(
      'http://127.0.0.1:19000',
    );
  });

  it('prefers e2e storage defaults over project .env placeholders', () => {
    clearE2EEnvironment();
    process.env.PROFILE_IMAGE_STORAGE_ENDPOINT =
      'https://example.r2.cloudflarestorage.com/';
    process.env.PROFILE_IMAGE_STORAGE_ACCESS_KEY_ID = 'replace-me';
    process.env.PROFILE_IMAGE_STORAGE_SECRET_ACCESS_KEY = 'replace-me';
    process.env.PROFILE_IMAGE_PUBLIC_BASE_URL =
      'https://cdn.example.com/profile-images';
    process.env.PROFILE_IMAGE_STORAGE_FORCE_PATH_STYLE = 'false';
    process.env.PROFILE_IMAGE_STORAGE_REGION = 'auto';

    const environment = createE2EEnvironment();

    expect(environment.PROFILE_IMAGE_STORAGE_ENDPOINT).toBe(
      'http://127.0.0.1:9000',
    );
    expect(environment.PROFILE_IMAGE_STORAGE_ACCESS_KEY_ID).toBe('minioadmin');
    expect(environment.PROFILE_IMAGE_STORAGE_SECRET_ACCESS_KEY).toBe(
      'minioadmin',
    );
    expect(environment.PROFILE_IMAGE_PUBLIC_BASE_URL).toBe(
      'http://127.0.0.1:9000/profile-images',
    );
    expect(environment.PROFILE_IMAGE_STORAGE_FORCE_PATH_STYLE).toBe('true');
    expect(environment.PROFILE_IMAGE_STORAGE_REGION).toBe('us-east-1');
  });

  it('keeps caller-provided non-placeholder object storage overrides', () => {
    clearE2EEnvironment();
    process.env.PROFILE_IMAGE_STORAGE_ENDPOINT =
      'https://account-id.r2.cloudflarestorage.com';
    process.env.PROFILE_IMAGE_STORAGE_ACCESS_KEY_ID = 'access-key-id';
    process.env.PROFILE_IMAGE_STORAGE_SECRET_ACCESS_KEY = 'secret-access-key';
    process.env.PROFILE_IMAGE_PUBLIC_BASE_URL =
      'https://cdn.test/profile-images';
    process.env.PROFILE_IMAGE_STORAGE_FORCE_PATH_STYLE = 'false';
    process.env.PROFILE_IMAGE_STORAGE_REGION = 'auto';

    const environment = createE2EEnvironment();

    expect(environment.PROFILE_IMAGE_STORAGE_ENDPOINT).toBe(
      'https://account-id.r2.cloudflarestorage.com',
    );
    expect(environment.PROFILE_IMAGE_STORAGE_ACCESS_KEY_ID).toBe(
      'access-key-id',
    );
    expect(environment.PROFILE_IMAGE_STORAGE_SECRET_ACCESS_KEY).toBe(
      'secret-access-key',
    );
    expect(environment.PROFILE_IMAGE_PUBLIC_BASE_URL).toBe(
      'https://cdn.test/profile-images',
    );
    expect(environment.PROFILE_IMAGE_STORAGE_FORCE_PATH_STYLE).toBe('false');
    expect(environment.PROFILE_IMAGE_STORAGE_REGION).toBe('auto');
  });
});
