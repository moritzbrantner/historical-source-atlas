import {
  type AdminReportDeps,
  type AdminReportDetail,
  type AdminReportId,
  type AdminReportWindow,
  assertReportId,
  createDefaultDeps,
  createDegradedDetail,
  loadReportInputs,
} from './shared';
import { buildSecurityAccessDetail } from './security-access';
import { buildAuditActivityDetail } from './audit-activity';
import { buildWorkspaceAdoptionDetail } from './workspace-adoption';
import { buildNavigationJourneyDetail } from './navigation-journeys';
import { buildSchemaHealthDetail } from './schema-health';

export async function getAdminReportDetailUseCase(
  reportId: AdminReportId,
  window: AdminReportWindow,
  depsPromise: Promise<AdminReportDeps> = createDefaultDeps(),
  filters?: {
    audience?: string | null;
    routeGroup?: string | null;
    path?: string | null;
  },
): Promise<AdminReportDetail> {
  assertReportId(reportId);
  const deps = await depsPromise;
  const input = await loadReportInputs(window, deps);

  if (input.status === 'degraded') {
    return createDegradedDetail(
      reportId,
      window,
      input.generatedAt,
      input.message ?? 'Data unavailable.',
    );
  }

  switch (reportId) {
    case 'securityAccess':
      return buildSecurityAccessDetail(input);
    case 'auditActivity':
      return buildAuditActivityDetail(input);
    case 'workspaceAdoption':
      return buildWorkspaceAdoptionDetail(input);
    case 'schemaHealth':
      return buildSchemaHealthDetail(input);
    case 'navigationJourneys':
      return buildNavigationJourneyDetail(input, filters);
    default:
      throw new Error(`Unsupported admin report id "${String(reportId)}".`);
  }
}

export type { AdminReportDetail } from './shared';
