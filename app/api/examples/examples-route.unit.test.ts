import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/src/auth.server', () => ({
  getAuthSession: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/src/api/security', () => ({
  auditAction: vi.fn().mockResolvedValue(undefined),
  enforceRateLimit: vi.fn().mockResolvedValue({
    ok: true,
    remaining: 29,
    resetAt: 1_700_000_000_000,
  }),
  getRateLimitKey: vi.fn().mockReturnValue('ip:test'),
}));

afterEach(() => {
  vi.resetModules();
  vi.doUnmock('@/src/foundation/features/access');
});

describe('example API route', () => {
  it('serves registered showcase API handlers', async () => {
    vi.doMock('@/src/foundation/features/access', () => ({
      isSiteFeatureEnabled: vi.fn().mockResolvedValue(true),
    }));

    const route = await import('@/app/api/examples/[...path]/route');
    const response = await route.GET(
      new Request('https://app.example.com/api/examples/employees'),
      {
        params: Promise.resolve({ path: ['employees'] }),
      },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 101,
          firstName: 'Ava',
          lastName: 'Thompson',
        }),
      ]),
    );
  });

  it('hides registered API handlers when their feature is disabled', async () => {
    vi.doMock('@/src/foundation/features/access', () => ({
      isSiteFeatureEnabled: vi.fn().mockResolvedValue(false),
    }));

    const route = await import('@/app/api/examples/[...path]/route');
    const response = await route.GET(
      new Request('https://app.example.com/api/examples/employees'),
      {
        params: Promise.resolve({ path: ['employees'] }),
      },
    );

    expect(response.status).toBe(404);
  });
});
