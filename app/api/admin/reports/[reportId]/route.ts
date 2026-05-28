import {
  exportAdminReportUseCase,
  isAdminReportId,
  isAdminReportWindow,
  normalizeNavigationReportFilters,
  type AdminReportFormat,
} from '@/src/domain/admin-reports/use-cases';
import {
  createProblemResponse,
  invalidQueryProblem,
  notFoundProblem,
} from '@/src/http/errors';
import { createApiRoute } from '@/src/http/route';
import { getAdminAnalyticsSettings } from '@/src/site-config/service';

function resolveFormat(value: string | null): AdminReportFormat {
  return value === 'json' ? 'json' : 'csv';
}

export const GET = createApiRoute({
  action: 'admin.reports.export',
  featureKey: 'admin.reports',
  permission: 'admin.reports.export',
  async handler({ request, routeContext }) {
    const { params } = routeContext as {
      params: Promise<{ reportId: string }>;
    };
    const { reportId } = await params;

    if (!isAdminReportId(reportId)) {
      return createProblemResponse(notFoundProblem());
    }

    const url = new URL(request.url);
    const requestedWindow = url.searchParams.get('window');
    const analyticsSettings = await getAdminAnalyticsSettings();
    const window =
      requestedWindow ?? analyticsSettings.defaultAdminReportWindow;
    const format = resolveFormat(url.searchParams.get('format'));
    const filters = normalizeNavigationReportFilters({
      audience: url.searchParams.get('audience'),
      routeGroup: url.searchParams.get('routeGroup'),
      path: url.searchParams.get('path'),
    });

    if (!isAdminReportWindow(window)) {
      return createProblemResponse(
        invalidQueryProblem('Unsupported report window.', {
          window: ['Expected one of 24h, 7d, 30d.'],
        }),
      );
    }

    const exported = await exportAdminReportUseCase(
      reportId,
      window,
      format,
      undefined,
      filters,
    ).catch(() => ({
      filename: `${reportId}-${window}.${format}`,
      contentType:
        format === 'json'
          ? 'application/json; charset=utf-8'
          : 'text/csv; charset=utf-8',
      body:
        format === 'json'
          ? JSON.stringify(
              { reportId, error: 'Report data is temporarily unavailable.' },
              null,
              2,
            )
          : 'Message\nReport data is temporarily unavailable.',
    }));

    return new Response(exported.body, {
      headers: {
        'content-type': exported.contentType,
        'content-disposition': `attachment; filename="${exported.filename}"`,
      },
    });
  },
});
