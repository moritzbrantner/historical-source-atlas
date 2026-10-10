import {
  ADMIN_REPORT_LINKS,
  type AdminReportDeps,
  type AdminReportMetric,
  type AdminReportSummary,
  type AdminReportWindow,
  CHART_COLORS,
  type LoadedReportInputs,
  buildDailySeries,
  buildMetricChange,
  createDefaultDeps,
  createDegradedSummary,
  formatNumber,
  getUniqueCount,
  getWindowStart,
  isAdminAction,
  loadReportInputs,
  normalizeAdminVisits,
  toIsoDay,
} from './shared';

function buildAdminVisitSparkline(
  visits: ReturnType<typeof normalizeAdminVisits>,
  window: AdminReportWindow,
  generatedAt: Date,
) {
  const countsByDay = new Map<string, number>();

  for (const visit of visits) {
    const day = toIsoDay(visit.visitedAt);
    countsByDay.set(day, (countsByDay.get(day) ?? 0) + 1);
  }

  return buildDailySeries(
    'Admin visits',
    `Live admin visits across the current ${window} window.`,
    getWindowStart(window, generatedAt),
    generatedAt,
    [{ key: 'visits', label: 'Visits', color: CHART_COLORS.emerald }],
    'No admin visits in the selected window.',
    (row, day) => {
      row.visits = countsByDay.get(day) ?? 0;
    },
    'sparkline',
  );
}

function buildSummaryMetrics(input: LoadedReportInputs): AdminReportMetric[] {
  const currentAdminVisits = normalizeAdminVisits(input.current.visits);
  const previousAdminVisits = normalizeAdminVisits(input.previous.visits);
  const currentDeniedActions = input.current.auditLogs.filter(
    (log) =>
      isAdminAction(log.action) &&
      (log.outcome === 'denied' || log.outcome === 'rate_limited'),
  ).length;
  const previousDeniedActions = input.previous.auditLogs.filter(
    (log) =>
      isAdminAction(log.action) &&
      (log.outcome === 'denied' || log.outcome === 'rate_limited'),
  ).length;
  const currentActiveAdmins = getUniqueCount(
    currentAdminVisits.map((visit) => visit.userId),
  );
  const previousActiveAdmins = getUniqueCount(
    previousAdminVisits.map((visit) => visit.userId),
  );
  const currentFailedRetryingJobs = input.current.jobs.filter(
    (job) => job.status === 'failed' || job.status === 'retrying',
  ).length;
  const previousFailedRetryingJobs = input.previous.jobs.filter(
    (job) => job.status === 'failed' || job.status === 'retrying',
  ).length;

  return [
    {
      id: 'deniedAdminActions',
      label: 'Denied admin actions',
      value: formatNumber(currentDeniedActions),
      detail: 'Denied and rate-limited admin actions in the current window.',
      href: ADMIN_REPORT_LINKS.securityAccess,
      tone:
        currentDeniedActions >= 10
          ? 'critical'
          : currentDeniedActions > 0
            ? 'warning'
            : 'positive',
      change: buildMetricChange(
        currentDeniedActions,
        previousDeniedActions,
        input.window,
      ),
    },
    {
      id: 'activeAdminUsers',
      label: 'Active admin users',
      value: formatNumber(currentActiveAdmins),
      detail: 'Distinct admins who visited a normalized admin workspace.',
      href: ADMIN_REPORT_LINKS.workspaceAdoption,
      tone: currentActiveAdmins === 0 ? 'warning' : 'positive',
      change: buildMetricChange(
        currentActiveAdmins,
        previousActiveAdmins,
        input.window,
      ),
    },
    {
      id: 'adminVisits',
      label: 'Admin visits',
      value: formatNumber(currentAdminVisits.length),
      detail: 'Localized admin visits normalized into workspace traffic.',
      href: ADMIN_REPORT_LINKS.workspaceAdoption,
      tone: currentAdminVisits.length === 0 ? 'warning' : 'positive',
      change: buildMetricChange(
        currentAdminVisits.length,
        previousAdminVisits.length,
        input.window,
      ),
    },
    {
      id: 'failedRetryingJobs',
      label: 'Failed or retrying jobs',
      value: formatNumber(currentFailedRetryingJobs),
      detail: 'Current unhealthy jobs updated within the selected window.',
      href: ADMIN_REPORT_LINKS.schemaHealth,
      tone:
        currentFailedRetryingJobs >= 5
          ? 'critical'
          : currentFailedRetryingJobs > 0
            ? 'warning'
            : 'positive',
      change: buildMetricChange(
        currentFailedRetryingJobs,
        previousFailedRetryingJobs,
        input.window,
      ),
    },
  ];
}

export async function getAdminReportSummaryUseCase(
  window: AdminReportWindow,
  depsPromise: Promise<AdminReportDeps> = createDefaultDeps(),
): Promise<AdminReportSummary> {
  const deps = await depsPromise;
  const input = await loadReportInputs(window, deps, {
    includePreviousWindow: true,
  });

  if (input.status === 'degraded') {
    return createDegradedSummary(
      window,
      input.generatedAt,
      input.message ?? 'Data unavailable.',
    );
  }

  const currentAdminVisits = normalizeAdminVisits(input.current.visits);

  return {
    generatedAt: input.generatedAt.toISOString(),
    window,
    status: 'live',
    metrics: buildSummaryMetrics(input),
    series: [
      buildAdminVisitSparkline(currentAdminVisits, window, input.generatedAt),
    ],
  };
}

export type { AdminReportSummary } from './shared';
