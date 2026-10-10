import {
  type AdminReportBreakdown,
  type AdminReportDetail,
  CHART_COLORS,
  type LoadedReportInputs,
  buildDailySeries,
  buildRankedBreakdown,
  formatNumber,
  formatTimestamp,
  getWindowStart,
  isAdminAction,
  isPrivilegedAdminRole,
  toIsoDay,
} from './shared';

export function buildSecurityAccessDetail(
  input: LoadedReportInputs,
): AdminReportDetail {
  const now = input.generatedAt.getTime();
  const lockedUsers = input.users.filter(
    (user) => user.lockoutUntil && user.lockoutUntil.getTime() > now,
  );
  const incidents = input.current.auditLogs.filter(
    (log) =>
      isAdminAction(log.action) &&
      (log.outcome === 'denied' || log.outcome === 'rate_limited'),
  );
  const deniedCount = incidents.filter(
    (log) => log.outcome === 'denied',
  ).length;
  const rateLimitedCount = incidents.filter(
    (log) => log.outcome === 'rate_limited',
  ).length;
  const incidentCountsByDay = new Map<
    string,
    { denied: number; rateLimited: number }
  >();
  const actionCounts = new Map<string, number>();
  const actorCounts = new Map<string, number>();

  for (const incident of incidents) {
    const day = toIsoDay(incident.timestamp);
    const bucket = incidentCountsByDay.get(day) ?? {
      denied: 0,
      rateLimited: 0,
    };

    if (incident.outcome === 'rate_limited') {
      bucket.rateLimited += 1;
    } else {
      bucket.denied += 1;
    }

    incidentCountsByDay.set(day, bucket);
    actionCounts.set(
      incident.action,
      (actionCounts.get(incident.action) ?? 0) + 1,
    );

    const actorKey = incident.actorId ?? 'system';
    actorCounts.set(actorKey, (actorCounts.get(actorKey) ?? 0) + 1);
  }

  const series = buildDailySeries(
    'Denied and rate-limited actions',
    'Daily trend of denied and rate-limited admin actions.',
    getWindowStart(input.window, input.generatedAt),
    input.generatedAt,
    [
      { key: 'denied', label: 'Denied', color: CHART_COLORS.rose },
      { key: 'rateLimited', label: 'Rate limited', color: CHART_COLORS.amber },
    ],
    'No denied or rate-limited admin actions in the selected window.',
    (row, day) => {
      const bucket = incidentCountsByDay.get(day);
      row.denied = bucket?.denied ?? 0;
      row.rateLimited = bucket?.rateLimited ?? 0;
    },
    'area',
  );

  const actionRows = [...actionCounts.entries()]
    .sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
    )
    .slice(0, 8)
    .map<AdminReportBreakdown['rows'][number]>(([action, count]) => ({
      label: action,
      value: formatNumber(count),
      tone: count >= 5 ? 'critical' : 'warning',
    }));
  const actorRows = [...actorCounts.entries()]
    .sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
    )
    .slice(0, 8)
    .map<AdminReportBreakdown['rows'][number]>(([actor, count]) => ({
      label: actor,
      value: formatNumber(count),
      tone: count >= 5 ? 'critical' : 'warning',
    }));
  const rows = incidents
    .slice(0, 20)
    .map((log) => [
      formatTimestamp(log.timestamp),
      log.action,
      log.outcome,
      String(log.statusCode),
      log.actorId ?? 'system',
    ]);

  return {
    reportId: 'securityAccess',
    generatedAt: input.generatedAt.toISOString(),
    window: input.window,
    status: 'live',
    cards: [
      {
        id: 'adminAccounts',
        label: 'Admin accounts',
        value: formatNumber(
          input.users.filter((user) => isPrivilegedAdminRole(user.role)).length,
        ),
      },
      {
        id: 'lockedAccounts',
        label: 'Locked accounts',
        value: formatNumber(lockedUsers.length),
        detail:
          lockedUsers.length > 0
            ? 'Accounts currently under lockout.'
            : 'No active lockouts.',
        tone: lockedUsers.length > 0 ? 'warning' : 'positive',
      },
      {
        id: 'deniedAdminActions',
        label: 'Denied admin actions',
        value: formatNumber(deniedCount),
        tone: deniedCount > 0 ? 'critical' : 'positive',
      },
      {
        id: 'rateLimitedAdminActions',
        label: 'Rate-limited actions',
        value: formatNumber(rateLimitedCount),
        tone: rateLimitedCount > 0 ? 'warning' : 'positive',
      },
    ],
    series: [series],
    breakdowns: [
      buildRankedBreakdown(
        'security-actions',
        'Denied actions by endpoint',
        'Which admin actions generated the most denials or rate limits.',
        actionRows,
        'No denied or rate-limited actions in the selected window.',
      ),
      buildRankedBreakdown(
        'security-actors',
        'Actors with the most incidents',
        'Top actors involved in denied or rate-limited requests.',
        actorRows,
        'No denied or rate-limited actors in the selected window.',
      ),
    ],
    table: {
      columns: ['Timestamp', 'Action', 'Outcome', 'Status', 'Actor'],
      rows,
      emptyMessage:
        'No denied or rate-limited admin actions in the selected window.',
    },
  };
}
