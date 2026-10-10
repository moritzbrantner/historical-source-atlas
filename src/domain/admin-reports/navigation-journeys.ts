import {
  classifyNavigationPathname,
  navigationRouteGroups,
  type NavigationRouteGroup,
} from '@/src/analytics/navigation-classification';
import {
  type AdminReportDetail,
  CHART_COLORS,
  type LoadedReportInputs,
  type ReportPageVisit,
  buildDailySeries,
  buildRankedBreakdown,
  createUnavailableCard,
  formatNumber,
  formatPercent,
  getUniqueCount,
  getWindowStart,
  normalizeNavigationReportFilters,
  toIsoDay,
} from './shared';

function isNavigationRouteGroup(value: string): value is NavigationRouteGroup {
  return navigationRouteGroups.includes(value as NavigationRouteGroup);
}

function toNavigationRouteGroup(value: string): NavigationRouteGroup {
  return isNavigationRouteGroup(value) ? value : 'unknown';
}

function formatDecimal(value: number, maximumFractionDigits = 1) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(value);
}

function formatNavigationDisplayLabel(path: string) {
  const classification = classifyNavigationPathname(path);
  return classification.displayLabel;
}

function listNavigationReportPathOptions(visits: ReportPageVisit[]) {
  return [
    ...new Set(
      visits
        .flatMap((visit) => [
          visit.canonicalPath,
          visit.previousCanonicalPath ?? null,
        ])
        .filter((value): value is string => Boolean(value)),
    ),
  ].sort((left, right) => left.localeCompare(right));
}

function matchesNavigationBaseFilters(
  visit: ReportPageVisit,
  filters: ReturnType<typeof normalizeNavigationReportFilters>,
) {
  if (filters.audience === 'anonymous' && visit.isAuthenticated) {
    return false;
  }

  if (filters.audience === 'authenticated' && !visit.isAuthenticated) {
    return false;
  }

  if (
    filters.routeGroup !== 'all' &&
    toNavigationRouteGroup(visit.routeGroup) !== filters.routeGroup
  ) {
    return false;
  }

  return true;
}

