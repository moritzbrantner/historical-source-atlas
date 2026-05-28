import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { AdminPageShell } from '@/components/admin/admin-page-shell';
import { LocalizedLink } from '@/i18n/server-link';
import { getAuthorizedAdminPageDefinitions } from '@/src/admin/pages';
import {
  isProblemReportStatus,
  listProblemReports,
  problemReportAreas,
  problemReportStatuses,
  type ProblemReportArea,
} from '@/src/domain/support/problem-reports';
import { createTranslator } from '@/src/i18n/messages';
import {
  notFoundUnlessFeatureEnabled,
  requirePermission,
  resolveLocale,
} from '@/src/server/page-guards';

function isProblemReportArea(
  value: string | undefined,
): value is ProblemReportArea {
  return problemReportAreas.includes(value as ProblemReportArea);
}

export default async function ProblemReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; area?: string }>;
}) {
  const { locale: rawLocale } = await params;
  const filters = await searchParams;
  const locale = resolveLocale(rawLocale);
  await notFoundUnlessFeatureEnabled('reportProblem');
  const session = await requirePermission(locale, 'admin.problemReports.read');
  const t = createTranslator(locale, 'AdminPage');
  const adminPages = await getAuthorizedAdminPageDefinitions(session.user.role);
  const status = isProblemReportStatus(filters.status)
    ? filters.status
    : undefined;
  const area = isProblemReportArea(filters.area) ? filters.area : undefined;
  const reports = await listProblemReports({ status, area });

  return (
    <AdminPageShell
      title={t('problemReports.title')}
      description={t('problemReports.description')}
      adminPages={adminPages}
    >
      <Card>
        <CardHeader>
          <CardTitle>{t('problemReports.tableTitle')}</CardTitle>
          <CardDescription>
            {t('problemReports.tableDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="flex flex-wrap gap-3">
            <label className="grid gap-1 text-sm">
              {t('problemReports.filters.status')}
              <select
                name="status"
                defaultValue={status ?? ''}
                className="h-10 rounded-md border border-zinc-300 bg-transparent px-3 dark:border-zinc-700"
              >
                <option value="">{t('problemReports.filters.all')}</option>
                {problemReportStatuses.map((statusOption) => (
                  <option key={statusOption} value={statusOption}>
                    {t(`problemReports.status.${statusOption}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              {t('problemReports.filters.area')}
              <select
                name="area"
                defaultValue={area ?? ''}
                className="h-10 rounded-md border border-zinc-300 bg-transparent px-3 dark:border-zinc-700"
              >
                <option value="">{t('problemReports.filters.all')}</option>
                {problemReportAreas.map((areaOption) => (
                  <option key={areaOption} value={areaOption}>
                    {areaOption}
                  </option>
                ))}
              </select>
            </label>
            <button className={buttonVariants({ size: 'sm' })} type="submit">
              {t('problemReports.actions.open')}
            </button>
          </form>

          {reports.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="py-2 pr-4">
                      {t('problemReports.columns.reference')}
                    </th>
                    <th className="py-2 pr-4">
                      {t('problemReports.columns.subject')}
                    </th>
                    <th className="py-2 pr-4">
                      {t('problemReports.columns.area')}
                    </th>
                    <th className="py-2 pr-4">
                      {t('problemReports.columns.status')}
                    </th>
                    <th className="py-2 pr-4">
                      {t('problemReports.columns.createdAt')}
                    </th>
                    <th className="py-2">
                      {t('problemReports.columns.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr
                      key={report.id}
                      className="border-t dark:border-zinc-800"
                    >
                      <td className="py-3 pr-4 font-medium">
                        {report.referenceId}
                      </td>
                      <td className="py-3 pr-4">{report.subject}</td>
                      <td className="py-3 pr-4">{report.area}</td>
                      <td className="py-3 pr-4">
                        {t(`problemReports.status.${report.status}`)}
                      </td>
                      <td className="py-3 pr-4">
                        {new Intl.DateTimeFormat(locale, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        }).format(report.createdAt)}
                      </td>
                      <td className="py-3">
                        <LocalizedLink
                          href={`/admin/problem-reports/${report.id}`}
                          locale={locale}
                          className={buttonVariants({
                            variant: 'outline',
                            size: 'sm',
                          })}
                        >
                          {t('problemReports.actions.open')}
                        </LocalizedLink>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              {t('problemReports.empty')}
            </p>
          )}
        </CardContent>
      </Card>
    </AdminPageShell>
  );
}
