import { afterEach, describe, expect, it, vi } from 'vitest';

function mockForbiddenApiRouteDependencies() {
  vi.doMock('@/src/api/security', () => ({
    auditAction: vi.fn().mockResolvedValue(undefined),
    enforceRateLimit: vi
      .fn()
      .mockResolvedValue({ ok: true, remaining: 10, resetAt: 0 }),
    getRateLimitKey: vi.fn().mockReturnValue('test'),
  }));
  vi.doMock('@/src/auth.server', () => ({
    getAuthSession: vi.fn().mockResolvedValue({
      user: { id: 'user_1', role: 'USER' },
    }),
  }));
  vi.doMock('@/src/domain/authorization/service', () => ({
    hasPermissionForRole: vi.fn().mockResolvedValue(false),
  }));
}

afterEach(() => {
  vi.resetModules();
  vi.doUnmock('@/src/api/security');
  vi.doUnmock('@/src/auth.server');
  vi.doUnmock('@/src/domain/authorization/service');
  vi.doUnmock('@/src/domain/support/problem-reports');
});

describe('admin problem report routes', () => {
  it('rejects non-admin list access before reading reports', async () => {
    const listProblemReports = vi.fn();
    mockForbiddenApiRouteDependencies();
    vi.doMock('@/src/domain/support/problem-reports', async () => {
      const actual = await vi.importActual<
        typeof import('@/src/domain/support/problem-reports')
      >('@/src/domain/support/problem-reports');
      return {
        ...actual,
        listProblemReports,
      };
    });

    const route = await import('@/app/api/admin/problem-reports/route');
    const response = await route.GET(
      new Request('https://app.example.com/api/admin/problem-reports'),
    );

    expect(response.status).toBe(403);
    expect(listProblemReports).not.toHaveBeenCalled();
  });

  it('rejects non-admin detail access before reading reports', async () => {
    const getProblemReportById = vi.fn();
    mockForbiddenApiRouteDependencies();
    vi.doMock('@/src/domain/support/problem-reports', async () => {
      const actual = await vi.importActual<
        typeof import('@/src/domain/support/problem-reports')
      >('@/src/domain/support/problem-reports');
      return {
        ...actual,
        getProblemReportById,
      };
    });

    const route =
      await import('@/app/api/admin/problem-reports/[reportId]/route');
    const response = await route.GET(
      new Request('https://app.example.com/api/admin/problem-reports/report_1'),
      {
        params: Promise.resolve({ reportId: 'report_1' }),
      },
    );

    expect(response.status).toBe(403);
    expect(getProblemReportById).not.toHaveBeenCalled();
  });
});
