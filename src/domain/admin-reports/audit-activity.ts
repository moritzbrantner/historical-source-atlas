import {
  type AdminReportBreakdown,
  type AdminReportDetail,
  CHART_COLORS,
  type LoadedReportInputs,
  buildDailySeries,
  buildRankedBreakdown,
  formatNumber,
  formatPercent,
  formatTimestamp,
  getUniqueCount,
  getWindowStart,
  toIsoDay,
} from './shared';

export function buildAuditActivityDetail(
  input: LoadedReportInputs,
): AdminReportDetail {
  const auditLogs = input.current.auditLogs;
  const denialCount = auditLogs.filter(
    (log) => log.outcome === 'denied',
  ).length;
  const errorCount = auditLogs.filter((log) => log.outcome === 'error').length;
  const rateLimitedCount = auditLogs.filter(
    (log) => log.outcome === 'rate_limited',
  ).length;
  const riskyActionCounts = new Map<string, number>();
  const outcomeCountsByDay = new Map<
    string,
    Record<'allowed' | 'denied' | 'error' | 'rateLimited', number>
  >();

  for (const log of auditLogs) {
    const day = toIsoDay(log.timestamp);
    const bucket = outcomeCountsByDay.get(day) ?? {
      allowed: 0,
      denied: 0,
      error: 0,
      rateLimited: 0,
    };

    if (log.outcome === 'denied') {
      bucket.denied += 1;
      riskyActionCounts.set(
        log.action,
        (riskyActionCounts.get(log.action) ?? 0) + 1,
      );
    } else if (log.outcome === 'error') {
      bucket.error += 1;
      riskyActionCounts.set(
        log.action,
        (riskyActionCounts.get(log.action) ?? 0) + 1,
      );
    } else if (log.outcome === 'rate_limited') {
      bucket.rateLimited += 1;
      riskyActionCounts.set(
        log.action,
        (riskyActionCounts.get(log.action) ?? 0) + 1,
      );
    } else {
      bucket.allowed += 1;
    }

    outcomeCountsByDay.set(day, bucket);
  }

  const totalEvents = auditLogs.length;
  const series = buildDailySeries(
    'Audit activity by outcome',
    'Daily audit volume split by outcome.',
    getWindowStart(input.window, input.generatedAt),
    input.generatedAt,
    [
      { key: 'allowed', label: 'Allowed', color: CHART_COLORS.emerald },
      { key: 'denied', label: 'Denied', color: CHART_COLORS.rose },
      { key: 'error', label: 'Error', color: CHART_COLORS.indigo },
      { key: 'rateLimited', label: 'Rate limited', color: CHART_COLORS.amber },
    ],
    'No audit activity in the selected window.',
    (row, day) => {
      const bucket = outcomeCountsByDay.get(day);
      row.allowed = bucket?.allowed ?? 0;
      row.denied = bucket?.denied ?? 0;
      row.error = bucket?.error ?? 0;
      row.rateLimited = bucket?.rateLimited ?? 0;
    },
    'line',
  );

  const riskyRows = [...riskyActionCounts.entries()]
    .sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
    )
    .slice(0, 8)
    .map<AdminReportBreakdown['rows'][number]>(([action, count]) => ({
      label: action,
      value: formatNumber(count),
      tone: count >= 5 ? 'critical' : 'warning',
    }));
  const shareRows: AdminReportBreakdown['rows'] = [
    {
      label: 'Denied share',
      value:
        totalEvents === 0 ? '0%' : formatPercent(denialCount / totalEvents),
      detail: `${formatNumber(denialCount)} of ${formatNumber(totalEvents)} events`,
      tone: denialCount > 0 ? 'warning' : 'positive',
    },
    {
      label: 'Error share',
      value: totalEvents === 0 ? '0%' : formatPercent(errorCount / totalEvents),
      detail: `${formatNumber(errorCount)} of ${formatNumber(totalEvents)} events`,
      tone: errorCount > 0 ? 'warning' : 'positive',
    },
    {
      label: 'Rate-limited share',
      value:
        totalEvents === 0
          ? '0%'
          : formatPercent(rateLimitedCount / totalEvents),
      detail: `${formatNumber(rateLimitedCount)} of ${formatNumber(totalEvents)} events`,
      tone: rateLimitedCount > 0 ? 'warning' : 'positive',
    },
  ];
  const rows = auditLogs
    .slice(0, 25)
    .map((log) => [
      formatTimestamp(log.timestamp),
      log.action,
      log.outcome,
      String(log.statusCode),
      log.actorId ?? 'system',
    ]);

  return {
    reportId: 'auditActivity',
    generatedAt: input.generatedAt.toISOString(),
    window: input.window,
    status: 'live',
    cards: [
      {
        id: 'auditEvents',
        label: 'Audit events',
        value: formatNumber(totalEvents),
      },
      {
        id: 'uniqueActors',
        label: 'Unique actors',
        value: formatNumber(
          getUniqueCount(auditLogs.map((log) => log.actorId ?? 'system')),
        ),
      },
      {
        id: 'denialShare',
        label: 'Denial share',
        value:
          totalEvents === 0 ? '0%' : formatPercent(denialCount / totalEvents),
        detail: `${formatNumber(denialCount)} denied events`,
        tone: denialCount > 0 ? 'warning' : 'positive',
      },
      {
        id: 'errorShare',
        label: 'Error share',
        value:
          totalEvents === 0 ? '0%' : formatPercent(errorCount / totalEvents),
        detail: `${formatNumber(errorCount)} error events`,
        tone: errorCount > 0 ? 'critical' : 'positive',
      },
    ],
    series: [series],
    breakdowns: [
      buildRankedBreakdown(
        'risky-actions',
        'Top risky actions',
        'Actions with the highest volume of denied, rate-limited, or error outcomes.',
        riskyRows,
        'No risky actions in the selected window.',
      ),
      buildRankedBreakdown(
        'audit-outcome-share',
        'Outcome shares',
        'How the current audit window is split across risky outcomes.',
        shareRows,
        'No audit activity in the selected window.',
      ),
    ],
    table: {
      columns: ['Timestamp', 'Action', 'Outcome', 'Status', 'Actor'],
      rows,
      emptyMessage: 'No audit activity in the selected window.',
    },
  };
}
