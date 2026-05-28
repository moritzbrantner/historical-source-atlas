import {
  getProblemReportById,
  isProblemReportStatus,
  updateProblemReport,
} from '@/src/domain/support/problem-reports';
import { createApiRoute } from '@/src/http/route';

export const GET = createApiRoute({
  action: 'admin.problemReports.read',
  permission: 'admin.problemReports.read',
  async handler({ routeContext }) {
    const { params } = routeContext as {
      params: Promise<{ reportId: string }>;
    };
    const { reportId } = await params;

    const report = await getProblemReportById(reportId);

    if (!report) {
      return Response.json(
        { error: 'Problem report not found.' },
        { status: 404 },
      );
    }

    return { report };
  },
});

export const PATCH = createApiRoute({
  action: 'admin.problemReports.update',
  permission: 'admin.problemReports.update',
  async handler({ request, routeContext }) {
    const { params } = routeContext as {
      params: Promise<{ reportId: string }>;
    };
    const { reportId } = await params;

    const body = (await request.json().catch(() => null)) as {
      status?: string;
      adminNote?: string | null;
    } | null;

    if (!isProblemReportStatus(body?.status)) {
      return Response.json(
        { error: 'A valid problem report status is required.' },
        { status: 400 },
      );
    }

    const report = await updateProblemReport({
      reportId,
      status: body.status,
      adminNote: body.adminNote,
    });

    if (!report) {
      return Response.json(
        { error: 'Problem report not found.' },
        { status: 404 },
      );
    }

    return { report };
  },
});
