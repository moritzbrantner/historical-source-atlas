import { describe, expect, it } from 'vitest';

import {
  createOAuthStateRecord,
  validateOAuthCallbackState,
} from '@/src/auth/oauth/cookies';
import { createPkcePair } from '@/src/auth/oauth/pkce';

describe('oauth state and pkce helpers', () => {
  it('creates a PKCE verifier and challenge pair', () => {
    const pair = createPkcePair();

    expect(pair.codeChallengeMethod).toBe('S256');
    expect(pair.codeVerifier).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(pair.codeChallenge).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(pair.codeChallenge).not.toBe(pair.codeVerifier);
  });

  it('creates expiring oauth state records', () => {
    const now = Date.now();
    const state = createOAuthStateRecord(now);

    expect(state.value.length).toBeGreaterThan(20);
    expect(state.expiresAt).toBeGreaterThan(now);
  });

  it('validates matching callback state and provider context', () => {
    const state = createOAuthStateRecord(1_000);
    const result = validateOAuthCallbackState({
      provider: 'google',
      queryState: state.value,
      storedState: state,
      storedProvider: 'google',
      codeVerifier: 'code-verifier',
      context: {
        locale: 'en',
        returnTo: '/login',
      },
      now: 1_500,
    });

    expect(result).toEqual({
      ok: true,
      data: {
        codeVerifier: 'code-verifier',
        context: {
          locale: 'en',
          returnTo: '/login',
        },
      },
    });
  });

  it('rejects expired and mismatched callback state', () => {
    const state = createOAuthStateRecord(1_000);

    expect(
      validateOAuthCallbackState({
        provider: 'google',
        queryState: state.value,
        storedState: state,
        storedProvider: 'facebook',
        codeVerifier: 'code-verifier',
        context: {
          locale: 'en',
          returnTo: '/login',
        },
        now: 1_500,
      }),
    ).toEqual({
      ok: false,
      error: 'provider_mismatch',
    });

    expect(
      validateOAuthCallbackState({
        provider: 'google',
        queryState: 'wrong-state',
        storedState: state,
        storedProvider: 'google',
        codeVerifier: 'code-verifier',
        context: {
          locale: 'en',
          returnTo: '/login',
        },
        now: 1_500,
      }),
    ).toEqual({
      ok: false,
      error: 'invalid_state',
    });

    expect(
      validateOAuthCallbackState({
        provider: 'google',
        queryState: state.value,
        storedState: state,
        storedProvider: 'google',
        codeVerifier: 'code-verifier',
        context: {
          locale: 'en',
          returnTo: '/login',
        },
        now: state.expiresAt,
      }),
    ).toEqual({
      ok: false,
      error: 'expired_state',
    });
  });
});
