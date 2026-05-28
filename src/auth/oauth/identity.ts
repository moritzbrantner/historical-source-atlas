import type { AppRole } from '@/lib/authorization';
import { getDb } from '@/src/db/client';
import { accounts, users } from '@/src/db/schema';
import { getInitialProfileTagCandidates } from '@/src/profile/tags';
import type { NormalizedOAuthProfile } from '@/src/auth/oauth/types';

type ResolvedSessionUser = {
  id: string;
  email: string | null;
  tag: string;
  name: string | null;
  image: string | null;
  bannerImage: string | null;
  role: AppRole;
};

type PersistedUser = ResolvedSessionUser;

type PersistedAccount = {
  userId: string;
};

type IdentityTransaction = {
  findAccountByProviderId: (
    provider: string,
    providerAccountId: string,
  ) => Promise<PersistedAccount | undefined>;
  findUserById: (userId: string) => Promise<PersistedUser | undefined>;
  findUserByEmail: (email: string) => Promise<PersistedUser | undefined>;
  findUserByTag: (tag: string) => Promise<PersistedUser | undefined>;
  createUser: (input: {
    id: string;
    email: string | null;
    tag: string;
    name: string | null;
    image: string | null;
    passwordHash: string | null;
    emailVerified: Date | null;
  }) => Promise<void>;
  upsertAccount: (input: {
    userId: string;
    provider: string;
    providerAccountId: string;
    accessToken: string | null;
    refreshToken: string | null;
    expiresAt: number | null;
    tokenType: string | null;
    scope: string | null;
    idToken: string | null;
  }) => Promise<void>;
};

type SocialAccountResolverDependencies = {
  transaction: <TResult>(
    callback: (tx: IdentityTransaction) => Promise<TResult>,
  ) => Promise<TResult>;
};

function resolveDefaultDependencies(): SocialAccountResolverDependencies {
  const db = getDb();

  return {
    transaction: async (callback) =>
      db.transaction(async (tx) => {
        return callback({
          findAccountByProviderId: async (provider, providerAccountId) => {
            const account = await tx.query.accounts.findFirst({
              where: (table, { and, eq }) =>
                and(
                  eq(table.provider, provider),
                  eq(table.providerAccountId, providerAccountId),
                ),
            });

            return account
              ? {
                  userId: account.userId,
                }
              : undefined;
          },
          findUserById: async (userId) => {
            const user = await tx.query.users.findFirst({
              where: (table, { eq }) => eq(table.id, userId),
            });

            return user
              ? {
                  id: user.id,
                  email: user.email,
                  tag: user.tag,
                  name: user.name,
                  image: user.image,
                  bannerImage: user.bannerImage,
                  role: user.role,
                }
              : undefined;
          },
          findUserByEmail: async (email) => {
            const user = await tx.query.users.findFirst({
              where: (table, { eq }) => eq(table.email, email),
            });

            return user
              ? {
                  id: user.id,
                  email: user.email,
                  tag: user.tag,
                  name: user.name,
                  image: user.image,
                  bannerImage: user.bannerImage,
                  role: user.role,
                }
              : undefined;
          },
          findUserByTag: async (tag) => {
            const user = await tx.query.users.findFirst({
              where: (table, { eq }) => eq(table.tag, tag),
            });

            return user
              ? {
                  id: user.id,
                  email: user.email,
                  tag: user.tag,
                  name: user.name,
                  image: user.image,
                  bannerImage: user.bannerImage,
                  role: user.role,
                }
              : undefined;
          },
          createUser: async (input) => {
            await tx.insert(users).values({
              id: input.id,
              email: input.email,
              tag: input.tag,
              name: input.name,
              image: input.image,
              passwordHash: input.passwordHash,
              emailVerified: input.emailVerified,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          },
          upsertAccount: async (input) => {
            await tx
              .insert(accounts)
              .values({
                userId: input.userId,
                type: 'oauth',
                provider: input.provider,
                providerAccountId: input.providerAccountId,
                access_token: input.accessToken,
                refresh_token: input.refreshToken,
                expires_at: input.expiresAt,
                token_type: input.tokenType,
                scope: input.scope,
                id_token: input.idToken,
              })
              .onConflictDoUpdate({
                target: [accounts.provider, accounts.providerAccountId],
                set: {
                  userId: input.userId,
                  type: 'oauth',
                  access_token: input.accessToken,
                  refresh_token: input.refreshToken,
                  expires_at: input.expiresAt,
                  token_type: input.tokenType,
                  scope: input.scope,
                  id_token: input.idToken,
                },
              });
          },
        });
      }),
  };
}

async function findAvailableTag(
  tx: IdentityTransaction,
  input: {
    userId: string;
    email?: string | null;
    name?: string | null;
    username?: string | null;
  },
) {
  for (const candidate of getInitialProfileTagCandidates(input)) {
    if (!(await tx.findUserByTag(candidate))) {
      return candidate;
    }
  }

  return null;
}

function toAccountInsert(userId: string, profile: NormalizedOAuthProfile) {
  return {
    userId,
    provider: profile.provider,
    providerAccountId: profile.providerAccountId,
    accessToken: profile.accessToken,
    refreshToken: profile.refreshToken,
    expiresAt: profile.expiresAt,
    tokenType: profile.tokenType,
    scope: profile.scope,
    idToken: profile.idToken,
  };
}

export async function resolveSocialAccount(
  profile: NormalizedOAuthProfile,
  deps: SocialAccountResolverDependencies = resolveDefaultDependencies(),
): Promise<ResolvedSessionUser> {
  return deps.transaction(async (tx) => {
    const existingAccount = await tx.findAccountByProviderId(
      profile.provider,
      profile.providerAccountId,
    );

    if (existingAccount) {
      await tx.upsertAccount(toAccountInsert(existingAccount.userId, profile));

      const existingUser = await tx.findUserById(existingAccount.userId);

      if (!existingUser) {
        throw new Error('OAuth account user missing.');
      }

      return existingUser;
    }

    let resolvedUser =
      profile.isTrustedEmail && profile.email
        ? await tx.findUserByEmail(profile.email)
        : undefined;

    if (!resolvedUser) {
      const userId = crypto.randomUUID();
      const tag = await findAvailableTag(tx, {
        userId,
        email: profile.email,
        name: profile.name,
        username: profile.username,
      });

      if (!tag) {
        throw new Error('Unable to allocate a profile tag.');
      }

      await tx.createUser({
        id: userId,
        email: profile.email,
        tag,
        name: profile.name,
        image: profile.image,
        passwordHash: null,
        emailVerified:
          profile.isTrustedEmail && profile.email ? new Date() : null,
      });

      resolvedUser = await tx.findUserById(userId);
    }

    if (!resolvedUser) {
      throw new Error('OAuth user resolution failed.');
    }

    await tx.upsertAccount(toAccountInsert(resolvedUser.id, profile));

    return resolvedUser;
  });
}
