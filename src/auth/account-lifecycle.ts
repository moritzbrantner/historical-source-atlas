import { createHmac, randomInt } from 'node:crypto';

import { eq, like } from 'drizzle-orm';

import { hashPassword } from '@/lib/password';
import type { AppRole } from '@/lib/authorization';
import {
  withLocalePath,
  type AppLocale,
  hasLocale,
  routing,
} from '@/i18n/routing';
import { getEnv } from '@/src/config/env';
import { getEmailTemplateContentForLifecycle } from '@/src/email/admin-template-service';
import { renderEmailTemplate } from '@/src/email/templates';
import { getDb } from '@/src/db/client';
import { users, verificationTokens } from '@/src/db/schema';
import { enqueueJob } from '@/src/jobs/service';
import type { JobPayloadMap } from '@/src/jobs/contracts';
import { getLogger } from '@/src/observability/logger';
import { getInitialProfileTagCandidates } from '@/src/profile/tags';
import { getAccountRegistrationSettings } from '@/src/site-config/service';

const EMAIL_VERIFICATION_PREFIX = 'email-verification:';
const PASSWORD_RESET_PREFIX = 'password-reset:';
const LOGIN_OTP_PREFIX = 'login-otp:';
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const LOGIN_OTP_TTL_MS = 10 * 60 * 1000;
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashToken(rawToken: string): string {
  return Buffer.from(rawToken).toString('base64url');
}

