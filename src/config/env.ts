import * as z from 'zod';

const LOCAL_AUTH_SECRET = 'local-build-secret-local-build-secret';
const DEFAULT_SITE_URL = 'http://localhost:3000';
const DEFAULT_MAILPIT_BASE_URL = 'http://127.0.0.1:8025';

const booleanStringSchema = z
  .union([z.boolean(), z.string(), z.undefined()])
  .transform((value) => {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      return value === 'true';
    }

    return false;
  });

const rawEnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  NEXT_DEPLOY_TARGET: z.enum(['gh-pages']).optional(),
  GITHUB_PAGES_BASE_PATH: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  AUTH_SECRET: z.string().optional(),
  AUTH_URL: z.string().url().optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  SITE_URL: z.string().url().optional(),
  EMAIL_PROVIDER: z.enum(['console', 'mailpit', 'smtp']).optional(),
  EMAIL_FROM: z.string().email().optional(),
  MAILPIT_BASE_URL: z.string().url().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_SECURE: booleanStringSchema.optional(),
  IMAGE_REMOTE_HOSTS: z.string().optional(),
  PROFILE_IMAGE_STORAGE_REGION: z.string().optional(),
  PROFILE_IMAGE_STORAGE_ENDPOINT: z.string().url().optional(),
  PROFILE_IMAGE_STORAGE_FORCE_PATH_STYLE: booleanStringSchema.optional(),
  PROFILE_IMAGE_STORAGE_BUCKET: z.string().optional(),
  PROFILE_IMAGE_STORAGE_ACCESS_KEY_ID: z.string().optional(),
  PROFILE_IMAGE_STORAGE_SECRET_ACCESS_KEY: z.string().optional(),
  PROFILE_IMAGE_PUBLIC_BASE_URL: z.string().url().optional(),
  ANALYTICS_ENABLED: booleanStringSchema.optional(),
  INTERNAL_CRON_SECRET: z.string().optional(),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  FACEBOOK_CLIENT_ID: z.string().optional(),
  FACEBOOK_CLIENT_SECRET: z.string().optional(),
  X_CLIENT_ID: z.string().optional(),
  X_CLIENT_SECRET: z.string().optional(),
  TENOR_API_KEY: z.string().optional(),
  TENOR_CLIENT_KEY: z.string().optional(),
});

export type AppEnv = {
  nodeEnv: 'development' | 'test' | 'production';
  isProduction: boolean;
  isTest: boolean;
  deploymentTarget: 'default' | 'gh-pages';
  githubPagesBasePath?: string;
  database: {
    url: string | null;
  };
  auth: {
    secret: string;
    url: string;
    oauth: {
      google: {
        clientId?: string;
        clientSecret?: string;
        configured: boolean;
      };
      facebook: {
        clientId?: string;
        clientSecret?: string;
        configured: boolean;
      };
      x: {
        clientId?: string;
        clientSecret?: string;
        configured: boolean;
      };
    };
  };
  site: {
    url: string;
  };
  email: {
    provider: 'console' | 'mailpit' | 'smtp';
    from: string;
    mailpitBaseUrl: string;
    smtp: {
      host?: string;
      port?: number;
      user?: string;
      password?: string;
      secure: boolean;
    };
  };
  images: {
    remoteHosts: readonly string[];
  };
  storage: {
    region: string;
    endpoint?: string;
    forcePathStyle: boolean;
    bucket?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    publicBaseUrl?: string;
    configured: boolean;
  };
  analytics: {
    enabled: boolean;
  };
  jobs: {
    internalCronSecret?: string;
  };
  observability: {
    logLevel:
      | 'fatal'
      | 'error'
      | 'warn'
      | 'info'
      | 'debug'
      | 'trace'
      | 'silent';
  };
  tenor: {
    apiKey?: string;
    clientKey: string;
    configured: boolean;
  };
};

let cachedEnv: AppEnv | null = null;