export function buildNavigationJourneyDetail(
  input: LoadedReportInputs,
  rawFilters?: {
    audience?: string | null;
    routeGroup?: string | null;
    path?: string | null;
  },
): AdminReportDetail {
  const filters = normalizeNavigationReportFilters(rawFilters);
  const matchingVisits = input.current.visits.filter((visit) =>
    matchesNavigationBaseFilters(visit, filters),
  );
  const matchingV2Visits = matchingVisits
    .filter((visit) => visit.trackingVersion === 2)
    .sort(
      (left, right) =>
        left.visitedAt.getTime() - right.visitedAt.getTime() ||
        left.id.localeCompare(right.id),
    );
  const pathOptions = listNavigationReportPathOptions(matchingVisits);

  if (matchingVisits.length > 0 && matchingV2Visits.length === 0) {
    return {
      reportId: 'navigationJourneys',
      generatedAt: input.generatedAt.toISOString(),
      window: input.window,
      status: 'degraded',
      message:
        'Journey analytics started after the navigation instrumentation rollout. Select a newer window to see session and transition data.',
      cards: [
        createUnavailableCard(
          'uniqueVisitors',
          'Unique visitors',
          'Journey analytics is only available for tracking version 2 visits.',
        ),
        createUnavailableCard(
          'sessions',
          'Sessions',
          'Journey analytics is only available for tracking version 2 visits.',
        ),
        createUnavailableCard(
          'pagesPerSession',
          'Pages / session',
          'Journey analytics is only available for tracking version 2 visits.',
        ),
        createUnavailableCard(
          'bounceRate',
          'Bounce rate',
          'Journey analytics is only available for tracking version 2 visits.',
        ),
      ],
      series: [],
      breakdowns: [],
      table: {
        columns: ['Message'],
        rows: [],
        emptyMessage:
          'No version 2 navigation journey data is available for the selected filters.',
      },
      tableTitle: 'Journey transitions',
      tableDescription:
        'Navigation transition data becomes available after the version 2 tracker rollout.',
      filters: {
        ...filters,
        pathOptions,
      },
    };
  }

  const analysisVisits = (() => {
    if (!filters.path) {
      return matchingV2Visits;
    }

    const scopedSessionIds = new Set(
      matchingV2Visits
        .filter(
          (visit) =>
            visit.canonicalPath === filters.path ||
            visit.previousCanonicalPath === filters.path,
        )
        .map((visit) => visit.sessionId),
    );

    return matchingV2Visits.filter((visit) =>
      scopedSessionIds.has(visit.sessionId),
    );
  })();
  const sessions = new Map<string, ReportPageVisit[]>();
  const pageViewsByPath = new Map<string, number>();
  const entryCounts = new Map<string, number>();
  const exitCounts = new Map<string, number>();
  const externalReferrerCounts = new Map<string, number>();
  const visitorsByDay = new Map<string, Set<string>>();
  const sessionsByDay = new Map<string, Set<string>>();
  const bounceByDay = new Map<string, { bounce: number; multi: number }>();

  for (const visit of analysisVisits) {
    const sessionVisits = sessions.get(visit.sessionId) ?? [];
    sessionVisits.push(visit);
    sessions.set(visit.sessionId, sessionVisits);
    pageViewsByPath.set(
      visit.canonicalPath,
      (pageViewsByPath.get(visit.canonicalPath) ?? 0) + 1,
    );

    if (visit.referrerType === 'external' && visit.referrerHost) {
      externalReferrerCounts.set(
        visit.referrerHost,
        (externalReferrerCounts.get(visit.referrerHost) ?? 0) + 1,
      );
    }

    const day = toIsoDay(visit.visitedAt);
    const visitors = visitorsByDay.get(day) ?? new Set<string>();
    visitors.add(visit.visitorId);
    visitorsByDay.set(day, visitors);

    const dailySessions = sessionsByDay.get(day) ?? new Set<string>();
    dailySessions.add(visit.sessionId);
    sessionsByDay.set(day, dailySessions);
  }

  const sessionRows = [...sessions.values()].map((sessionVisits) =>
    [...sessionVisits].sort(
      (left, right) =>
        left.visitedAt.getTime() - right.visitedAt.getTime() ||
        left.id.localeCompare(right.id),
    ),
  );
  const uniqueVisitors = getUniqueCount(
    analysisVisits.map((visit) => visit.visitorId),
  );
  const sessionCount = sessionRows.length;
  const bounceSessions = sessionRows.filter(
    (sessionVisits) => sessionVisits.length === 1,
  ).length;
  const pagesPerSession =
    sessionCount === 0 ? 0 : analysisVisits.length / sessionCount;

  for (const sessionVisits of sessionRows) {
    const entryPath = sessionVisits[0]?.canonicalPath;
    const exitPath = sessionVisits[sessionVisits.length - 1]?.canonicalPath;
    const sessionDay = toIsoDay(
      sessionVisits[0]?.visitedAt ?? input.generatedAt,
    );
    const dayBucket = bounceByDay.get(sessionDay) ?? { bounce: 0, multi: 0 };

    if (sessionVisits.length === 1) {
      dayBucket.bounce += 1;
    } else {
      dayBucket.multi += 1;
    }

    bounceByDay.set(sessionDay, dayBucket);

    if (entryPath) {
      entryCounts.set(entryPath, (entryCounts.get(entryPath) ?? 0) + 1);
    }

    if (exitPath) {
      exitCounts.set(exitPath, (exitCounts.get(exitPath) ?? 0) + 1);
    }
  }

  const transitionCounts = new Map<
    string,
    { from: string; to: string; count: number }
  >();
  const outgoingTransitionCounts = new Map<string, number>();
  const transitionVisits = analysisVisits.filter(
    (visit) => visit.previousCanonicalPath,
  );
  const scopedTransitionVisits = filters.path
    ? transitionVisits.filter(
        (visit) => visit.previousCanonicalPath === filters.path,
      )
    : transitionVisits;

  for (const visit of scopedTransitionVisits) {
    const from = visit.previousCanonicalPath!;
    const key = `${from}=>${visit.canonicalPath}`;
    const current = transitionCounts.get(key) ?? {
      from,
      to: visit.canonicalPath,
      count: 0,
    };
    current.count += 1;
    transitionCounts.set(key, current);
    outgoingTransitionCounts.set(
      from,
      (outgoingTransitionCounts.get(from) ?? 0) + 1,
    );
  }

  const sortedEntries = [...entryCounts.entries()].sort(
    (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
  );
  const sortedExits = [...exitCounts.entries()].sort(
    (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
  );
  const sortedTransitions = [...transitionCounts.values()].sort(
    (left, right) =>
      right.count - left.count ||
      left.from.localeCompare(right.from) ||
      left.to.localeCompare(right.to),
  );
  const sortedExternalReferrers = [...externalReferrerCounts.entries()].sort(
    (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
  );

  const start = getWindowStart(input.window, input.generatedAt);
  const visitorsAndSessionsSeries = buildDailySeries(
    'Visitors and sessions',
    'Daily unique visitors and sessions for the selected navigation scope.',
    start,
    input.generatedAt,
    [
      { key: 'visitors', label: 'Visitors', color: CHART_COLORS.emerald },
      { key: 'sessions', label: 'Sessions', color: CHART_COLORS.blue },
    ],
    'No tracked visitors or sessions in the selected window.',
    (row, day) => {
      row.visitors = visitorsByDay.get(day)?.size ?? 0;
      row.sessions = sessionsByDay.get(day)?.size ?? 0;
    },
    'line',
  );
  const bounceSeries = buildDailySeries(
    'Bounce vs multi-page sessions',
    'Daily split between single-page bounce sessions and multi-page sessions.',
    start,
    input.generatedAt,
    [
      { key: 'bounce', label: 'Bounce sessions', color: CHART_COLORS.amber },
      {
        key: 'multi',
        label: 'Multi-page sessions',
        color: CHART_COLORS.indigo,
      },
    ],
    'No tracked sessions in the selected window.',
    (row, day) => {
      const bucket = bounceByDay.get(day);
      row.bounce = bucket?.bounce ?? 0;
      row.multi = bucket?.multi ?? 0;
    },
    'area',
  );

  return {
    reportId: 'navigationJourneys',
    generatedAt: input.generatedAt.toISOString(),
    window: input.window,
    status: 'live',
    cards: [
      {
        id: 'uniqueVisitors',
        label: 'Unique visitors',
        value: formatNumber(uniqueVisitors),
        detail: filters.path
          ? 'Sessions that included the selected page.'
          : 'Distinct pseudonymous visitors.',
      },
      {
        id: 'sessions',
        label: 'Sessions',
        value: formatNumber(sessionCount),
        detail: '30-minute inactivity timeout.',
      },
      {
        id: 'pagesPerSession',
        label: 'Pages / session',
        value: formatDecimal(pagesPerSession),
        detail: `${formatNumber(analysisVisits.length)} tracked page views`,
      },
      {
        id: 'bounceRate',
        label: 'Bounce rate',
        value:
          sessionCount === 0
            ? '0%'
            : formatPercent(bounceSessions / sessionCount, 1),
        detail: `${formatNumber(bounceSessions)} single-page sessions`,
        tone: bounceSessions > 0 ? 'warning' : 'positive',
      },
    ],
    series: [visitorsAndSessionsSeries, bounceSeries],
    breakdowns: [
      buildRankedBreakdown(
        'navigation-entry-pages',
        'Top entry pages',
        'First page seen in each tracked session.',
        sortedEntries.slice(0, 8).map(([path, count]) => ({
          label: formatNavigationDisplayLabel(path),
          value: formatNumber(count),
        })),
        'No entry pages in the selected window.',
      ),
      buildRankedBreakdown(
        'navigation-exit-pages',
        'Top exit pages',
        'Last page seen in each tracked session.',
        sortedExits.slice(0, 8).map(([path, count]) => ({
          label: formatNavigationDisplayLabel(path),
          value: formatNumber(count),
          detail: `${formatPercent(count / Math.max(pageViewsByPath.get(path) ?? 0, 1), 1)} exit rate`,
        })),
        'No exit pages in the selected window.',
      ),
      buildRankedBreakdown(
        'navigation-transitions',
        'Top transitions',
        filters.path
          ? 'Most common next steps from the selected page.'
          : 'Most common page-to-page transitions.',
        sortedTransitions.slice(0, 8).map((transition) => ({
          label: `${formatNavigationDisplayLabel(transition.from)} -> ${formatNavigationDisplayLabel(transition.to)}`,
          value: formatNumber(transition.count),
          detail: formatPercent(
            transition.count /
              (outgoingTransitionCounts.get(transition.from) ??
                transition.count),
            1,
          ),
        })),
        filters.path
          ? 'No outbound transitions from the selected page in the selected window.'
          : 'No page transitions in the selected window.',
      ),
      buildRankedBreakdown(
        'navigation-external-referrers',
        'Top external referrer hosts',
        'External hosts that sent visitors into tracked sessions.',
        sortedExternalReferrers.slice(0, 8).map(([host, count]) => ({
          label: host,
          value: formatNumber(count),
        })),
        'No external referrers in the selected window.',
      ),
    ],
    table: {
      columns: filters.path
        ? [
            'Next page',
            'Transitions',
            'Transition share',
            'Selected page views',
            'Exit rate after selected page',
          ]
        : [
            'From',
            'To',
            'Transitions',
            'Transition share',
            'From page views',
            'Exit rate after from',
          ],
      rows: sortedTransitions
        .slice(0, 20)
        .map((transition) =>
          filters.path
            ? [
                transition.to,
                formatNumber(transition.count),
                formatPercent(
                  transition.count /
                    (outgoingTransitionCounts.get(transition.from) ??
                      transition.count),
                  1,
                ),
                formatNumber(pageViewsByPath.get(transition.from) ?? 0),
                formatPercent(
                  (exitCounts.get(transition.from) ?? 0) /
                    (pageViewsByPath.get(transition.from) ?? 1),
                  1,
                ),
              ]
            : [
                transition.from,
                transition.to,
                formatNumber(transition.count),
                formatPercent(
                  transition.count /
                    (outgoingTransitionCounts.get(transition.from) ??
                      transition.count),
                  1,
                ),
                formatNumber(pageViewsByPath.get(transition.from) ?? 0),
                formatPercent(
                  (exitCounts.get(transition.from) ?? 0) /
                    (pageViewsByPath.get(transition.from) ?? 1),
                  1,
                ),
              ],
        ),
      emptyMessage: filters.path
        ? 'No outbound transitions from the selected page in the selected window.'
        : 'No navigation transitions in the selected window.',
    },
    tableTitle: 'Journey transitions',
    tableDescription: filters.path
      ? 'Transitions from the selected page, with share of outgoing transitions and exit rate after the source page.'
      : 'Transitions between canonical pages, including transition share and exit rate after the source page.',
    filters: {
      ...filters,
      pathOptions,
    },
  };
}
