import type { AuthProvider } from '@/src/auth';
import { authProviders } from '@/src/auth';
import { getEnv } from '@/src/config/env';
import type { NormalizedOAuthProfile } from '@/src/auth/oauth/types';

type OAuthStartContext = {
  redirectUri: string;
  state: string;
  codeChallenge: string;
};

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  id_token?: string;
};

type OAuthProviderAdapter = {
  getAuthorizationUrl: (context: OAuthStartContext) => Promise<string> | string;
  exchangeCode: (input: {
    code: string;
    redirectUri: string;
    codeVerifier: string;
  }) => Promise<TokenResponse>;
  fetchProfile: (tokens: TokenResponse) => Promise<NormalizedOAuthProfile>;
};

type OAuthDiscoveryDocument = {
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
};

const GOOGLE_DISCOVERY_URL =
  'https://accounts.google.com/.well-known/openid-configuration';

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? null;
}

async function readJsonOrThrow<TValue>(
  response: Response,
  message: string,
): Promise<TValue> {
  if (!response.ok) {
    throw new Error(message);
  }

  return response.json() as Promise<TValue>;
}

async function getGoogleDiscoveryDocument() {
  const response = await fetch(GOOGLE_DISCOVERY_URL, {
    cache: 'force-cache',
  });

  return readJsonOrThrow<OAuthDiscoveryDocument>(
    response,
    'Google discovery failed.',
  );
}

function buildExpiresAt(expiresIn: number | undefined) {
  if (!expiresIn || Number.isNaN(expiresIn)) {
    return null;
  }

  return Math.floor(Date.now() / 1000) + expiresIn;
}

const googleAdapter: OAuthProviderAdapter = {
  async getAuthorizationUrl(context) {
    const discovery = await getGoogleDiscoveryDocument();
    const env = getEnv().auth.oauth.google;

    if (!env.clientId || !env.clientSecret) {
      throw new Error('Google OAuth is not configured.');
    }

    const url = new URL(discovery.authorization_endpoint);
    url.searchParams.set('client_id', env.clientId);
    url.searchParams.set('redirect_uri', context.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid profile email');
    url.searchParams.set('state', context.state);
    url.searchParams.set('code_challenge', context.codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');

    return url.toString();
  },
  async exchangeCode(input) {
    const discovery = await getGoogleDiscoveryDocument();
    const env = getEnv().auth.oauth.google;

    if (!env.clientId || !env.clientSecret) {
      throw new Error('Google OAuth is not configured.');
    }

    const response = await fetch(discovery.token_endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: env.clientId,
        client_secret: env.clientSecret,
        code: input.code,
        code_verifier: input.codeVerifier,
        grant_type: 'authorization_code',
        redirect_uri: input.redirectUri,
      }),
    });

    return readJsonOrThrow<TokenResponse>(
      response,
      'Google token exchange failed.',
    );
  },
  async fetchProfile(tokens) {
    const accessToken = tokens.access_token;
    if (!accessToken) {
      throw new Error('Google access token missing.');
    }

    const discovery = await getGoogleDiscoveryDocument();
    const response = await fetch(discovery.userinfo_endpoint, {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });
    const profile = await readJsonOrThrow<{
      sub?: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
      picture?: string;
    }>(response, 'Google profile fetch failed.');

    if (!profile.sub) {
      throw new Error('Google profile id missing.');
    }

    return {
      provider: 'google',
      providerAccountId: profile.sub,
      email: normalizeEmail(profile.email),
      emailVerified: Boolean(profile.email_verified),
      isTrustedEmail: Boolean(profile.email && profile.email_verified),
      name: profile.name?.trim() || null,
      image: profile.picture?.trim() || null,
      username: null,
      accessToken,
      refreshToken: tokens.refresh_token ?? null,
      expiresAt: buildExpiresAt(tokens.expires_in),
      tokenType: tokens.token_type ?? null,
      scope: tokens.scope ?? null,
      idToken: tokens.id_token ?? null,
    };
  },
};

