import { and, eq, gte, ilike, lte, type SQL } from 'drizzle-orm';

import { getDb } from '@/src/db/client';
import { securityAuditLogs } from '@/src/db/schema';
import { createApiRoute } from '@/src/http/route';

function parseDate(value: string | null, endOfDay = false) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  }

  return date;
}

function buildFilters(searchParams: URLSearchParams) {
  const actor = searchParams.get('actor')?.trim();
  const action = searchParams.get('action')?.trim();
  const outcome = searchParams.get('outcome')?.trim();
  const statusCode = Number(searchParams.get('statusCode'));
  const from = parseDate(searchParams.get('from'));
  const to = parseDate(searchParams.get('to'), true);
  const filters: SQL[] = [];

  if (actor) {
    filters.push(ilike(securityAuditLogs.actorId, `%${actor}%`));
  }

  if (action) {
    filters.push(ilike(securityAuditLogs.action, `%${action}%`));
  }

  if (outcome) {
    filters.push(eq(securityAuditLogs.outcome, outcome));
  }

  if (Number.isInteger(statusCode)) {
    filters.push(eq(securityAuditLogs.statusCode, statusCode));
  }

  if (from) {
    filters.push(gte(securityAuditLogs.timestamp, from));
  }

  if (to) {
    filters.push(lte(securityAuditLogs.timestamp, to));
  }

  return filters.length > 0 ? and(...filters) : undefined;
}

function csvCell(value: unknown) {
  const raw = value instanceof Date ? value.toISOString() : String(value ?? '');
  return `"${raw.replaceAll('"', '""')}"`;
}

export const GET = createApiRoute({
  action: 'admin.auditLog.export',
  featureKey: 'admin.reports',
  auth: true,
  permission: 'admin.reports.export',
  async handler({ request }) {
    const where = buildFilters(new URL(request.url).searchParams);
    const rows = await getDb().query.securityAuditLogs.findMany({
      where: where ? () => where : undefined,
      orderBy: (table, { asc: innerAsc }) => [innerAsc(table.timestamp)],
      limit: 10_000,
    });
    const csv = [
      ['timestamp', 'actorId', 'action', 'outcome', 'statusCode', 'metadata']
        .map(csvCell)
        .join(','),
      ...rows.map((row) =>
        [
          row.timestamp,
          row.actorId,
          row.action,
          row.outcome,
          row.statusCode,
          JSON.stringify(row.metadata ?? {}),
        ]
          .map(csvCell)
          .join(','),
      ),
    ].join('\n');

    return new Response(csv, {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': 'attachment; filename="audit-log.csv"',
      },
    });
  },
});
