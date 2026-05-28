import {
  isProblemReportStatus,
  listProblemReports,
  problemReportAreas,
  type ProblemReportArea,
} from '@/src/domain/support/problem-reports';
import { createApiRoute } from '@/src/http/route';

function isProblemReportArea(value: string | null): value is ProblemReportArea {
  return problemReportAreas.includes(value as ProblemReportArea);
}

export const GET = createApiRoute({
  action: 'admin.problemReports.list',
  permission: 'admin.problemReports.read',
  async handler({ request }) {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const area = url.searchParams.get('area');
    const reports = await listProblemReports({
      status: isProblemReportStatus(status) ? status : undefined,
      area: isProblemReportArea(area) ? area : undefined,
    });

    return { reports };
  },
});
