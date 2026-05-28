import type { AuthProvider } from '@/src/auth';

export type NormalizedOAuthProfile = {
  provider: AuthProvider;
  providerAccountId: string;
  email: string | null;
  emailVerified: boolean;
  isTrustedEmail: boolean;
  name: string | null;
  image: string | null;
  username: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  tokenType: string | null;
  scope: string | null;
  idToken: string | null;
};

export type AccountCapabilities = {
  hasPassword: boolean;
  canManageEmailWithPassword: boolean;
  canDeleteWithPassword: boolean;
};
