import { randomUUID } from 'node:crypto';

import { cookies } from 'next/headers';

import type { AuthProvider } from '@/src/auth';
import { getEnv } from '@/src/config/env';
import type { AppLocale } from '@/i18n/routing';

const OAUTH_COOKIE_PREFIX = 'oauth-v1';
const OAUTH_STATE_COOKIE = `${OAUTH_COOKIE_PREFIX}-state`;
const OAUTH_CODE_VERIFIER_COOKIE = `${OAUTH_COOKIE_PREFIX}-code-verifier`;
const OAUTH_PROVIDER_COOKIE = `${OAUTH_COOKIE_PREFIX}-provider`;
const OAUTH_CONTEXT_COOKIE = `${OAUTH_COOKIE_PREFIX}-context`;

export const OAUTH_COOKIE_MAX_AGE_SECONDS = 10 * 60;

type CookieValue = { value: string };

export type OAuthFlowContext = {
  locale: AppLocale;
  returnTo: '/login' | '/register';
};

export type StoredOAuthState = {
  value: string;
  expiresAt: number;
};

type OAuthCookieStore = {
  get(name: string): CookieValue | undefined;
  set(input: {
    name: string;
    value: string;
    httpOnly: boolean;
    sameSite: 'lax';
    secure: boolean;
    path: string;
    maxAge: number;
  }): void;
  delete(name: string): void;
};

function serializeJson(value: unknown) {
  return JSON.stringify(value);
}

function parseJson<TValue>(value: string | undefined): TValue | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as TValue;
  } catch {
    return null;
  }
}

function getCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: getEnv().isProduction,
    path: '/',
    maxAge: OAUTH_COOKIE_MAX_AGE_SECONDS,
  };
}

export function createOAuthStateRecord(now = Date.now()): StoredOAuthState {
  return {
    value: `${randomUUID()}${randomUUID()}`,
    expiresAt: now + OAUTH_COOKIE_MAX_AGE_SECONDS * 1000,
  };
}

export function validateOAuthCallbackState(input: {
  provider: AuthProvider;
  queryState: string | null;
  storedState: StoredOAuthState | null;
  storedProvider: string | null;
  codeVerifier: string | null;
  context: OAuthFlowContext | null;
  now?: number;
}) {
  if (
    !input.queryState ||
    !input.storedState ||
    !input.codeVerifier ||
    !input.context
  ) {
    return { ok: false as const, error: 'invalid_state' as const };
  }

  if (input.storedProvider !== input.provider) {
    return { ok: false as const, error: 'provider_mismatch' as const };
  }

  if (input.storedState.expiresAt <= (input.now ?? Date.now())) {
    return { ok: false as const, error: 'expired_state' as const };
  }

  if (input.storedState.value !== input.queryState) {
    return { ok: false as const, error: 'invalid_state' as const };
  }

  return {
    ok: true as const,
    data: {
      codeVerifier: input.codeVerifier,
      context: input.context,
    },
  };
}

async function getCookieStore(): Promise<OAuthCookieStore> {
  return cookies();
}

export async function writeOAuthFlowCookies(input: {
  state: StoredOAuthState;
  codeVerifier: string;
  provider: AuthProvider;
  context: OAuthFlowContext;
}) {
  const cookieStore = await getCookieStore();
  const options = getCookieOptions();

  cookieStore.set({
    name: OAUTH_STATE_COOKIE,
    value: serializeJson(input.state),
    ...options,
  });
  cookieStore.set({
    name: OAUTH_CODE_VERIFIER_COOKIE,
    value: input.codeVerifier,
    ...options,
  });
  cookieStore.set({
    name: OAUTH_PROVIDER_COOKIE,
    value: input.provider,
    ...options,
  });
  cookieStore.set({
    name: OAUTH_CONTEXT_COOKIE,
    value: serializeJson(input.context),
    ...options,
  });
}

export async function readOAuthCallbackCookies() {
  const cookieStore = await getCookieStore();

  return {
    state: parseJson<StoredOAuthState>(
      cookieStore.get(OAUTH_STATE_COOKIE)?.value,
    ),
    codeVerifier: cookieStore.get(OAUTH_CODE_VERIFIER_COOKIE)?.value ?? null,
    provider: cookieStore.get(OAUTH_PROVIDER_COOKIE)?.value ?? null,
    context: parseJson<OAuthFlowContext>(
      cookieStore.get(OAUTH_CONTEXT_COOKIE)?.value,
    ),
  };
}

export async function clearOAuthFlowCookies() {
  const cookieStore = await getCookieStore();

  cookieStore.delete(OAUTH_STATE_COOKIE);
  cookieStore.delete(OAUTH_CODE_VERIFIER_COOKIE);
  cookieStore.delete(OAUTH_PROVIDER_COOKIE);
  cookieStore.delete(OAUTH_CONTEXT_COOKIE);
}