const facebookAdapter: OAuthProviderAdapter = {
  getAuthorizationUrl(context) {
    const env = getEnv().auth.oauth.facebook;

    if (!env.clientId || !env.clientSecret) {
      throw new Error('Facebook OAuth is not configured.');
    }

    const url = new URL('https://www.facebook.com/dialog/oauth');
    url.searchParams.set('client_id', env.clientId);
    url.searchParams.set('redirect_uri', context.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'public_profile,email');
    url.searchParams.set('state', context.state);

    return url.toString();
  },
  async exchangeCode(input) {
    const env = getEnv().auth.oauth.facebook;

    if (!env.clientId || !env.clientSecret) {
      throw new Error('Facebook OAuth is not configured.');
    }

    const url = new URL('https://graph.facebook.com/oauth/access_token');
    url.searchParams.set('client_id', env.clientId);
    url.searchParams.set('client_secret', env.clientSecret);
    url.searchParams.set('redirect_uri', input.redirectUri);
    url.searchParams.set('code', input.code);

    const response = await fetch(url, { method: 'GET' });

    return readJsonOrThrow<TokenResponse>(
      response,
      'Facebook token exchange failed.',
    );
  },
  async fetchProfile(tokens) {
    const accessToken = tokens.access_token;
    if (!accessToken) {
      throw new Error('Facebook access token missing.');
    }

    const profileUrl = new URL('https://graph.facebook.com/me');
    profileUrl.searchParams.set('fields', 'id,name,email,picture.type(large)');
    profileUrl.searchParams.set('access_token', accessToken);

    const response = await fetch(profileUrl);
    const profile = await readJsonOrThrow<{
      id?: string;
      name?: string;
      email?: string;
      picture?: {
        data?: {
          url?: string;
        };
      };
    }>(response, 'Facebook profile fetch failed.');

    if (!profile.id) {
      throw new Error('Facebook profile id missing.');
    }

    return {
      provider: 'facebook',
      providerAccountId: profile.id,
      email: normalizeEmail(profile.email),
      emailVerified: Boolean(profile.email),
      isTrustedEmail: Boolean(profile.email),
      name: profile.name?.trim() || null,
      image: profile.picture?.data?.url?.trim() || null,
      username: null,
      accessToken,
      refreshToken: tokens.refresh_token ?? null,
      expiresAt: buildExpiresAt(tokens.expires_in),
      tokenType: tokens.token_type ?? null,
      scope: tokens.scope ?? null,
      idToken: tokens.id_token ?? null,
    };
  },
};

const xAdapter: OAuthProviderAdapter = {
  getAuthorizationUrl(context) {
    const env = getEnv().auth.oauth.x;

    if (!env.clientId || !env.clientSecret) {
      throw new Error('X OAuth is not configured.');
    }

    const url = new URL('https://twitter.com/i/oauth2/authorize');
    url.searchParams.set('client_id', env.clientId);
    url.searchParams.set('redirect_uri', context.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'tweet.read users.read offline.access');
    url.searchParams.set('state', context.state);
    url.searchParams.set('code_challenge', context.codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');

    return url.toString();
  },
  async exchangeCode(input) {
    const env = getEnv().auth.oauth.x;

    if (!env.clientId || !env.clientSecret) {
      throw new Error('X OAuth is not configured.');
    }

    const response = await fetch('https://api.x.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        authorization: `Basic ${Buffer.from(`${env.clientId}:${env.clientSecret}`).toString('base64')}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code: input.code,
        code_verifier: input.codeVerifier,
        grant_type: 'authorization_code',
        redirect_uri: input.redirectUri,
      }),
    });

    return readJsonOrThrow<TokenResponse>(response, 'X token exchange failed.');
  },
  async fetchProfile(tokens) {
    const accessToken = tokens.access_token;
    if (!accessToken) {
      throw new Error('X access token missing.');
    }

    const url = new URL('https://api.x.com/2/users/me');
    url.searchParams.set('user.fields', 'name,profile_image_url,username');

    const response = await fetch(url, {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });
    const profile = await readJsonOrThrow<{
      data?: {
        id?: string;
        name?: string;
        username?: string;
        profile_image_url?: string;
      };
    }>(response, 'X profile fetch failed.');

    if (!profile.data?.id) {
      throw new Error('X profile id missing.');
    }

    return {
      provider: 'x',
      providerAccountId: profile.data.id,
      email: null,
      emailVerified: false,
      isTrustedEmail: false,
      name: profile.data.name?.trim() || null,
      image: profile.data.profile_image_url?.trim() || null,
      username: profile.data.username?.trim() || null,
      accessToken,
      refreshToken: tokens.refresh_token ?? null,
      expiresAt: buildExpiresAt(tokens.expires_in),
      tokenType: tokens.token_type ?? null,
      scope: tokens.scope ?? null,
      idToken: tokens.id_token ?? null,
    };
  },
};

const providerAdapters: Record<AuthProvider, OAuthProviderAdapter> = {
  google: googleAdapter,
  facebook: facebookAdapter,
  x: xAdapter,
};

export function isAuthProvider(value: string): value is AuthProvider {
  return authProviders.includes(value as AuthProvider);
}

export function getOAuthProviderAdapter(provider: AuthProvider) {
  return providerAdapters[provider];
}
