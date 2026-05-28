import { afterAll, beforeAll, bench, describe } from 'vitest';

import { getEnv, resetEnvForTests } from '@/src/config/env';

const originalEnv = { ...process.env };
const benchmarkEnv = {
  DATABASE_URL: 'postgres://example',
  AUTH_SECRET: 'benchmark-secret',
  EMAIL_PROVIDER: 'smtp',
  SMTP_HOST: '127.0.0.1',
  SMTP_PORT: '1025',
  SMTP_USER: 'benchmark',
  SMTP_PASSWORD: 'benchmark',
  SMTP_SECURE: 'false',
};

function restoreEnv() {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) {
      delete process.env[key];
    }
  }

  Object.assign(process.env, originalEnv);
  resetEnvForTests();
}

describe('env parsing', () => {
  beforeAll(() => {
    Object.assign(process.env, benchmarkEnv);
  });

  afterAll(() => {
    restoreEnv();
  });

  bench('cold parse', () => {
    resetEnvForTests();
    getEnv();
  });

  bench('cached read', () => {
    getEnv();
  });
});
