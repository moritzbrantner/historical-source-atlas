// Admin-report kernel shared by the per-report modules: contracts, formatting, data loading and
// degraded fallbacks. The public surface is ./use-cases (and ./contracts); import from there.
import type { AppRole } from '@/lib/authorization';
import { stripLocaleFromPathname } from '@/i18n/routing';
import {
  classifyNavigationPathname,
  navigationRouteGroups,
} from '@/src/analytics/navigation-classification';
import { getDb } from '@/src/db/client';
import { shouldUseDatabaseReadFallback } from '@/src/site-config/service';

export const adminReportIds = [
  'securityAccess',
  'auditActivity',
  'workspaceAdoption',
  'schemaHealth',
  'navigationJourneys',
] as const;
export type AdminReportId = (typeof adminReportIds)[number];

export const adminReportWindows = ['24h', '7d', '30d'] as const;
export type AdminReportWindow = (typeof adminReportWindows)[number];

export type AdminReportFormat = 'json' | 'csv';
export const navigationReportAudiences = [
  'all',
  'anonymous',
  'authenticated',
] as const;
export type NavigationReportAudience =
  (typeof navigationReportAudiences)[number];
export const navigationReportRouteGroups = [
  'all',
  ...navigationRouteGroups,
] as const;
export type NavigationReportRouteGroupFilter =
  (typeof navigationReportRouteGroups)[number];

export type AdminWorkspaceKey =
  | 'overview'
  | 'content'
  | 'reports'
  | 'users'
  | 'systemSettings'
  | 'dataStudio';

export type AdminReportStatus = 'live' | 'degraded';
export type AdminReportTone = 'neutral' | 'positive' | 'warning' | 'critical';

export type ReportUser = {
  id: string;
  role: AppRole;
  lockoutUntil: Date | null;
};

export type ReportAuditLog = {
  id: string;
  actorId: string | null;
  action: string;
  outcome: string;
  statusCode: number;
  metadata?: Record<string, unknown>;
  timestamp: Date;
};

export type ReportPageVisit = {
  id: string;
  userId: string | null;
  trackingVersion: number;
  visitorId: string;
  sessionId: string;
  pathname: string;
  href: string;
  canonicalPath: string;
  routeGroup: string;
  isAuthenticated: boolean;
  previousPathname: string | null;
  previousCanonicalPath: string | null;
  referrerType: string;
  referrerHost: string | null;
  visitedAt: Date;
};

export type ReportJob = {
  id: string;
  jobName: string;
  status: 'pending' | 'running' | 'retrying' | 'completed' | 'failed';
  attempts: number;
  lastError: string | null;
  runAt: Date;
  updatedAt: Date;
};

export type AdminReportMetricChange = {
  direction: 'up' | 'down' | 'flat';
  value: string;
  detail: string;
  rawDelta: number;
  percentChange: number | null;
};

export type AdminReportMetric = {
  id: string;
  label: string;
  value: string;
  detail: string;
  href?: string;
  tone?: AdminReportTone;
  change?: AdminReportMetricChange;
};

export type AdminReportCard = {
  id: string;
  label: string;
  value: string;
  detail?: string;
  tone?: AdminReportTone;
};

export type AdminReportSeries = {
  id: string;
  title: string;
  description: string;
  type: 'line' | 'bar' | 'area' | 'sparkline';
  xKey: string;
  data: Array<Record<string, number | string>>;
  categories: Array<{
    key: string;
    label: string;
    color: string;
  }>;
  emptyMessage: string;
};

export type AdminReportBreakdown = {
  id: string;
  title: string;
  description: string;
  rows: Array<{
    label: string;
    value: string;
    detail?: string;
    tone?: AdminReportTone;
  }>;
  emptyMessage: string;
};

export type AdminReportTable = {
  columns: string[];
  rows: string[][];
  emptyMessage: string;
};

export type AdminReportDetail = {
  reportId: AdminReportId;
  generatedAt: string;
  window: AdminReportWindow;
  status: AdminReportStatus;
  message?: string;
  cards: AdminReportCard[];
  series: AdminReportSeries[];
  breakdowns: AdminReportBreakdown[];
  table: AdminReportTable;
  tableTitle?: string;
  tableDescription?: string;
  filters?: {
    audience: NavigationReportAudience;
    routeGroup: NavigationReportRouteGroupFilter;
    path: string | null;
    pathOptions: string[];
  };
};

