import { and, count, eq, gte, ilike, lte, type SQL } from 'drizzle-orm';

import { AdminPageShell } from '@/components/admin/admin-page-shell';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { LocalizedLink } from '@/i18n/server-link';
import { getAuthorizedAdminPageDefinitions } from '@/src/admin/pages';
import { getDb } from '@/src/db/client';
import { securityAuditLogs } from '@/src/db/schema';
import { hasPermissionForRole } from '@/src/domain/authorization/service';
import {
  notFoundUnlessFeatureEnabled,
  requirePermission,
  resolveLocale,
} from '@/src/server/page-guards';

const pageSize = 25;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseDate(value: string | undefined, endOfDay = false) {
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

function buildAuditFilters(
  searchParams: Record<string, string | string[] | undefined>,
) {
  const actor = firstParam(searchParams.actor)?.trim();
  const action = firstParam(searchParams.action)?.trim();
  const outcome = firstParam(searchParams.outcome)?.trim();
  const statusCode = Number(firstParam(searchParams.statusCode));
  const from = parseDate(firstParam(searchParams.from));
  const to = parseDate(firstParam(searchParams.to), true);
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

export default async function AuditLogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  const requestedSearchParams = (await searchParams) ?? {};
  await notFoundUnlessFeatureEnabled('admin.reports');
  const session = await requirePermission(locale, 'admin.reports.read');
  const adminPages = await getAuthorizedAdminPageDefinitions(session.user.role);
  const canExport = await hasPermissionForRole(
    session.user.role,
    'admin.reports.export',
  );
  const page = Math.max(
    1,
    Number.parseInt(firstParam(requestedSearchParams.page) ?? '1', 10) || 1,
  );
  const where = buildAuditFilters(requestedSearchParams);
  const [rows, totalResult] = await Promise.all([
    getDb().query.securityAuditLogs.findMany({
      where: where ? () => where : undefined,
      orderBy: (table, { desc: innerDesc }) => [innerDesc(table.timestamp)],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
    getDb().select({ value: count() }).from(securityAuditLogs).where(where),
  ]);
  const total = totalResult[0]?.value ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const queryString = new URLSearchParams(
    Object.entries(requestedSearchParams).flatMap(([key, value]) =>
      Array.isArray(value)
        ? value.map((item) => [key, item])
        : value
          ? [[key, value]]
          : [],
    ),
  );

  queryString.delete('page');

  return (
    <AdminPageShell
      title="Audit log"
      description="Review security-sensitive route decisions and operational actions."
      adminPages={adminPages}
    >
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Narrow by actor, action, outcome, status code, or timestamp.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <FilterInput
              name="actor"
              label="Actor"
              params={requestedSearchParams}
            />
            <FilterInput
              name="action"
              label="Action"
              params={requestedSearchParams}
            />
            <FilterInput
              name="outcome"
              label="Outcome"
              params={requestedSearchParams}
            />
            <FilterInput
              name="statusCode"
              label="Status"
              params={requestedSearchParams}
            />
            <FilterInput
              name="from"
              label="From"
              type="date"
              params={requestedSearchParams}
            />
            <FilterInput
              name="to"
              label="To"
              type="date"
              params={requestedSearchParams}
            />
            <div className="flex items-end gap-2 md:col-span-3 xl:col-span-6">
              <button type="submit" className={buttonVariants({ size: 'sm' })}>
                Apply filters
              </button>
              {canExport ? (
                <a
                  href={`/api/admin/audit-log/export?${queryString.toString()}`}
                  className={buttonVariants({ variant: 'outline', size: 'sm' })}
                >
                  Export CSV
                </a>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Events</CardTitle>
          <CardDescription>
            Showing page {page} of {totalPages}, {total} total events.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b text-xs uppercase text-zinc-500 dark:border-zinc-800">
              <tr>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Actor</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Outcome</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Metadata</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b dark:border-zinc-800">
                  <td className="px-3 py-3">
                    {new Intl.DateTimeFormat(locale, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(row.timestamp)}
                  </td>
                  <td className="px-3 py-3 font-mono text-xs">
                    {row.actorId ?? 'anonymous'}
                  </td>
                  <td className="px-3 py-3 font-mono text-xs">{row.action}</td>
                  <td className="px-3 py-3">
                    <Badge variant="outline">{row.outcome}</Badge>
                  </td>
                  <td className="px-3 py-3">{row.statusCode}</td>
                  <td className="max-w-[280px] truncate px-3 py-3 font-mono text-xs">
                    {JSON.stringify(row.metadata ?? {})}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 flex items-center justify-between">
            <LocalizedLink
              href={`/admin/audit-log?${new URLSearchParams({
                ...Object.fromEntries(queryString.entries()),
                page: String(Math.max(1, page - 1)),
              }).toString()}`}
              locale={locale}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              Previous
            </LocalizedLink>
            <LocalizedLink
              href={`/admin/audit-log?${new URLSearchParams({
                ...Object.fromEntries(queryString.entries()),
                page: String(Math.min(totalPages, page + 1)),
              }).toString()}`}
              locale={locale}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              Next
            </LocalizedLink>
          </div>
        </CardContent>
      </Card>
    </AdminPageShell>
  );
}

function FilterInput({
  name,
  label,
  params,
  type = 'text',
}: {
  name: string;
  label: string;
  params: Record<string, string | string[] | undefined>;
  type?: string;
}) {
  return (
    <label className="space-y-2">
      <span className="block text-xs font-medium uppercase text-zinc-500">
        {label}
      </span>
      <input
        type={type}
        name={name}
        defaultValue={firstParam(params[name]) ?? ''}
        className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
    </label>
  );
}
