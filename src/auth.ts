import type { AppRole } from '@/lib/authorization';

export const authProviders = ['google', 'facebook', 'x'] as const;

export type AuthProvider = (typeof authProviders)[number];

export type AppSessionUser = {
  id: string;
  email: string | null;
  tag: string | null;
  name: string | null;
  image: string | null;
  bannerImage: string | null;
  role: AppRole;
};

export type AppSession = {
  user: AppSessionUser;
};