export type AdminReportSummary = {
  generatedAt: string;
  window: AdminReportWindow;
  status: AdminReportStatus;
  message?: string;
  metrics: AdminReportMetric[];
  series: AdminReportSeries[];
};

export type AdminReportExport = {
  filename: string;
  contentType: string;
  body: string;
};

export type AdminReportDeps = {
  listUsers: () => Promise<ReportUser[]>;
  listAuditLogsSince: (since: Date) => Promise<ReportAuditLog[]>;
  listPageVisitsSince: (since: Date) => Promise<ReportPageVisit[]>;
  listJobsSince: (since: Date) => Promise<ReportJob[]>;
};

export type ReportWindowData = {
  auditLogs: ReportAuditLog[];
  visits: ReportPageVisit[];
  jobs: ReportJob[];
};

export type LoadedReportInputs = {
  generatedAt: Date;
  window: AdminReportWindow;
  status: AdminReportStatus;
  message?: string;
  users: ReportUser[];
  current: ReportWindowData;
  previous: ReportWindowData;
};

export const numberFormatter = new Intl.NumberFormat('en-US');
export const signedNumberFormatter = new Intl.NumberFormat('en-US', {
  signDisplay: 'always',
  maximumFractionDigits: 0,
});
export const signedPercentFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  signDisplay: 'always',
  maximumFractionDigits: 0,
});

export const ADMIN_REPORT_LINKS: Record<AdminReportId, string> = {
  securityAccess: '/admin/reports/securityAccess',
  auditActivity: '/admin/reports/auditActivity',
  workspaceAdoption: '/admin/reports/workspaceAdoption',
  schemaHealth: '/admin/reports/schemaHealth',
  navigationJourneys: '/admin/reports/navigationJourneys',
};

export const ADMIN_WORKSPACE_SEGMENTS: Record<
  Exclude<AdminWorkspaceKey, 'overview'>,
  string
> = {
  content: 'content',
  reports: 'reports',
  users: 'users',
  systemSettings: 'system-settings',
  dataStudio: 'data-studio',
};

export const ADMIN_WORKSPACE_LABELS: Record<AdminWorkspaceKey, string> = {
  overview: 'Overview',
  content: 'Content',
  reports: 'Reports',
  users: 'Users',
  systemSettings: 'System settings',
  dataStudio: 'Data studio',
};

export const CHART_COLORS = {
  emerald: '#10b981',
  teal: '#14b8a6',
  amber: '#f59e0b',
  rose: '#f43f5e',
  blue: '#3b82f6',
  indigo: '#6366f1',
  zinc: '#71717a',
} as const;

export function isAdminReportId(value: string): value is AdminReportId {
  return adminReportIds.includes(value as AdminReportId);
}

export function isAdminReportWindow(value: string): value is AdminReportWindow {
  return adminReportWindows.includes(value as AdminReportWindow);
}

export function isNavigationReportAudience(
  value: string,
): value is NavigationReportAudience {
  return navigationReportAudiences.includes(value as NavigationReportAudience);
}

export function isNavigationReportRouteGroupFilter(
  value: string,
): value is NavigationReportRouteGroupFilter {
  return navigationReportRouteGroups.includes(
    value as NavigationReportRouteGroupFilter,
  );
}

export function normalizeNavigationReportFilters(input?: {
  audience?: string | null;
  routeGroup?: string | null;
  path?: string | null;
}) {
  const trimmedPath = input?.path?.trim() || null;

  return {
    audience:
      input?.audience && isNavigationReportAudience(input.audience)
        ? input.audience
        : 'all',
    routeGroup:
      input?.routeGroup && isNavigationReportRouteGroupFilter(input.routeGroup)
        ? input.routeGroup
        : 'all',
    path: trimmedPath
      ? classifyNavigationPathname(trimmedPath).canonicalPath
      : null,
  } satisfies {
    audience: NavigationReportAudience;
    routeGroup: NavigationReportRouteGroupFilter;
    path: string | null;
  };
}