function createRawToken(): string {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`;
}

function createOneTimePassword(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

function hashOneTimePassword(identifier: string, code: string): string {
  return createHmac('sha256', getEnv().auth.secret)
    .update(`${identifier}:${code}`)
    .digest('base64url');
}

function getBaseUrl(): string {
  return getEnv().auth.url;
}

function normalizeLocale(locale?: string): AppLocale {
  return locale && hasLocale(locale) ? locale : routing.defaultLocale;
}

type DbUser = {
  id: string;
  email: string | null;
  tag: string;
  name: string | null;
  image: string | null;
  bannerImage: string | null;
  role: AppRole;
  emailVerified: Date | null;
  failedSignInAttempts: number;
  lockoutUntil: Date | null;
  disabledAt: Date | null;
};

type VerificationTokenRecord = {
  identifier: string;
  token: string;
  expires: Date;
};

type LifecycleDependencies = {
  findUserByEmail: (email: string) => Promise<DbUser | undefined>;
  findUserByTag: (tag: string) => Promise<DbUser | undefined>;
  createUser: (input: {
    id: string;
    email: string;
    tag: string;
    name: string | null;
    passwordHash: string;
  }) => Promise<void>;
  issueToken: (input: {
    identifier: string;
    token: string;
    expires: Date;
  }) => Promise<void>;
  findToken: (
    token: string,
    identifierPrefix: string,
  ) => Promise<VerificationTokenRecord | undefined>;
  deleteToken: (token: string) => Promise<void>;
  deleteTokensByIdentifierPrefix: (identifierPrefix: string) => Promise<void>;
  markEmailVerified: (userId: string) => Promise<void>;
  updatePassword: (userId: string, passwordHash: string) => Promise<void>;
  updateFailureState: (
    userId: string,
    failedSignInAttempts: number,
    lockoutUntil: Date | null,
  ) => Promise<void>;
  clearFailureState: (userId: string) => Promise<void>;
  findUserById: (userId: string) => Promise<DbUser | undefined>;
  hashPassword: (password: string) => Promise<string>;
  getManualAccountVerificationRequired?: () => Promise<boolean>;
  enqueueEmailJob?: (
    payload: JobPayloadMap['sendEmail'],
  ) => Promise<string | void>;
};

function isLifecycleDependencies(
  value: unknown,
): value is LifecycleDependencies {
  return (
    value !== null && typeof value === 'object' && 'findUserByEmail' in value
  );
}

async function resolveDependencies(): Promise<LifecycleDependencies> {
  return {
    findUserByEmail: async (email) => {
      return getDb().query.users.findFirst({
        where: (table, { eq }) => eq(table.email, email),
      });
    },
    findUserByTag: async (tag) => {
      return getDb().query.users.findFirst({
        where: (table, { eq }) => eq(table.tag, tag),
      });
    },
    createUser: async (input) => {
      await getDb().insert(users).values({
        id: input.id,
        email: input.email,
        tag: input.tag,
        name: input.name,
        passwordHash: input.passwordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    },
    issueToken: async (input) => {
      await getDb().insert(verificationTokens).values(input);
    },
    findToken: async (token, identifierPrefix) => {
      return getDb().query.verificationTokens.findFirst({
        where: (table, { and, eq, like }) =>
          and(
            eq(table.token, token),
            like(table.identifier, `${identifierPrefix}%`),
          ),
      });
    },
    deleteToken: async (token) => {
      await getDb()
        .delete(verificationTokens)
        .where(eq(verificationTokens.token, token));
    },
    deleteTokensByIdentifierPrefix: async (identifierPrefix) => {
      await getDb()
        .delete(verificationTokens)
        .where(like(verificationTokens.identifier, `${identifierPrefix}%`));
    },
    markEmailVerified: async (userId) => {
      await getDb()
        .update(users)
        .set({ emailVerified: new Date(), updatedAt: new Date() })
        .where(eq(users.id, userId));
    },
    updatePassword: async (userId, passwordHash) => {
      await getDb()
        .update(users)
        .set({
          passwordHash,
          updatedAt: new Date(),
          failedSignInAttempts: 0,
          lockoutUntil: null,
        })
        .where(eq(users.id, userId));
    },
    findUserById: async (userId) => {
      return getDb().query.users.findFirst({
        where: (table, { eq }) => eq(table.id, userId),
      });
    },
    enqueueEmailJob: async (payload) => {
      return enqueueJob('sendEmail', payload);
    },
    updateFailureState: async (userId, failedSignInAttempts, lockoutUntil) => {
      await getDb()
        .update(users)
        .set({ failedSignInAttempts, lockoutUntil, updatedAt: new Date() })
        .where(eq(users.id, userId));
    },
    clearFailureState: async (userId) => {
      await getDb()
        .update(users)
        .set({
          failedSignInAttempts: 0,
          lockoutUntil: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    },
    hashPassword,
    getManualAccountVerificationRequired: async () => {
      const settings = await getAccountRegistrationSettings();
      return settings.manualVerificationRequired;
    },
  };
}

export type SignupInput = {
  email: string;
  password: string;
  name?: string;
  locale?: string;
};
export type SignupResult =
  | { ok: true; userId: string; verificationToken: string }
  | { ok: false; error: string };

function validateSignupInput(
  input: SignupInput,
): { ok: true } | { ok: false; error: string } {
  const email = normalizeEmail(input.email);
  if (!email || !email.includes('@'))
    return { ok: false, error: 'A valid email is required.' };
  if (input.password.length < 10)
    return { ok: false, error: 'Password must be at least 10 characters.' };
  if (
    !/[A-Z]/.test(input.password) ||
    !/[a-z]/.test(input.password) ||
    !/\d/.test(input.password)
  ) {
    return {
      ok: false,
      error: 'Password must include uppercase, lowercase, and a number.',
    };
  }
  if (input.name && input.name.trim().length > 80)
    return { ok: false, error: 'Display name must be 80 characters or fewer.' };
  return { ok: true };
}

function validatePasswordStrength(
  password: string,
): { ok: true } | { ok: false; error: string } {
  if (password.length < 10)
    return { ok: false, error: 'Password must be at least 10 characters.' };
  if (
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/\d/.test(password)
  ) {
    return {
      ok: false,
      error: 'Password must include uppercase, lowercase, and a number.',
    };
  }

  return { ok: true };
}

async function issueEmailVerificationToken(
  d: LifecycleDependencies,
  userId: string,
) {
  const rawToken = createRawToken();

  await d.issueToken({
    identifier: `${EMAIL_VERIFICATION_PREFIX}${userId}`,
    token: hashToken(rawToken),
    expires: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
  });

  return rawToken;
}

async function queueEmailVerificationMessage(
  d: LifecycleDependencies,
  input: {
    email: string;
    name: string | null | undefined;
    rawToken: string;
    locale?: string;
  },
) {
  const locale = normalizeLocale(input.locale);
  const verificationUrl = `${getBaseUrl()}${withLocalePath(
    `/verify-email?token=${encodeURIComponent(input.rawToken)}`,
    locale,
  )}`;

  getLogger({ subsystem: 'auth' }).info(
    {
      email: input.email,
      verificationUrl,
    },
    'Email verification token issued',
  );

  try {
    const message = await renderEmailTemplate(
      'accountVerification',
      {
        verificationUrl,
        name: input.name?.trim() || 'there',
      },
      await getEmailTemplateContentForLifecycle('accountVerification'),
    );

    await (
      d.enqueueEmailJob ?? ((payload) => enqueueJob('sendEmail', payload))
    )({
      to: input.email,
      subject: message.subject,
      html: message.html,
      text: message.text,
      tags: ['account-verification'],
    });
  } catch (error) {
    getLogger({ subsystem: 'auth' }).error(
      { email: input.email, err: error },
      'Failed to send verification email',
    );
  }
}

export async function signUpWithCredentials(
  input: SignupInput,
  deps?: LifecycleDependencies,
): Promise<SignupResult> {
  const validation = validateSignupInput(input);
  if (!validation.ok) return validation;
  const d = deps ?? (await resolveDependencies());

  const email = normalizeEmail(input.email);
  if (await d.findUserByEmail(email))
    return { ok: false, error: 'An account already exists for this email.' };

  const userId = crypto.randomUUID();
  let tag = '';
  for (const candidate of getInitialProfileTagCandidates({
    userId,
    email,
    name: input.name,
  })) {
    if (!(await d.findUserByTag(candidate))) {
      tag = candidate;
      break;
    }
  }
  if (!tag)
    return { ok: false, error: 'Unable to allocate a profile tag right now.' };
  const passwordHashValue = await d.hashPassword(input.password);
  await d.createUser({
    id: userId,
    email,
    tag,
    name: input.name?.trim() || null,
    passwordHash: passwordHashValue,
  });

  const rawToken = await issueEmailVerificationToken(d, userId);
  const manualVerificationRequired =
    (await d.getManualAccountVerificationRequired?.()) ?? false;

  if (!manualVerificationRequired) {
    await queueEmailVerificationMessage(d, {
      email,
      name: input.name,
      rawToken,
      locale: input.locale,
    });
  }

  return { ok: true, userId, verificationToken: rawToken };
}

export async function sendAccountVerificationEmailForUser(
  userId: string,
  optionsOrDeps?: { locale?: string } | LifecycleDependencies,
  deps?: LifecycleDependencies,
): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  const options = isLifecycleDependencies(optionsOrDeps)
    ? undefined
    : optionsOrDeps;
  const d =
    (isLifecycleDependencies(optionsOrDeps) ? optionsOrDeps : deps) ??
    (await resolveDependencies());
  const user = await d.findUserById(userId);

  if (!user?.email) {
    return { ok: false, error: 'Choose a user with an email address.' };
  }

  if (user.emailVerified) {
    return { ok: false, error: 'This account is already verified.' };
  }

  await d.deleteTokensByIdentifierPrefix(
    `${EMAIL_VERIFICATION_PREFIX}${user.id}`,
  );
  const rawToken = await issueEmailVerificationToken(d, user.id);
  await queueEmailVerificationMessage(d, {
    email: user.email,
    name: user.name,
    rawToken,
    locale: options?.locale,
  });

  return { ok: true, token: rawToken };
}

export async function verifyEmailByToken(
  rawToken: string,
  deps?: LifecycleDependencies,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const d = deps ?? (await resolveDependencies());
  const tokenRecord = await d.findToken(
    hashToken(rawToken),
    EMAIL_VERIFICATION_PREFIX,
  );
  if (!tokenRecord) return { ok: false, error: 'Invalid verification token.' };
  if (tokenRecord.expires.getTime() < Date.now()) {
    await d.deleteToken(tokenRecord.token);
    return { ok: false, error: 'Verification token has expired.' };
  }

  await d.markEmailVerified(
    tokenRecord.identifier.slice(EMAIL_VERIFICATION_PREFIX.length),
  );
  await d.deleteToken(tokenRecord.token);
  return { ok: true };
}

export async function requestPasswordReset(
  emailInput: string,
  optionsOrDeps?: { locale?: string } | LifecycleDependencies,
  deps?: LifecycleDependencies,
): Promise<{ ok: true; token?: string }> {
  const options = isLifecycleDependencies(optionsOrDeps)
    ? undefined
    : optionsOrDeps;
  const d =
    (isLifecycleDependencies(optionsOrDeps) ? optionsOrDeps : deps) ??
    (await resolveDependencies());
  const email = normalizeEmail(emailInput);
  if (!email || !email.includes('@')) return { ok: true };

  const user = await d.findUserByEmail(email);
  if (!user) return { ok: true };

  await d.deleteTokensByIdentifierPrefix(`${PASSWORD_RESET_PREFIX}${user.id}`);
  const rawToken = createRawToken();
  const locale = normalizeLocale(options?.locale);
  const resetUrl = `${getBaseUrl()}${withLocalePath(`/reset-password?token=${encodeURIComponent(rawToken)}`, locale)}`;
  await d.issueToken({
    identifier: `${PASSWORD_RESET_PREFIX}${user.id}`,
    token: hashToken(rawToken),
    expires: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
  });

  getLogger({ subsystem: 'auth' }).info(
    {
      email,
      resetUrl,
    },
    'Password reset token issued',
  );

  try {
    const message = await renderEmailTemplate(
      'passwordReset',
      { resetUrl },
      await getEmailTemplateContentForLifecycle('passwordReset'),
    );

    await (
      d.enqueueEmailJob ?? ((payload) => enqueueJob('sendEmail', payload))
    )({
      to: email,
      subject: message.subject,
      html: message.html,
      text: message.text,
      tags: ['password-reset'],
    });
  } catch (error) {
    getLogger({ subsystem: 'auth' }).error(
      { email, err: error },
      'Failed to send password reset email',
    );
  }

  return { ok: true, token: rawToken };
}

export async function resetPasswordWithToken(
  rawToken: string,
  nextPassword: string,
  deps?: LifecycleDependencies,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const passwordValidation = validatePasswordStrength(nextPassword);
  if (!passwordValidation.ok) return passwordValidation;

  const d = deps ?? (await resolveDependencies());
  const tokenRecord = await d.findToken(
    hashToken(rawToken),
    PASSWORD_RESET_PREFIX,
  );
  if (!tokenRecord)
    return { ok: false, error: 'Invalid password reset token.' };
  if (tokenRecord.expires.getTime() < Date.now()) {
    await d.deleteToken(tokenRecord.token);
    return { ok: false, error: 'Password reset token has expired.' };
  }

  const passwordHashValue = await d.hashPassword(nextPassword);
  await d.updatePassword(
    tokenRecord.identifier.slice(PASSWORD_RESET_PREFIX.length),
    passwordHashValue,
  );
  await d.deleteToken(tokenRecord.token);
  return { ok: true };
}

export async function requestLoginOneTimePassword(
  emailInput: string,
  optionsOrDeps?: { locale?: string } | LifecycleDependencies,
  deps?: LifecycleDependencies,
): Promise<{ ok: true; code?: string }> {
  const options = isLifecycleDependencies(optionsOrDeps)
    ? undefined
    : optionsOrDeps;
  const d =
    (isLifecycleDependencies(optionsOrDeps) ? optionsOrDeps : deps) ??
    (await resolveDependencies());
  const email = normalizeEmail(emailInput);
  if (!email || !email.includes('@')) return { ok: true };

  const user = await d.findUserByEmail(email);
  if (!user?.email || !user.emailVerified || user.disabledAt)
    return { ok: true };

  const identifier = `${LOGIN_OTP_PREFIX}${user.id}`;
  const code = createOneTimePassword();
  await d.deleteTokensByIdentifierPrefix(identifier);
  await d.issueToken({
    identifier,
    token: hashOneTimePassword(identifier, code),
    expires: new Date(Date.now() + LOGIN_OTP_TTL_MS),
  });

  getLogger({ subsystem: 'auth' }).info(
    { email },
    'Login one-time password issued',
  );

  try {
    const message = await renderEmailTemplate(
      'loginOneTimePassword',
      { code },
      await getEmailTemplateContentForLifecycle('loginOneTimePassword'),
    );

    await (
      d.enqueueEmailJob ?? ((payload) => enqueueJob('sendEmail', payload))
    )({
      to: email,
      subject: message.subject,
      html: message.html,
      text: message.text,
      tags: ['login-otp'],
    });
  } catch (error) {
    getLogger({ subsystem: 'auth' }).error(
      { email, err: error },
      'Failed to send login one-time password email',
    );
  }

  return { ok: true, code };
}

export async function verifyLoginOneTimePassword(
  emailInput: string,
  codeInput: string,
  deps?: LifecycleDependencies,
): Promise<
  | {
      ok: true;
      user: {
        id: string;
        email: string;
        tag: string;
        name: string | null;
        image: string | null;
        bannerImage: string | null;
        role: AppRole;
      };
    }
  | { ok: false; error: string }
> {
  const email = normalizeEmail(emailInput);
  const code = codeInput.trim();
  if (!email || !email.includes('@') || !/^\d{6}$/.test(code)) {
    return { ok: false, error: 'The one-time password is invalid.' };
  }

  const d = deps ?? (await resolveDependencies());
  const user = await d.findUserByEmail(email);
  if (!user?.email || !user.emailVerified || user.disabledAt) {
    return { ok: false, error: 'The one-time password is invalid.' };
  }

  const identifier = `${LOGIN_OTP_PREFIX}${user.id}`;
  const tokenRecord = await d.findToken(
    hashOneTimePassword(identifier, code),
    LOGIN_OTP_PREFIX,
  );
  if (!tokenRecord || tokenRecord.identifier !== identifier) {
    return { ok: false, error: 'The one-time password is invalid.' };
  }

  if (tokenRecord.expires.getTime() < Date.now()) {
    await d.deleteToken(tokenRecord.token);
    return { ok: false, error: 'The one-time password has expired.' };
  }

  await d.markEmailVerified(user.id);
  await d.deleteToken(tokenRecord.token);
  await d.clearFailureState(user.id);

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

export async function registerCredentialFailureForUser(
  userId: string,
  deps?: LifecycleDependencies,
): Promise<void> {
  const d = deps ?? (await resolveDependencies());
  const user = await d.findUserById(userId);
  if (!user) return;

  const nextFailures = (user.failedSignInAttempts ?? 0) + 1;
  const lockoutUntil =
    nextFailures >= LOCKOUT_THRESHOLD
      ? new Date(Date.now() + LOCKOUT_WINDOW_MS)
      : user.lockoutUntil;
  await d.updateFailureState(userId, nextFailures, lockoutUntil);
}

export async function clearCredentialFailuresForUser(
  userId: string,
  deps?: LifecycleDependencies,
): Promise<void> {
  const d = deps ?? (await resolveDependencies());
  await d.clearFailureState(userId);
}

export async function isUserLockedOut(userId: string): Promise<boolean> {
  const user = await getDb().query.users.findFirst({
    where: (table, { and, eq, gt }) =>
      and(eq(table.id, userId), gt(table.lockoutUntil, new Date())),
  });
  return Boolean(user);
}
