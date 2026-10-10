import {
  type AdminReportBreakdown,
  type AdminReportDetail,
  CHART_COLORS,
  type LoadedReportInputs,
  buildRankedBreakdown,
  formatNumber,
  formatTimestamp,
  getMetadataValue,
} from './shared';

export function buildSchemaHealthDetail(
  input: LoadedReportInputs,
): AdminReportDetail {
  const unhealthyJobs = input.current.jobs.filter(
    (job) => job.status === 'failed' || job.status === 'retrying',
  );
  const failedJobs = unhealthyJobs.filter((job) => job.status === 'failed');
  const retryingJobs = unhealthyJobs.filter((job) => job.status === 'retrying');
  const writeFailures = input.current.auditLogs.filter(
    (log) =>
      log.action === 'admin.dataStudio.createRecord' &&
      log.outcome !== 'allowed',
  );
  const jobsByName = new Map<
    string,
    {
      failed: number;
      retrying: number;
      latestError: string | null;
      latestUpdatedAt: Date | null;
    }
  >();
  const writeFailuresByTarget = new Map<
    string,
    { count: number; tableName: string; action: string }
  >();

  for (const job of unhealthyJobs) {
    const bucket = jobsByName.get(job.jobName) ?? {
      failed: 0,
      retrying: 0,
      latestError: null,
      latestUpdatedAt: null,
    };

    if (job.status === 'failed') {
      bucket.failed += 1;
    } else if (job.status === 'retrying') {
      bucket.retrying += 1;
    }

    if (
      !bucket.latestUpdatedAt ||
      bucket.latestUpdatedAt.getTime() < job.updatedAt.getTime()
    ) {
      bucket.latestUpdatedAt = job.updatedAt;
      bucket.latestError = job.lastError;
    }

    jobsByName.set(job.jobName, bucket);
  }

  for (const log of writeFailures) {
    const tableName =
      getMetadataValue(log, 'tableName') ??
      getMetadataValue(log, 'table') ??
      'unknown';
    const action = getMetadataValue(log, 'action') ?? log.action;
    const key = `${tableName}:${action}`;
    const bucket = writeFailuresByTarget.get(key) ?? {
      count: 0,
      tableName,
      action,
    };
    bucket.count += 1;
    writeFailuresByTarget.set(key, bucket);
  }

  const latestFailedJob = failedJobs.sort(
    (left, right) => right.updatedAt.getTime() - left.updatedAt.getTime(),
  )[0];
  const jobRows = [...jobsByName.entries()]
    .sort(
      (left, right) =>
        right[1].failed +
        right[1].retrying -
        (left[1].failed + left[1].retrying),
    )
    .map<AdminReportBreakdown['rows'][number]>(([jobName, bucket]) => ({
      label: jobName,
      value: `${formatNumber(bucket.failed)} failed / ${formatNumber(bucket.retrying)} retrying`,
      detail: bucket.latestError
        ? bucket.latestError
        : `Updated ${formatTimestamp(bucket.latestUpdatedAt)}`,
      tone: bucket.failed > 0 ? 'critical' : 'warning',
    }));
  const writeRows = [...writeFailuresByTarget.values()]
    .sort(
      (left, right) =>
        right.count - left.count ||
        left.tableName.localeCompare(right.tableName),
    )
    .map<AdminReportBreakdown['rows'][number]>((bucket) => ({
      label: bucket.tableName,
      value: formatNumber(bucket.count),
      detail: bucket.action,
      tone: bucket.count >= 3 ? 'critical' : 'warning',
    }));
  const tableRows = [
    ...unhealthyJobs
      .slice(0, 12)
      .map((job) => [
        formatTimestamp(job.updatedAt),
        'job',
        job.jobName,
        job.status,
        `attempts ${job.attempts}`,
        job.lastError ?? 'N/A',
      ]),
    ...writeFailures
      .slice(0, 12)
      .map((log) => [
        formatTimestamp(log.timestamp),
        'write',
        getMetadataValue(log, 'tableName') ??
          getMetadataValue(log, 'table') ??
          'unknown',
        log.outcome,
        String(log.statusCode),
        log.actorId ?? 'system',
      ]),
  ].sort((left, right) => right[0].localeCompare(left[0]));

  return {
    reportId: 'schemaHealth',
    generatedAt: input.generatedAt.toISOString(),
    window: input.window,
    status: 'live',
    cards: [
      {
        id: 'failedJobs',
        label: 'Failed jobs',
        value: formatNumber(failedJobs.length),
        tone: failedJobs.length > 0 ? 'critical' : 'positive',
      },
      {
        id: 'retryingJobs',
        label: 'Retrying jobs',
        value: formatNumber(retryingJobs.length),
        tone: retryingJobs.length > 0 ? 'warning' : 'positive',
      },
      {
        id: 'writeFailures',
        label: 'Write failures',
        value: formatNumber(writeFailures.length),
        tone: writeFailures.length > 0 ? 'warning' : 'positive',
      },
      {
        id: 'latestLastError',
        label: 'Latest job error',
        value: latestFailedJob?.jobName ?? 'N/A',
        detail: latestFailedJob?.lastError ?? 'No recent failed jobs.',
        tone: latestFailedJob ? 'critical' : 'positive',
      },
    ],
    series: [
      {
        id: 'schema-health-jobs',
        title: 'Failed and retrying jobs',
        description: 'Current unhealthy jobs grouped by job name.',
        type: 'bar',
        xKey: 'label',
        data: [...jobsByName.entries()].map(([jobName, bucket]) => ({
          label: jobName,
          failed: bucket.failed,
          retrying: bucket.retrying,
        })),
        categories: [
          { key: 'failed', label: 'Failed', color: CHART_COLORS.rose },
          { key: 'retrying', label: 'Retrying', color: CHART_COLORS.amber },
        ],
        emptyMessage: 'No failed or retrying jobs in the selected window.',
      },
    ],
    breakdowns: [
      buildRankedBreakdown(
        'schema-job-health',
        'Job failures by name',
        'Latest unhealthy jobs, grouped by job name.',
        jobRows,
        'No failed or retrying jobs in the selected window.',
      ),
      buildRankedBreakdown(
        'schema-write-failures',
        'Write failures by table/action',
        'Tables and actions with the most failed or denied writes.',
        writeRows,
        'No unhealthy Data Studio writes in the selected window.',
      ),
    ],
    table: {
      columns: [
        'Timestamp',
        'Source',
        'Name',
        'Status',
        'Detail',
        'Actor / Error',
      ],
      rows: tableRows,
      emptyMessage: 'No recent schema or job issues in the selected window.',
    },
  };
}
