import {
  type AdminReportDeps,
  type AdminReportExport,
  type AdminReportFormat,
  type AdminReportId,
  type AdminReportWindow,
  createDefaultDeps,
  serializeAdminReportCsv,
} from './shared';
import { getAdminReportDetailUseCase } from './detail';

export async function exportAdminReportUseCase(
  reportId: AdminReportId,
  window: AdminReportWindow,
  format: AdminReportFormat,
  depsPromise: Promise<AdminReportDeps> = createDefaultDeps(),
  filters?: {
    audience?: string | null;
    routeGroup?: string | null;
    path?: string | null;
  },
): Promise<AdminReportExport> {
  const detail = await getAdminReportDetailUseCase(
    reportId,
    window,
    depsPromise,
    filters,
  );
  const baseFilename = `${reportId}-${window}`;

  if (format === 'json') {
    return {
      filename: `${baseFilename}.json`,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify(detail, null, 2),
    };
  }

  return {
    filename: `${baseFilename}.csv`,
    contentType: 'text/csv; charset=utf-8',
    body: serializeAdminReportCsv(detail.table),
  };
}

export { serializeAdminReportCsv } from './shared';
export type { AdminReportExport, AdminReportTable } from './shared';
