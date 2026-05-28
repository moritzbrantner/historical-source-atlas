import { afterEach, describe, expect, it, vi } from 'vitest';

function mockApiRouteDependencies() {
  vi.doMock('@/src/api/security', () => ({
    auditAction: vi.fn().mockResolvedValue(undefined),
    enforceRateLimit: vi
      .fn()
      .mockResolvedValue({ ok: true, remaining: 10, resetAt: 0 }),
    getRateLimitKey: vi.fn().mockReturnValue('test'),
  }));
  vi.doMock('@/src/auth.server', () => ({
    getAuthSession: vi.fn().mockResolvedValue(null),
  }));
  vi.doMock('@/src/foundation/features/access', () => ({
    isFeatureEnabledForUser: vi.fn().mockResolvedValue(true),
  }));
}

afterEach(() => {
  vi.resetModules();
  vi.doUnmock('@/src/api/security');
  vi.doUnmock('@/src/auth.server');
  vi.doUnmock('@/src/foundation/features/access');
  vi.doUnmock('@/src/domain/support/problem-reports');
});

describe('problem report route', () => {
  it('persists valid reports through the support domain', async () => {
    const createProblemReport = vi.fn().mockResolvedValue({
      ok: true,
      value: {
        id: 'report_1',
        referenceId: 'PRB-12345678',
      },
    });
    mockApiRouteDependencies();
    vi.doMock('@/src/domain/support/problem-reports', () => ({
      createProblemReport,
    }));

    const route = await import('@/app/api/report-problem/route');
    const formData = new FormData();
    formData.set('name', 'Ada');
    formData.set('email', 'ada@example.com');
    formData.set('area', 'bug');
    formData.set('pageUrl', 'https://app.example.com/settings');
    formData.set('subject', 'Settings modal closes');
    formData.set(
      'details',
      'Saving settings closes the modal before the success message can be reviewed.',
    );

    const response = await route.POST(
      new Request('https://app.example.com/api/report-problem', {
        method: 'POST',
        headers: { origin: 'https://app.example.com' },
        body: formData,
      }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      referenceId: 'PRB-12345678',
    });
    expect(createProblemReport).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'ada@example.com',
        area: 'bug',
      }),
    );
  });

  it('does not persist invalid reports', async () => {
    const createProblemReport = vi.fn().mockResolvedValue({
      ok: false,
      error: 'Please complete the form.',
    });
    mockApiRouteDependencies();
    vi.doMock('@/src/domain/support/problem-reports', () => ({
      createProblemReport,
    }));

    const route = await import('@/app/api/report-problem/route');
    const formData = new FormData();
    formData.set('email', 'invalid');

    const response = await route.POST(
      new Request('https://app.example.com/api/report-problem', {
        method: 'POST',
        headers: { origin: 'https://app.example.com' },
        body: formData,
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Please complete the form.',
    });
    expect(createProblemReport).toHaveBeenCalledTimes(1);
  });
});
