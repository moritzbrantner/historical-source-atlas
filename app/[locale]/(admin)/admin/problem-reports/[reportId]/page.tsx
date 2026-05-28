import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

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
  getProblemReportById,
  isProblemReportStatus,
  problemReportStatuses,
  updateProblemReport,
} from '@/src/domain/support/problem-reports';
import { createTranslator } from '@/src/i18n/messages';
import {
  notFoundUnlessFeatureEnabled,
  requirePermission,
  resolveLocale,
} from '@/src/server/page-guards';

async function updateProblemReportAction(formData: FormData) {
  'use server';

  const locale = String(formData.get('locale') ?? 'en');
  const reportId = String(formData.get('reportId') ?? '');
  const status = String(formData.get('status') ?? '');
  const adminNote = String(formData.get('adminNote') ?? '');

  const resolvedLocale = resolveLocale(locale);
  await requirePermission(resolvedLocale, 'admin.problemReports.update');

  if (reportId && isProblemReportStatus(status)) {
    await updateProblemReport({ reportId, status, adminNote });
    revalidatePath(`/${resolvedLocale}/admin/problem-reports`);
    revalidatePath(`/${resolvedLocale}/admin/problem-reports/${reportId}`);
  }

  redirect(
    `/${resolvedLocale}/admin/problem-reports/${reportId}?status=updated`,
  );
}

export default async function ProblemReportDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; reportId: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { locale: rawLocale, reportId } = await params;
  const { status: actionStatus } = await searchParams;
  const locale = resolveLocale(rawLocale);
  await notFoundUnlessFeatureEnabled('reportProblem');
  const session = await requirePermission(locale, 'admin.problemReports.read');
  const t = createTranslator(locale, 'AdminPage');
  const adminPages = await getAuthorizedAdminPageDefinitions(session.user.role);
  const report = await getProblemReportById(reportId);

  if (!report) {
    redirect(`/${locale}/admin/problem-reports`);
  }

  return (
    <AdminPageShell
      title={t('problemReports.detailTitle', {
        referenceId: report.referenceId,
      })}
      description={report.subject}
      adminPages={adminPages}
    >
      <LocalizedLink
        href="/admin/problem-reports"
        locale={locale}
        className={buttonVariants({ variant: 'outline', size: 'sm' })}
      >
        {t('problemReports.back')}
      </LocalizedLink>

      {actionStatus === 'updated' ? (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
          {t('problemReports.updated')}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle>{report.subject}</CardTitle>
            <CardDescription>
              {t('problemReports.submittedBy')} {report.name ?? report.email}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <dl className="grid gap-3 md:grid-cols-2">
              <div>
                <dt className="text-zinc-500">
                  {t('problemReports.columns.area')}
                </dt>
                <dd className="font-medium">{report.area}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">
                  {t('problemReports.columns.status')}
                </dt>
                <dd className="font-medium">
                  {t(`problemReports.status.${report.status}`)}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Email</dt>
                <dd className="font-medium">{report.email}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">{t('problemReports.pageUrl')}</dt>
                <dd className="font-medium">
                  {report.pageUrl ?? t('problemReports.noPageUrl')}
                </dd>
              </div>
            </dl>
            <div>
              <h2 className="font-medium">{t('problemReports.details')}</h2>
              <p className="mt-2 whitespace-pre-wrap leading-6 text-zinc-700 dark:text-zinc-300">
                {report.details}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('problemReports.adminNote')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={updateProblemReportAction} className="space-y-4">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="reportId" value={report.id} />
              <label className="grid gap-2 text-sm">
                {t('problemReports.columns.status')}
                <select
                  name="status"
                  defaultValue={report.status}
                  className="h-10 rounded-md border border-zinc-300 bg-transparent px-3 dark:border-zinc-700"
                >
                  {problemReportStatuses.map((status) => (
                    <option key={status} value={status}>
                      {t(`problemReports.status.${status}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm">
                {t('problemReports.adminNote')}
                <textarea
                  name="adminNote"
                  rows={8}
                  defaultValue={report.adminNote ?? ''}
                  placeholder={t('problemReports.adminNotePlaceholder')}
                  className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
                />
              </label>
              <button type="submit" className={buttonVariants({})}>
                {t('problemReports.actions.save')}
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminPageShell>
  );
}
