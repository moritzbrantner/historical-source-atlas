import { describe, expect, it, vi } from 'vitest';

import {
  requestLoginOneTimePassword,
  verifyLoginOneTimePassword,
} from '@/src/auth/account-lifecycle';

type IssuedToken = {
  identifier: string;
  token: string;
  expires: Date;
};

function createOtpDeps() {
  const user = {
    id: 'user_otp',
    email: 'person@example.com',
    tag: 'person',
    name: 'Person',
    image: null,
    bannerImage: null,
    role: 'USER' as const,
    emailVerified: new Date() as Date | null,
    failedSignInAttempts: 0,
    lockoutUntil: null,
    disabledAt: null,
  };
  const issuedTokens: IssuedToken[] = [];

  return {
    user,
    issuedTokens,
    deps: {
      findUserByEmail: vi.fn(async (email: string) =>
        email === user.email ? user : undefined,
      ),
      findUserByTag: vi.fn(),
      createUser: vi.fn(),
      issueToken: vi.fn(async (input: IssuedToken) => {
        issuedTokens.push(input);
      }),
      findToken: vi.fn(async (token: string, identifierPrefix: string) =>
        issuedTokens.find(
          (record) =>
            record.token === token &&
            record.identifier.startsWith(identifierPrefix),
        ),
      ),
      deleteToken: vi.fn(async (token: string) => {
        const index = issuedTokens.findIndex(
          (record) => record.token === token,
        );
        if (index >= 0) {
          issuedTokens.splice(index, 1);
        }
      }),
      deleteTokensByIdentifierPrefix: vi.fn(
        async (identifierPrefix: string) => {
          for (let index = issuedTokens.length - 1; index >= 0; index -= 1) {
            if (issuedTokens[index]!.identifier.startsWith(identifierPrefix)) {
              issuedTokens.splice(index, 1);
            }
          }
        },
      ),
      markEmailVerified: vi.fn(),
      updatePassword: vi.fn(),
      updateFailureState: vi.fn(),
      clearFailureState: vi.fn(),
      findUserById: vi.fn(),
      hashPassword: vi.fn(),
      enqueueEmailJob: vi.fn(),
    },
  };
}

describe('login one-time passwords', () => {
  it('issues and emails a short-lived code without storing the raw value', async () => {
    const { deps, issuedTokens } = createOtpDeps();

    const result = await requestLoginOneTimePassword(
      ' Person@Example.com ',
      deps,
    );

    expect(result.code).toMatch(/^\d{6}$/);
    expect(deps.issueToken).toHaveBeenCalledWith({
      identifier: 'login-otp:user_otp',
      token: expect.any(String),
      expires: expect.any(Date),
    });
    expect(issuedTokens[0]!.token).not.toContain(result.code!);
    expect(deps.enqueueEmailJob).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'person@example.com',
        subject: 'Your login code',
        tags: ['login-otp'],
      }),
    );
  });

  it('verifies a code once and returns a session user payload', async () => {
    const { deps, user } = createOtpDeps();
    const request = await requestLoginOneTimePassword(user.email, deps);

    const result = await verifyLoginOneTimePassword(
      user.email,
      request.code!,
      deps,
    );

    expect(result).toEqual({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        tag: user.tag,
        name: user.name,
        image: user.image,
        bannerImage: user.bannerImage,
        role: user.role,
      },
    });
    expect(deps.markEmailVerified).toHaveBeenCalledWith(user.id);
    expect(deps.deleteToken).toHaveBeenCalledTimes(1);
    expect(deps.clearFailureState).toHaveBeenCalledWith(user.id);
  });

  it('does not reveal whether an email exists when requesting a code', async () => {
    const { deps } = createOtpDeps();

    const result = await requestLoginOneTimePassword(
      'missing@example.com',
      deps,
    );

    expect(result).toEqual({ ok: true });
    expect(deps.issueToken).not.toHaveBeenCalled();
    expect(deps.enqueueEmailJob).not.toHaveBeenCalled();
  });

  it('does not issue login codes for unverified accounts', async () => {
    const { deps, user } = createOtpDeps();
    user.emailVerified = null;

    const result = await requestLoginOneTimePassword(user.email, deps);

    expect(result).toEqual({ ok: true });
    expect(deps.issueToken).not.toHaveBeenCalled();
    expect(deps.enqueueEmailJob).not.toHaveBeenCalled();
  });
});
