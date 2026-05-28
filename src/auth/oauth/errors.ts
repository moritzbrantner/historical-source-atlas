export const oauthErrorCodes = [
  'access_denied',
  'missing_code',
  'invalid_state',
  'expired_state',
  'provider_mismatch',
  'missing_config',
  'token_exchange_failed',
  'profile_fetch_failed',
  'identity_resolution_failed',
] as const;

export type OAuthErrorCode = (typeof oauthErrorCodes)[number];

export function isOAuthErrorCode(
  value: string | null | undefined,
): value is OAuthErrorCode {
  return Boolean(value && oauthErrorCodes.includes(value as OAuthErrorCode));
}
