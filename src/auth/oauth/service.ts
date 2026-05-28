import type { AuthProvider } from '@/src/auth';
import { signInSession } from '@/src/auth.server';
import {
  clearOAuthFlowCookies,
  createOAuthStateRecord,
  readOAuthCallbackCookies,
  type OAuthFlowContext,
  validateOAuthCallbackState,
  writeOAuthFlowCookies,
} from '@/src/auth/oauth/cookies';
import type { OAuthErrorCode } from '@/src/auth/oauth/errors';
import { createPkcePair } from '@/src/auth/oauth/pkce';
import { resolveSocialAccount } from '@/src/auth/oauth/identity';
import { getOAuthProviderAdapter } from '@/src/auth/oauth/providers';
import { getEnv } from '@/src/config/env';
import {
  hasLocale,
  routing,
  stripLocaleFromPathname,
  withLocalePath,
  type AppLocale,
} from '@/i18n/routing';

function resolveLocale(value: string | null | undefined): AppLocale {
  return value && hasLocale(value) ? value : routing.defaultLocale;
}

function normalizeReturnTo(
  value: string | null | undefined,
): OAuthFlowContext['returnTo'] {
  const normalizedPath = stripLocaleFromPathname(value ?? '/login').split(
    '?',
  )[0];
  return normalizedPath === '/register' ? '/register' : '/login';
}

function getCallbackUrl(provider: AuthProvider) {
  return new URL(
    `/api/auth/oauth/${provider}/callback`,
    getEnv().auth.url,
  ).toString();
}

function buildLocalizedUrl(pathname: string, locale: AppLocale) {
  return new URL(withLocalePath(pathname, locale), getEnv().auth.url);
}

function buildFailureResponse(
  provider: AuthProvider,
  error: OAuthErrorCode,
  context?: OAuthFlowContext,
) {
  const locale = context?.locale ?? routing.defaultLocale;
  const returnTo = context?.returnTo ?? '/login';
  const url = buildLocalizedUrl(returnTo, locale);

  url.searchParams.set('oauthProvider', provider);
  url.searchParams.set('oauthError', error);

  return Response.redirect(url, 302);
}

function buildSuccessResponse(locale: AppLocale) {
  return Response.redirect(buildLocalizedUrl('/profile', locale), 302);
}

export function resolveOAuthFlowContext(input: {
  locale?: string | null;
  returnTo?: string | null;
}): OAuthFlowContext {
  return {
    locale: resolveLocale(input.locale),
    returnTo: normalizeReturnTo(input.returnTo),
  };
}

export async function beginOAuthFlow(
  provider: AuthProvider,
  context: OAuthFlowContext,
) {
  const adapter = getOAuthProviderAdapter(provider);
  const state = createOAuthStateRecord();
  const pkce = createPkcePair();

  try {
    const authorizationUrl = await adapter.getAuthorizationUrl({
      redirectUri: getCallbackUrl(provider),
      state: state.value,
      codeChallenge: pkce.codeChallenge,
    });

    await writeOAuthFlowCookies({
      state,
      codeVerifier: pkce.codeVerifier,
      provider,
      context,
    });

    return Response.redirect(authorizationUrl, 302);
  } catch {
    await clearOAuthFlowCookies();
    return buildFailureResponse(provider, 'missing_config', context);
  }
}

export async function completeOAuthFlow(
  provider: AuthProvider,
  request: Request,
) {
  const requestUrl = new URL(request.url);
  const storedCookies = await readOAuthCallbackCookies();

  if (requestUrl.searchParams.get('error')) {
    await clearOAuthFlowCookies();
    return buildFailureResponse(
      provider,
      'access_denied',
      storedCookies.context ?? undefined,
    );
  }

  const validation = validateOAuthCallbackState({
    provider,
    queryState: requestUrl.searchParams.get('state'),
    storedState: storedCookies.state,
    storedProvider: storedCookies.provider,
    codeVerifier: storedCookies.codeVerifier,
    context: storedCookies.context,
  });

  if (!validation.ok) {
    await clearOAuthFlowCookies();
    return buildFailureResponse(
      provider,
      validation.error,
      storedCookies.context ?? undefined,
    );
  }

  const code = requestUrl.searchParams.get('code');
  if (!code) {
    await clearOAuthFlowCookies();
    return buildFailureResponse(
      provider,
      'missing_code',
      validation.data.context,
    );
  }

  const adapter = getOAuthProviderAdapter(provider);

  try {
    const tokens = await adapter.exchangeCode({
      code,
      redirectUri: getCallbackUrl(provider),
      codeVerifier: validation.data.codeVerifier,
    });
    const profile = await adapter.fetchProfile(tokens);
    const resolvedUser = await resolveSocialAccount(profile);

    await clearOAuthFlowCookies();
    await signInSession(resolvedUser);

    return buildSuccessResponse(validation.data.context.locale);
  } catch (error) {
    await clearOAuthFlowCookies();

    if (error instanceof Error) {
      if (error.message.includes('token exchange')) {
        return buildFailureResponse(
          provider,
          'token_exchange_failed',
          validation.data.context,
        );
      }

      if (
        error.message.includes('profile fetch') ||
        error.message.includes('profile id')
      ) {
        return buildFailureResponse(
          provider,
          'profile_fetch_failed',
          validation.data.context,
        );
      }
    }

    return buildFailureResponse(
      provider,
      'identity_resolution_failed',
      validation.data.context,
    );
  }
}
