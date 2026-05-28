import { describe, expect, it, vi } from 'vitest';

import { resolveSocialAccount } from '@/src/auth/oauth/identity';
import type { NormalizedOAuthProfile } from '@/src/auth/oauth/types';

function createIdentityHarness() {
  const findAccountByProviderId = vi.fn();
  const findUserById = vi.fn();
  const findUserByEmail = vi.fn();
  const findUserByTag = vi.fn();
  const createUser = vi.fn(async (value: Record<string, unknown>) => {
    insertedUsers.push(value);
  });
  const upsertAccount = vi.fn(async (value: Record<string, unknown>) => {
    upsertedAccounts.push(value);
  });
  const insertedUsers: Array<Record<string, unknown>> = [];
  const upsertedAccounts: Array<Record<string, unknown>> = [];

  return {
    findAccountByProviderId,
    findUserById,
    findUserByEmail,
    findUserByTag,
    createUser,
    upsertAccount,
    insertedUsers,
    upsertedAccounts,
    deps: {
      transaction: async <TResult>(
        callback: (tx: {
          findAccountByProviderId: typeof findAccountByProviderId;
          findUserById: typeof findUserById;
          findUserByEmail: typeof findUserByEmail;
          findUserByTag: typeof findUserByTag;
          createUser: typeof createUser;
          upsertAccount: typeof upsertAccount;
        }) => Promise<TResult>,
      ) =>
        callback({
          findAccountByProviderId,
          findUserById,
          findUserByEmail,
          findUserByTag,
          createUser,
          upsertAccount,
        }),
    },
  };
}

const baseProfile: NormalizedOAuthProfile = {
  provider: 'google',
  providerAccountId: 'provider-user-1',
  email: 'person@example.com',
  emailVerified: true,
  isTrustedEmail: true,
  name: 'Person Example',
  image: 'https://example.com/avatar.png',
  username: null,
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  expiresAt: 123456,
  tokenType: 'Bearer',
  scope: 'openid profile email',
  idToken: 'id-token',
};

describe('oauth identity resolution', () => {
  it('signs in through an existing provider account mapping', async () => {
    const harness = createIdentityHarness();
    harness.findAccountByProviderId.mockResolvedValue({
      userId: 'user_1',
    });
    harness.findUserById.mockResolvedValue({
      id: 'user_1',
      email: 'person@example.com',
      tag: 'person',
      name: 'Person Example',
      image: null,
      role: 'USER',
    });

    const result = await resolveSocialAccount(baseProfile, harness.deps);

    expect(result).toEqual({
      id: 'user_1',
      email: 'person@example.com',
      tag: 'person',
      name: 'Person Example',
      image: null,
      role: 'USER',
    });
    expect(harness.upsertedAccounts).toHaveLength(1);
    expect(harness.insertedUsers).toHaveLength(0);
  });

  it('auto-links a trusted provider email to an existing user', async () => {
    const harness = createIdentityHarness();
    harness.findAccountByProviderId.mockResolvedValue(undefined);
    harness.findUserByEmail.mockResolvedValue({
      id: 'user_2',
      email: 'person@example.com',
      tag: 'existing-user',
      name: 'Existing User',
      image: null,
      role: 'USER',
    });

    const result = await resolveSocialAccount(baseProfile, harness.deps);

    expect(result.id).toBe('user_2');
    expect(harness.insertedUsers).toHaveLength(0);
    expect(harness.upsertedAccounts[0]).toMatchObject({
      userId: 'user_2',
      provider: 'google',
      providerAccountId: 'provider-user-1',
    });
  });

  it('creates a new passwordless account when the provider has no email', async () => {
    const harness = createIdentityHarness();
    harness.findAccountByProviderId.mockResolvedValue(undefined);
    harness.findUserByTag
      .mockResolvedValueOnce(undefined)
      .mockResolvedValue(undefined);
    harness.findUserById.mockResolvedValueOnce({
      id: 'user_new',
      email: null,
      tag: 'sample_handle',
      name: 'Sample Person',
      image: 'https://example.com/avatar.png',
      role: 'USER',
    });

    const result = await resolveSocialAccount(
      {
        ...baseProfile,
        provider: 'x',
        providerAccountId: 'x-user-1',
        email: null,
        emailVerified: false,
        isTrustedEmail: false,
        username: 'sample_handle',
        scope: 'tweet.read users.read',
      },
      harness.deps,
    );

    expect(result).toEqual({
      id: 'user_new',
      email: null,
      tag: 'sample_handle',
      name: 'Sample Person',
      image: 'https://example.com/avatar.png',
      role: 'USER',
    });
    expect(harness.insertedUsers[0]).toMatchObject({
      email: null,
      name: 'Person Example',
      image: 'https://example.com/avatar.png',
      passwordHash: null,
    });
    expect(harness.upsertedAccounts[0]).toMatchObject({
      userId: 'user_new',
      provider: 'x',
      providerAccountId: 'x-user-1',
    });
  });

  it('returns to the same user on repeated no-email sign-ins via the account table', async () => {
    const harness = createIdentityHarness();
    harness.findAccountByProviderId.mockResolvedValue({
      userId: 'user_x',
    });
    harness.findUserById.mockResolvedValue({
      id: 'user_x',
      email: null,
      tag: 'sample_handle',
      name: 'Sample Person',
      image: null,
      role: 'USER',
    });

    const result = await resolveSocialAccount(
      {
        ...baseProfile,
        provider: 'x',
        providerAccountId: 'x-user-1',
        email: null,
        emailVerified: false,
        isTrustedEmail: false,
        username: 'sample_handle',
      },
      harness.deps,
    );

    expect(result.id).toBe('user_x');
    expect(harness.insertedUsers).toHaveLength(0);
    expect(harness.upsertedAccounts).toHaveLength(1);
  });
});
