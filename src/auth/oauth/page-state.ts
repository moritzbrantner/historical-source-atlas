import type { AuthProvider } from '@/src/auth';
import { isOAuthErrorCode, type OAuthErrorCode } from '@/src/auth/oauth/errors';
import { isAuthProvider } from '@/src/auth/oauth/providers';

function getQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function resolveOAuthPageError(
  searchParams: Record<string, string | string[] | undefined> | undefined,
): {
  provider: AuthProvider;
  error: OAuthErrorCode;
} | null {
  const provider = getQueryValue(searchParams?.oauthProvider);
  const error = getQueryValue(searchParams?.oauthError);

  if (
    !provider ||
    !error ||
    !isAuthProvider(provider) ||
    !isOAuthErrorCode(error)
  ) {
    return null;
  }

  return { provider, error };
}