export function getWindowDurationMs(window: AdminReportWindow) {
  switch (window) {
    case '24h':
      return 24 * 60 * 60 * 1000;
    case '30d':
      return 30 * 24 * 60 * 60 * 1000;
    case '7d':
    default:
      return 7 * 24 * 60 * 60 * 1000;
  }
}

export function getWindowStart(window: AdminReportWindow, end = new Date()) {
  return new Date(end.getTime() - getWindowDurationMs(window));
}

export function formatNumber(value: number) {
  return numberFormatter.format(value);
}

export function formatPercent(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    maximumFractionDigits,
  }).format(value);
}

export function formatTimestamp(value: Date | null | undefined) {
  return value ? value.toISOString() : 'N/A';
}

export function getUniqueCount(values: string[]) {
  return new Set(values.filter(Boolean)).size;
}

export function isAdminAction(action: string) {
  return action.startsWith('admin.');
}

export function isPrivilegedAdminRole(role: AppRole) {
  return role === 'ADMIN' || role === 'SUPERADMIN';
}

export function stripLocalePrefix(pathname: string) {
  return stripLocaleFromPathname(pathname);
}

export function getAdminWorkspaceKey(
  pathname: string,
): AdminWorkspaceKey | null {
  const normalizedPath = stripLocalePrefix(pathname).split(/[?#]/)[0] || '/';

  if (normalizedPath === '/admin' || normalizedPath === '/admin/') {
    return 'overview';
  }

  if (!normalizedPath.startsWith('/admin/')) {
    return null;
  }

  for (const [workspaceKey, segment] of Object.entries(
    ADMIN_WORKSPACE_SEGMENTS,
  ) as Array<[Exclude<AdminWorkspaceKey, 'overview'>, string]>) {
    if (
      normalizedPath === `/admin/${segment}` ||
      normalizedPath.startsWith(`/admin/${segment}/`)
    ) {
      return workspaceKey;
    }
  }

  return null;
}

export function toCsvCell(value: string) {
  const escaped = value.replaceAll('"', '""');
  return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
}

export function serializeAdminReportCsv(table: AdminReportTable) {
  return [table.columns, ...table.rows]
    .map((row) => row.map(toCsvCell).join(','))
    .join('\n');
}

export function assertReportId(
  reportId: string,
): asserts reportId is AdminReportId {
  if (!isAdminReportId(reportId)) {
    throw new Error(`Unsupported admin report id "${reportId}".`);
  }
}

export async function createDefaultDeps(): Promise<AdminReportDeps> {
  return {
    listUsers: async () => {
      return getDb().query.users.findMany({
        columns: {
          id: true,
          role: true,
          lockoutUntil: true,
        },
      });
    },
    listAuditLogsSince: async (since) => {
      const rows = await getDb().query.securityAuditLogs.findMany({
        where: (table, { gte }) => gte(table.timestamp, since),
        orderBy: (table, { desc }) => [desc(table.timestamp)],
      });

      return rows.map((row) => ({
        ...row,
        metadata:
          row.metadata &&
          typeof row.metadata === 'object' &&
          !Array.isArray(row.metadata)
            ? (row.metadata as Record<string, unknown>)
            : {},
      }));
    },
    listPageVisitsSince: async (since) => {
      return getDb().query.pageVisits.findMany({
        where: (table, { gte }) => gte(table.visitedAt, since),
        orderBy: (table, { desc }) => [desc(table.visitedAt)],
      });
    },
    listJobsSince: async (since) => {
      return getDb().query.jobOutbox.findMany({
        where: (table, { gte }) => gte(table.updatedAt, since),
        orderBy: (table, { desc }) => [desc(table.updatedAt)],
      });
    },
  };
}

export function filterByWindow<T>(
  records: T[],
  getDate: (record: T) => Date,
  start: Date,
  end: Date,
) {
  const startTime = start.getTime();
  const endTime = end.getTime();

  return records.filter((record) => {
    const timestamp = getDate(record).getTime();
    return timestamp >= startTime && timestamp < endTime;
  });
}

export function getReportLoadErrorMessage(errors: unknown[]) {
  if (errors.some((error) => shouldUseDatabaseReadFallback(error))) {
    return 'Data unavailable because analytics storage could not be read.';
  }

  return 'Data unavailable because live report inputs could not be loaded.';
}

export function emptyWindowData(): ReportWindowData {
  return {
    auditLogs: [],
    visits: [],
    jobs: [],
  };
}

export async function loadReportInputs(
  window: AdminReportWindow,
  deps: AdminReportDeps,
  options?: { includePreviousWindow?: boolean; now?: Date },
): Promise<LoadedReportInputs> {
  const generatedAt = options?.now ?? new Date();
  const includePreviousWindow = options?.includePreviousWindow ?? false;
  const currentStart = getWindowStart(window, generatedAt);
  const previousStart = includePreviousWindow
    ? new Date(currentStart.getTime() - getWindowDurationMs(window))
    : currentStart;

  const [usersResult, auditLogsResult, visitsResult, jobsResult] =
    await Promise.allSettled([
      deps.listUsers(),
      deps.listAuditLogsSince(previousStart),
      deps.listPageVisitsSince(previousStart),
      deps.listJobsSince(previousStart),
    ]);

  const errors = [usersResult, auditLogsResult, visitsResult, jobsResult]
    .filter(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    )
    .map((result) => result.reason);

  if (errors.length > 0) {
    return {
      generatedAt,
      window,
      status: 'degraded',
      message: getReportLoadErrorMessage(errors),
      users: [],
      current: emptyWindowData(),
      previous: emptyWindowData(),
    };
  }

  const users = usersResult.status === 'fulfilled' ? usersResult.value : [];
  const auditLogs =
    auditLogsResult.status === 'fulfilled' ? auditLogsResult.value : [];
  const visits = visitsResult.status === 'fulfilled' ? visitsResult.value : [];
  const jobs = jobsResult.status === 'fulfilled' ? jobsResult.value : [];

  return {
    generatedAt,
    window,
    status: 'live',
    users,
    current: {
      auditLogs: filterByWindow(
        auditLogs,
        (record) => record.timestamp,
        currentStart,
        generatedAt,
      ),
      visits: filterByWindow(
        visits,
        (record) => record.visitedAt,
        currentStart,
        generatedAt,
      ),
      jobs: filterByWindow(
        jobs,
        (record) => record.updatedAt,
        currentStart,
        generatedAt,
      ),
    },
    previous: includePreviousWindow
      ? {
          auditLogs: filterByWindow(
            auditLogs,
            (record) => record.timestamp,
            previousStart,
            currentStart,
          ),
          visits: filterByWindow(
            visits,
            (record) => record.visitedAt,
            previousStart,
            currentStart,
          ),
          jobs: filterByWindow(
            jobs,
            (record) => record.updatedAt,
            previousStart,
            currentStart,
          ),
        }
      : emptyWindowData(),
  };
}

export function buildMetricChange(
  current: number,
  previous: number,
  window: AdminReportWindow,
): AdminReportMetricChange {
  const rawDelta = current - previous;
  const percentChange = previous === 0 ? null : rawDelta / previous;

  return {
    direction: rawDelta === 0 ? 'flat' : rawDelta > 0 ? 'up' : 'down',
    value: signedNumberFormatter.format(rawDelta),
    detail:
      percentChange === null
        ? `vs previous ${window}; no prior baseline.`
        : `vs previous ${window} (${signedPercentFormatter.format(percentChange)})`,
    rawDelta,
    percentChange,
  };
}

export function createUnavailableMetric(
  id: string,
  label: string,
  href: string,
  message: string,
): AdminReportMetric {
  return {
    id,
    label,
    value: 'Data unavailable',
    detail: message,
    href,
    tone: 'warning',
  };
}

export function createUnavailableCard(
  id: string,
  label: string,
  message: string,
): AdminReportCard {
  return {
    id,
    label,
    value: 'Data unavailable',
    detail: message,
    tone: 'warning',
  };
}

export function toIsoDay(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function getUtcDayStart(value: Date) {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  );
}

export function listUtcDays(start: Date, end: Date) {
  const days: string[] = [];
  let cursor = getUtcDayStart(start);
  const endDay = getUtcDayStart(end);

  while (cursor.getTime() <= endDay.getTime()) {
    days.push(toIsoDay(cursor));
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
  }

  return days;
}

export function buildDailySeries(
  title: string,
  description: string,
  start: Date,
  end: Date,
  categories: AdminReportSeries['categories'],
  emptyMessage: string,
  reducer: (row: Record<string, number | string>, day: string) => void,
  type: AdminReportSeries['type'] = 'line',
): AdminReportSeries {
  const data = listUtcDays(start, end).map((day) => {
    const row = Object.fromEntries(
      categories.map((category) => [category.key, 0]),
    ) as Record<string, number | string>;
    row.label = day;
    reducer(row, day);
    return row;
  });

  return {
    id: title.toLowerCase().replaceAll(/\s+/g, '-'),
    title,
    description,
    type,
    xKey: 'label',
    data,
    categories,
    emptyMessage,
  };
}

export function buildRankedBreakdown(
  id: string,
  title: string,
  description: string,
  rows: AdminReportBreakdown['rows'],
  emptyMessage: string,
): AdminReportBreakdown {
  return {
    id,
    title,
    description,
    rows,
    emptyMessage,
  };
}

export function getAdminWorkspaceLabel(workspaceKey: AdminWorkspaceKey) {
  return ADMIN_WORKSPACE_LABELS[workspaceKey];
}

export function normalizeAdminVisits(visits: ReportPageVisit[]) {
  return visits
    .map((visit) => {
      if (!visit.userId) {
        return null;
      }

      const workspaceKey = getAdminWorkspaceKey(visit.pathname);

      if (!workspaceKey) {
        return null;
      }

      return {
        ...visit,
        workspaceKey,
        normalizedPath:
          stripLocalePrefix(visit.pathname).split(/[?#]/)[0] || '/',
      };
    })
    .filter(
      (
        visit,
      ): visit is ReportPageVisit & {
        userId: string;
        workspaceKey: AdminWorkspaceKey;
        normalizedPath: string;
      } => Boolean(visit),
    );
}

export function getMetadataValue(log: ReportAuditLog, key: string) {
  const metadataValue = log.metadata?.[key];
  return typeof metadataValue === 'string' && metadataValue.length > 0
    ? metadataValue
    : null;
}

export function createDegradedSummary(
  window: AdminReportWindow,
  generatedAt: Date,
  message: string,
): AdminReportSummary {
  return {
    generatedAt: generatedAt.toISOString(),
    window,
    status: 'degraded',
    message,
    metrics: [
      createUnavailableMetric(
        'deniedAdminActions',
        'Denied admin actions',
        ADMIN_REPORT_LINKS.securityAccess,
        message,
      ),
      createUnavailableMetric(
        'activeAdminUsers',
        'Active admin users',
        ADMIN_REPORT_LINKS.workspaceAdoption,
        message,
      ),
      createUnavailableMetric(
        'adminVisits',
        'Admin visits',
        ADMIN_REPORT_LINKS.workspaceAdoption,
        message,
      ),
      createUnavailableMetric(
        'failedRetryingJobs',
        'Failed or retrying jobs',
        ADMIN_REPORT_LINKS.schemaHealth,
        message,
      ),
    ],
    series: [
      {
        id: 'admin-visits-sparkline',
        title: 'Admin visit trend',
        description: 'Live admin visit volume over time.',
        type: 'sparkline',
        xKey: 'label',
        data: [],
        categories: [
          { key: 'visits', label: 'Visits', color: CHART_COLORS.emerald },
        ],
        emptyMessage: message,
      },
    ],
  };
}

export function createDegradedDetail(
  reportId: AdminReportId,
  window: AdminReportWindow,
  generatedAt: Date,
  message: string,
): AdminReportDetail {
  return {
    reportId,
    generatedAt: generatedAt.toISOString(),
    window,
    status: 'degraded',
    message,
    cards: [createUnavailableCard('reportStatus', 'Report status', message)],
    series: [],
    breakdowns: [],
    table: {
      columns: ['Message'],
      rows: [],
      emptyMessage: message,
    },
  };
}
