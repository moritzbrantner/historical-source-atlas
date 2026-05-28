import type { AppRole } from '@/lib/authorization';
import { verifyPassword } from '@/lib/password';
import {
  buildCredentialThrottleKey,
  clearCredentialAttemptFailures,
  getClientIpFromRequest,
  isCredentialAttemptThrottled,
  registerCredentialAttemptFailure,
} from '@/src/auth/credential-security';
import {
  clearCredentialFailuresForUser,
  registerCredentialFailureForUser,
} from '@/src/auth/account-lifecycle';

type CredentialsInput = {
  email?: unknown;
  password?: unknown;
};

type DbUser = {
  id: string;
  email: string | null;
  tag: string;
  name: string | null;
  image: string | null;
  bannerImage: string | null;
  role: AppRole;
  emailVerified: Date | null;
  passwordHash: string | null;
  lockoutUntil: Date | null;
  disabledAt: Date | null;
};

type AuthorizedCredentialsUser = {
  id: string;
  email: string | null;
  tag: string;
  name: string | null;
  image: string | null;
  bannerImage: string | null;
  role: AppRole;
};

type CredentialsAuthorizationResult =
  | { ok: true; user: AuthorizedCredentialsUser }
  | { ok: false; reason: 'invalid_credentials' | 'email_unverified' };

type CredentialsDependencies = {
  findUserByEmail: (email: string) => Promise<DbUser | undefined>;
  verifyPassword: (password: string, passwordHash: string) => Promise<boolean>;
  onAuthenticationFailure: (userId: string | null) => Promise<void>;
  onAuthenticationSuccess: (userId: string) => Promise<void>;
};

async function resolveDefaultDependencies(): Promise<CredentialsDependencies> {
  const { getDb } = await import('@/src/db/client');

  return {
    findUserByEmail: async (email) => {
      return getDb().query.users.findFirst({
        where: (table, { eq }) => eq(table.email, email),
      });
    },
    verifyPassword,
    onAuthenticationFailure: async (userId) => {
      if (!userId) {
        return;
      }

      await registerCredentialFailureForUser(userId);
    },
    onAuthenticationSuccess: async (userId) => {
      await clearCredentialFailuresForUser(userId);
    },
  };
}

export async function authorizeCredentials(
  credentials: CredentialsInput | undefined,
  dependencies?: CredentialsDependencies,
  request?: unknown,
) {
  const result = await authorizeCredentialsDetailed(
    credentials,
    dependencies,
    request,
  );

  return result.ok ? result.user : null;
}

export async function authorizeCredentialsDetailed(
  credentials: CredentialsInput | undefined,
  dependencies?: CredentialsDependencies,
  request?: unknown,
): Promise<CredentialsAuthorizationResult> {
  const email = credentials?.email;
  const password = credentials?.password;

  if (typeof email !== 'string' || typeof password !== 'string') {
    return { ok: false, reason: 'invalid_credentials' };
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return { ok: false, reason: 'invalid_credentials' };
  }

  const clientIp = getClientIpFromRequest(request);
  const throttleKey = buildCredentialThrottleKey(normalizedEmail, clientIp);

  if (isCredentialAttemptThrottled(throttleKey)) {
    return { ok: false, reason: 'invalid_credentials' };
  }

  const resolvedDependencies =
    dependencies ?? (await resolveDefaultDependencies());
  const user = await resolvedDependencies.findUserByEmail(normalizedEmail);

  if (!user?.passwordHash || user.disabledAt) {
    registerCredentialAttemptFailure(throttleKey);
    await resolvedDependencies.onAuthenticationFailure(user?.id ?? null);
    return { ok: false, reason: 'invalid_credentials' };
  }

  if (user.lockoutUntil && user.lockoutUntil.getTime() > Date.now()) {
    registerCredentialAttemptFailure(throttleKey);
    return { ok: false, reason: 'invalid_credentials' };
  }

  const isValidPassword = await resolvedDependencies.verifyPassword(
    password,
    user.passwordHash,
  );
  if (!isValidPassword) {
    registerCredentialAttemptFailure(throttleKey);
    await resolvedDependencies.onAuthenticationFailure(user.id);
    return { ok: false, reason: 'invalid_credentials' };
  }

  if (!user.emailVerified) {
    return { ok: false, reason: 'email_unverified' };
  }

  clearCredentialAttemptFailures(throttleKey);
  await resolvedDependencies.onAuthenticationSuccess(user.id);

  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      tag: user.tag,
      name: user.name,
      image: user.image,
      bannerImage: user.bannerImage,
      role: user.role,
    },
  };
}