function trimOptional(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function deriveSiteUrl(raw: z.infer<typeof rawEnvSchema>) {
  return (
    trimOptional(raw.SITE_URL) ??
    trimOptional(raw.AUTH_URL) ??
    trimOptional(raw.NEXTAUTH_URL) ??
    DEFAULT_SITE_URL
  );
}

function isDefaultProductionTarget(raw: z.infer<typeof rawEnvSchema>) {
  return raw.NODE_ENV === 'production' && raw.NEXT_DEPLOY_TARGET !== 'gh-pages';
}

function resolveOAuthProviderConfig(
  provider: string,
  clientId?: string,
  clientSecret?: string,
) {
  const normalizedClientId = trimOptional(clientId);
  const normalizedClientSecret = trimOptional(clientSecret);

  if (Boolean(normalizedClientId) !== Boolean(normalizedClientSecret)) {
    throw new Error(
      `Invalid environment configuration: ${provider} OAuth requires both client id and client secret.`,
    );
  }

  return {
    clientId: normalizedClientId,
    clientSecret: normalizedClientSecret,
    configured: Boolean(normalizedClientId && normalizedClientSecret),
  };
}

export function resetEnvForTests() {
  cachedEnv = null;
}

export function getEnv(): AppEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const raw = rawEnvSchema.parse(process.env);
  const deploymentTarget =
    raw.NEXT_DEPLOY_TARGET === 'gh-pages' ? 'gh-pages' : 'default';
  const databaseUrl = trimOptional(raw.DATABASE_URL);

  if (deploymentTarget !== 'gh-pages' && !databaseUrl) {
    throw new Error(
      'Invalid environment configuration: DATABASE_URL is required unless NEXT_DEPLOY_TARGET=gh-pages.',
    );
  }

  const siteUrl = deriveSiteUrl(raw);

  if (
    isDefaultProductionTarget(raw) &&
    !trimOptional(raw.SITE_URL) &&
    !trimOptional(raw.AUTH_URL) &&
    !trimOptional(raw.NEXTAUTH_URL)
  ) {
    throw new Error(
      'Invalid environment configuration: SITE_URL or AUTH_URL is required in production.',
    );
  }

  const authSecret =
    trimOptional(raw.AUTH_SECRET) ??
    (raw.NODE_ENV === 'production' && deploymentTarget !== 'gh-pages'
      ? undefined
      : LOCAL_AUTH_SECRET);

  if (!authSecret) {
    throw new Error(
      'Invalid environment configuration: AUTH_SECRET is required in production.',
    );
  }

  const storageBucket = trimOptional(raw.PROFILE_IMAGE_STORAGE_BUCKET);
  const storageAccessKeyId = trimOptional(
    raw.PROFILE_IMAGE_STORAGE_ACCESS_KEY_ID,
  );
  const storageSecretAccessKey = trimOptional(
    raw.PROFILE_IMAGE_STORAGE_SECRET_ACCESS_KEY,
  );
  const storagePublicBaseUrl = trimOptional(raw.PROFILE_IMAGE_PUBLIC_BASE_URL);
  const storageConfigured = Boolean(
    storageBucket &&
    storageAccessKeyId &&
    storageSecretAccessKey &&
    storagePublicBaseUrl,
  );
  const hasPartialStorageConfig =
    [
      storageBucket,
      storageAccessKeyId,
      storageSecretAccessKey,
      storagePublicBaseUrl,
    ].some(Boolean) && !storageConfigured;

  if (hasPartialStorageConfig) {
    throw new Error(
      'Invalid environment configuration: profile image storage requires bucket, access key id, secret access key, and public base url together.',
    );
  }

  const smtpHost = trimOptional(raw.SMTP_HOST);
  const smtpUser = trimOptional(raw.SMTP_USER);
  const smtpPassword = trimOptional(raw.SMTP_PASSWORD);

  if (
    raw.EMAIL_PROVIDER === 'smtp' &&
    (!smtpHost || !raw.SMTP_PORT || !smtpUser || !smtpPassword)
  ) {
    throw new Error(
      'Invalid environment configuration: SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASSWORD are required when EMAIL_PROVIDER=smtp.',
    );
  }

  if (isDefaultProductionTarget(raw) && raw.EMAIL_PROVIDER !== 'smtp') {
    throw new Error(
      'Invalid environment configuration: EMAIL_PROVIDER=smtp is required in production.',
    );
  }

  if (
    isDefaultProductionTarget(raw) &&
    !trimOptional(raw.INTERNAL_CRON_SECRET)
  ) {
    throw new Error(
      'Invalid environment configuration: INTERNAL_CRON_SECRET is required in production.',
    );
  }

  const remoteImageHosts = [
    ...(trimOptional(raw.IMAGE_REMOTE_HOSTS)
      ?.split(',')
      .map((host) => host.trim())
      .filter(Boolean) ?? []),
    ...(storagePublicBaseUrl ? [new URL(storagePublicBaseUrl).hostname] : []),
  ];

  cachedEnv = {
    nodeEnv: raw.NODE_ENV,
    isProduction: raw.NODE_ENV === 'production',
    isTest: raw.NODE_ENV === 'test',
    deploymentTarget,
    githubPagesBasePath: trimOptional(raw.GITHUB_PAGES_BASE_PATH),
    database: {
      url: databaseUrl ?? null,
    },
    auth: {
      secret: authSecret,
      url:
        trimOptional(raw.AUTH_URL) ?? trimOptional(raw.NEXTAUTH_URL) ?? siteUrl,
      oauth: {
        google: resolveOAuthProviderConfig(
          'Google',
          raw.GOOGLE_CLIENT_ID,
          raw.GOOGLE_CLIENT_SECRET,
        ),
        facebook: resolveOAuthProviderConfig(
          'Facebook',
          raw.FACEBOOK_CLIENT_ID,
          raw.FACEBOOK_CLIENT_SECRET,
        ),
        x: resolveOAuthProviderConfig(
          'X',
          raw.X_CLIENT_ID,
          raw.X_CLIENT_SECRET,
        ),
      },
    },
    site: {
      url: siteUrl,
    },
    email: {
      provider: raw.EMAIL_PROVIDER ?? 'console',
      from: raw.EMAIL_FROM ?? 'no-reply@example.com',
      mailpitBaseUrl:
        trimOptional(raw.MAILPIT_BASE_URL) ?? DEFAULT_MAILPIT_BASE_URL,
      smtp: {
        host: smtpHost,
        port: raw.SMTP_PORT,
        user: smtpUser,
        password: smtpPassword,
        secure: raw.SMTP_SECURE ?? false,
      },
    },
    images: {
      remoteHosts: [...new Set(remoteImageHosts)],
    },
    storage: {
      region: trimOptional(raw.PROFILE_IMAGE_STORAGE_REGION) ?? 'auto',
      endpoint: trimOptional(raw.PROFILE_IMAGE_STORAGE_ENDPOINT),
      forcePathStyle: raw.PROFILE_IMAGE_STORAGE_FORCE_PATH_STYLE ?? false,
      bucket: storageBucket,
      accessKeyId: storageAccessKeyId,
      secretAccessKey: storageSecretAccessKey,
      publicBaseUrl: storagePublicBaseUrl,
      configured: storageConfigured,
    },
    analytics: {
      enabled: raw.ANALYTICS_ENABLED ?? true,
    },
    jobs: {
      internalCronSecret: trimOptional(raw.INTERNAL_CRON_SECRET),
    },
    observability: {
      logLevel:
        raw.LOG_LEVEL ?? (raw.NODE_ENV === 'production' ? 'info' : 'debug'),
    },
    tenor: {
      apiKey: trimOptional(raw.TENOR_API_KEY),
      clientKey:
        trimOptional(raw.TENOR_CLIENT_KEY) ?? 'historical-source-atlas-chat',
      configured: Boolean(trimOptional(raw.TENOR_API_KEY)),
    },
  };

  return cachedEnv;
}
