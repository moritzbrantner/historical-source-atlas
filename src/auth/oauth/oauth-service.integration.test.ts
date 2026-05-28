import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.doUnmock('@/src/auth.server');
  vi.doUnmock('@/src/auth/oauth/cookies');
  vi.doUnmock('@/src/auth/oauth/providers');
  vi.doUnmock('@/src/auth/oauth/identity');
  vi.doUnmock('@/src/config/env');
});

describe('oauth service', () => {
  it('redirects denied consent back to the localized origin page', async () => {
    const clearOAuthFlowCookies = vi.fn().mockResolvedValue(undefined);

    vi.doMock('@/src/auth.server', () => ({
      signInSession: vi.fn(),
    }));
    vi.doMock('@/src/config/env', () => ({
      getEnv: vi.fn().mockReturnValue({
        auth: {
          url: 'http://localhost:3000',
        },
      }),
    }));
    vi.doMock('@/src/auth/oauth/providers', () => ({
      getOAuthProviderAdapter: vi.fn(),
    }));
    vi.doMock('@/src/auth/oauth/identity', () => ({
      resolveSocialAccount: vi.fn(),
    }));
    vi.doMock('@/src/auth/oauth/cookies', async () => {
      const actual = await vi.importActual<
        typeof import('@/src/auth/oauth/cookies')
      >('@/src/auth/oauth/cookies');
      return {
        ...actual,
        clearOAuthFlowCookies,
        readOAuthCallbackCookies: vi.fn().mockResolvedValue({
          state: null,
          codeVerifier: null,
          provider: 'google',
          context: {
            locale: 'de',
            returnTo: '/register',
          },
        }),
      };
    });

    const { completeOAuthFlow } = await import('@/src/auth/oauth/service');
    const response = await completeOAuthFlow(
      'google',
      new Request(
        'http://localhost/api/auth/oauth/google/callback?error=access_denied',
      ),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/de/register?oauthProvider=google&oauthError=access_denied',
    );
    expect(clearOAuthFlowCookies).toHaveBeenCalled();
  });

  it('rejects invalid callback state before token exchange', async () => {
    const exchangeCode = vi.fn();

    vi.doMock('@/src/auth.server', () => ({
      signInSession: vi.fn(),
    }));
    vi.doMock('@/src/config/env', () => ({
      getEnv: vi.fn().mockReturnValue({
        auth: {
          url: 'http://localhost:3000',
        },
      }),
    }));
    vi.doMock('@/src/auth/oauth/providers', () => ({
      getOAuthProviderAdapter: vi.fn().mockReturnValue({
        exchangeCode,
      }),
    }));
    vi.doMock('@/src/auth/oauth/identity', () => ({
      resolveSocialAccount: vi.fn(),
    }));
    vi.doMock('@/src/auth/oauth/cookies', async () => {
      const actual = await vi.importActual<
        typeof import('@/src/auth/oauth/cookies')
      >('@/src/auth/oauth/cookies');
      return {
        ...actual,
        clearOAuthFlowCookies: vi.fn().mockResolvedValue(undefined),
        readOAuthCallbackCookies: vi.fn().mockResolvedValue({
          state: {
            value: 'expected-state',
            expiresAt: Date.now() + 60_000,
          },
          codeVerifier: 'verifier',
          provider: 'google',
          context: {
            locale: 'en',
            returnTo: '/login',
          },
        }),
      };
    });

    const { completeOAuthFlow } = await import('@/src/auth/oauth/service');
    const response = await completeOAuthFlow(
      'google',
      new Request(
        'http://localhost/api/auth/oauth/google/callback?state=wrong-state&code=abc',
      ),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/en/login?oauthProvider=google&oauthError=invalid_state',
    );
    expect(exchangeCode).not.toHaveBeenCalled();
  });

  it('redirects token exchange failures back to the login page', async () => {
    const exchangeCode = vi
      .fn()
      .mockRejectedValue(new Error('Google token exchange failed.'));

    vi.doMock('@/src/auth.server', () => ({
      signInSession: vi.fn(),
    }));
    vi.doMock('@/src/config/env', () => ({
      getEnv: vi.fn().mockReturnValue({
        auth: {
          url: 'http://localhost:3000',
        },
      }),
    }));
    vi.doMock('@/src/auth/oauth/providers', () => ({
      getOAuthProviderAdapter: vi.fn().mockReturnValue({
        exchangeCode,
        fetchProfile: vi.fn(),
      }),
    }));
    vi.doMock('@/src/auth/oauth/identity', () => ({
      resolveSocialAccount: vi.fn(),
    }));
    vi.doMock('@/src/auth/oauth/cookies', async () => {
      const actual = await vi.importActual<
        typeof import('@/src/auth/oauth/cookies')
      >('@/src/auth/oauth/cookies');
      return {
        ...actual,
        clearOAuthFlowCookies: vi.fn().mockResolvedValue(undefined),
        readOAuthCallbackCookies: vi.fn().mockResolvedValue({
          state: {
            value: 'expected-state',
            expiresAt: Date.now() + 60_000,
          },
          codeVerifier: 'verifier',
          provider: 'google',
          context: {
            locale: 'en',
            returnTo: '/login',
          },
        }),
      };
    });

    const { completeOAuthFlow } = await import('@/src/auth/oauth/service');
    const response = await completeOAuthFlow(
      'google',
      new Request(
        'http://localhost/api/auth/oauth/google/callback?state=expected-state&code=abc',
      ),
    );

    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/en/login?oauthProvider=google&oauthError=token_exchange_failed',
    );
  });

  it('boots a session and redirects successful callbacks to the localized profile page', async () => {
    const signInSession = vi.fn().mockResolvedValue(undefined);

    vi.doMock('@/src/auth.server', () => ({
      signInSession,
    }));
    vi.doMock('@/src/config/env', () => ({
      getEnv: vi.fn().mockReturnValue({
        auth: {
          url: 'http://localhost:3000',
        },
      }),
    }));
    vi.doMock('@/src/auth/oauth/providers', () => ({
      getOAuthProviderAdapter: vi.fn().mockReturnValue({
        exchangeCode: vi.fn().mockResolvedValue({
          access_token: 'access-token',
        }),
        fetchProfile: vi.fn().mockResolvedValue({
          provider: 'google',
          providerAccountId: 'provider-user-1',
          email: 'person@example.com',
          emailVerified: true,
          isTrustedEmail: true,
          name: 'Person Example',
          image: null,
          username: null,
          accessToken: 'access-token',
          refreshToken: null,
          expiresAt: null,
          tokenType: 'Bearer',
          scope: 'openid profile email',
          idToken: null,
        }),
      }),
    }));
    vi.doMock('@/src/auth/oauth/identity', () => ({
      resolveSocialAccount: vi.fn().mockResolvedValue({
        id: 'user_1',
        email: 'person@example.com',
        tag: 'person',
        name: 'Person Example',
        image: null,
        bannerImage: null,
        role: 'USER',
      }),
    }));
    vi.doMock('@/src/auth/oauth/cookies', async () => {
      const actual = await vi.importActual<
        typeof import('@/src/auth/oauth/cookies')
      >('@/src/auth/oauth/cookies');
      return {
        ...actual,
        clearOAuthFlowCookies: vi.fn().mockResolvedValue(undefined),
        readOAuthCallbackCookies: vi.fn().mockResolvedValue({
          state: {
            value: 'expected-state',
            expiresAt: Date.now() + 60_000,
          },
          codeVerifier: 'verifier',
          provider: 'google',
          context: {
            locale: 'de',
            returnTo: '/register',
          },
        }),
      };
    });

    const { completeOAuthFlow } = await import('@/src/auth/oauth/service');
    const response = await completeOAuthFlow(
      'google',
      new Request(
        'http://localhost/api/auth/oauth/google/callback?state=expected-state&code=abc',
      ),
    );

    expect(signInSession).toHaveBeenCalledWith({
      id: 'user_1',
      email: 'person@example.com',
      tag: 'person',
      name: 'Person Example',
      image: null,
      bannerImage: null,
      role: 'USER',
    });
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/de/profile',
    );
  });
});
