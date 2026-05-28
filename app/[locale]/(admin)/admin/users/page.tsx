import { AdminNotificationComposer } from '@/components/admin/admin-notification-composer';
import { AdminPageShell } from '@/components/admin/admin-page-shell';
import { AdminUserSearch } from '@/components/admin/admin-user-search';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getAuthorizedAdminPageDefinitions } from '@/src/admin/pages';
import { hasPermissionForRole } from '@/src/domain/authorization/service';
import { getAdminUsersPageDataUseCase } from '@/src/domain/notifications/use-cases';
import { createTranslator } from '@/src/i18n/messages';
import {
  notFoundUnlessFeatureEnabled,
  requirePermission,
  resolveLocale,
} from '@/src/server/page-guards';

const userMetricKeys = ['privileged', 'operational', 'member'] as const;
const workflowKeys = ['inspect', 'broadcast', 'status'] as const;

export default async function UsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  await notFoundUnlessFeatureEnabled('admin.users');
  const session = await requirePermission(locale, 'admin.users.read');
  const t = createTranslator(locale, 'AdminPage');
  const adminPages = await getAuthorizedAdminPageDefinitions(session.user.role);
  const canNotifyUsers = await hasPermissionForRole(
    session.user.role,
    'admin.users.notify',
  );
  const data = await getAdminUsersPageDataUseCase();

  return (
    <AdminPageShell
      title={t('users.title')}
      description={t('users.description')}
      adminPages={adminPages}
    >
      <div className="grid gap-4 md:grid-cols-3">
        {userMetricKeys.map((metricKey) => (
          <Card key={metricKey}>
            <CardHeader>
              <CardDescription>
                {t(`users.metrics.${metricKey}.label`)}
              </CardDescription>
              <CardTitle className="text-2xl">
                {String(data.metrics[metricKey])}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                {t(`users.metrics.${metricKey}.detail`)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>{t('users.tableTitle')}</CardTitle>
            <CardDescription>{t('users.tableDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <AdminUserSearch locale={locale} />
          </CardContent>
        </Card>

        {canNotifyUsers ? (
          <Card className="rounded-[1.75rem]">
            <CardHeader>
              <CardTitle>{t('users.notifications.title')}</CardTitle>
              <CardDescription>
                {t('users.notifications.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AdminNotificationComposer />
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('users.workflowTitle')}</CardTitle>
          <CardDescription>{t('users.workflowDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {workflowKeys.map((workflowKey) => (
            <div
              key={workflowKey}
              className="rounded-2xl border p-4 dark:border-zinc-800"
            >
              <p className="font-medium">
                {t(`users.workflows.${workflowKey}.title`)}
              </p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                {t(`users.workflows.${workflowKey}.description`)}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </AdminPageShell>
  );
}
