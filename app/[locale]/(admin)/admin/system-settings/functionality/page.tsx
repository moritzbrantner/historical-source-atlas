import { revalidatePath } from 'next/cache';

import { isSuperAdmin } from '@/lib/authorization';
import type { AppRole } from '@/lib/authorization';
import { AdminPageShell } from '@/components/admin/admin-page-shell';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { LocalizedLink } from '@/i18n/server-link';
import { getAuthSession } from '@/src/auth.server';
import { getAuthorizedAdminPageDefinitions } from '@/src/admin/pages';
import type { FoundationFeatureKey } from '@/src/app-config/feature-keys';
import {
  canApplyRoleFeatureOverrides,
  listRoleFoundationFeatureStates,
  listSiteWideFoundationFeatureStates,
  saveRoleFeatureOverride,
  saveSiteWideFeatureOverride,
} from '@/src/foundation/features/access';
import {
  notFoundUnlessFeatureEnabled,
  redirectToLocaleHome,
  requirePermission,
  resolveLocale,
} from '@/src/server/page-guards';

async function requireSuperadminOrRedirect(locale: string) {
  const session = await getAuthSession();

  if (!isSuperAdmin(session?.user.role)) {
    redirectToLocaleHome(resolveLocale(locale));
  }
}

async function saveFeatureState(formData: FormData) {
  'use server';

  const locale = String(formData.get('locale') ?? 'en');
  const featureKey = String(
    formData.get('featureKey') ?? '',
  ) as FoundationFeatureKey;
  const enabled = formData.get('enabled') === 'on';

  await requireSuperadminOrRedirect(locale);
  await saveSiteWideFeatureOverride(featureKey, enabled);
  revalidatePath(`/${locale}/admin/system-settings`);
  revalidatePath(`/${locale}/admin/system-settings/functionality`);
}

async function saveRoleFeatureState(formData: FormData) {
  'use server';

  const locale = String(formData.get('locale') ?? 'en');
  const role = String(formData.get('role') ?? '') as AppRole;
  const featureKey = String(
    formData.get('featureKey') ?? '',
  ) as FoundationFeatureKey;
  const enabled = formData.get('enabled') === 'on';

  await requireSuperadminOrRedirect(locale);

  if (!canApplyRoleFeatureOverrides(featureKey, role)) {
    throw new Error('This functionality cannot be overridden for that role.');
  }

  await saveRoleFeatureOverride({ role, featureKey, enabled });
  revalidatePath(`/${locale}/admin/system-settings`);
  revalidatePath(`/${locale}/admin/system-settings/functionality`);
}

export default async function SystemFunctionalityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  await notFoundUnlessFeatureEnabled('admin.systemSettings');
  const session = await requirePermission(locale, 'admin.systemSettings.read');

  if (!isSuperAdmin(session.user.role)) {
    redirectToLocaleHome(locale);
  }

  const adminPages = await getAuthorizedAdminPageDefinitions(session.user.role);
  const [featureStates, managerFeatureStates, userFeatureStates] =
    await Promise.all([
      listSiteWideFoundationFeatureStates(),
      listRoleFoundationFeatureStates('MANAGER'),
      listRoleFoundationFeatureStates('USER'),
    ]);
  const disabledCount = featureStates.filter(
    (state) => !state.siteEnabled,
  ).length;
  const effectiveCount = featureStates.filter(
    (state) => state.effectiveEnabled,
  ).length;
  const roleOverrideCount = [
    ...managerFeatureStates,
    ...userFeatureStates,
  ].filter((state) => state.roleEnabled !== null).length;

  return (
    <AdminPageShell
      title="Functionality controls"
      description="Superadmins can switch product surfaces on or off globally, for member roles, or for individual users without changing the active build manifest."
      adminPages={adminPages}
    >
      <LocalizedLink
        href="/admin/system-settings"
        locale={locale}
        className={buttonVariants({
          variant: 'ghost',
          size: 'sm',
          className: 'w-fit',
        })}
      >
        Back to system settings
      </LocalizedLink>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Configured features"
          value={String(featureStates.length)}
        />
        <MetricCard label="Effective features" value={String(effectiveCount)} />
        <MetricCard label="Site-wide disables" value={String(disabledCount)} />
        <MetricCard label="Role overrides" value={String(roleOverrideCount)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How this works</CardTitle>
          <CardDescription>
            Build-time manifest flags are still the hard ceiling. These controls
            can set global defaults and role-specific availability, but they
            cannot force-enable functionality that is absent from the current
            build. Individual user settings can still override supported
            member-role functionality from the user inspection screen.
          </CardDescription>
        </CardHeader>
      </Card>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Global defaults
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            These defaults apply whenever there is no narrower role or user
            override.
          </p>
        </div>

        <div className="grid gap-4">
          {featureStates.map((state) => (
            <form
              key={state.featureKey}
              action={saveFeatureState}
              className="grid gap-4 rounded-[1.75rem] border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950/70 lg:grid-cols-[minmax(0,1fr)_auto]"
            >
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="featureKey" value={state.featureKey} />

              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-lg font-semibold tracking-tight">
                    {state.label}
                  </p>
                  <Badge variant="outline">{state.category}</Badge>
                  <Badge
                    variant={state.effectiveEnabled ? 'secondary' : 'default'}
                  >
                    {state.effectiveEnabled ? 'Live' : 'Disabled'}
                  </Badge>
                  {state.supportsUserOverrides ? (
                    <Badge variant="outline">user overrides available</Badge>
                  ) : null}
                  {!state.manifestEnabled ? (
                    <Badge variant="outline">missing from current build</Badge>
                  ) : null}
                </div>

                <p className="text-sm text-zinc-600 dark:text-zinc-300">
                  {state.description}
                </p>

                <div className="grid gap-2 text-sm text-zinc-600 dark:text-zinc-300 md:grid-cols-3">
                  <p>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      Feature key:
                    </span>{' '}
                    {state.featureKey}
                  </p>
                  <p>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      Build status:
                    </span>{' '}
                    {state.manifestEnabled ? 'Enabled' : 'Disabled'}
                  </p>
                  <p>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      Site-wide status:
                    </span>{' '}
                    {state.siteEnabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-start gap-3 lg:items-end">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    name="enabled"
                    defaultChecked={state.siteEnabled}
                    disabled={!state.manifestEnabled}
                  />
                  Enabled site wide
                </label>

                <button
                  type="submit"
                  disabled={!state.manifestEnabled}
                  className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950"
                >
                  Save
                </button>
              </div>
            </form>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Role overrides
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Role settings apply to supported signed-in functionality for all
            managers or members unless a user-specific override exists.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <RoleFeatureControls
            locale={locale}
            role="MANAGER"
            states={managerFeatureStates}
          />
          <RoleFeatureControls
            locale={locale}
            role="USER"
            states={userFeatureStates}
          />
        </div>
      </section>
    </AdminPageShell>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function RoleFeatureControls({
  locale,
  role,
  states,
}: {
  locale: string;
  role: AppRole;
  states: Awaited<ReturnType<typeof listRoleFoundationFeatureStates>>;
}) {
  const effectiveCount = states.filter(
    (state) => state.effectiveEnabled,
  ).length;

  return (
    <div className="space-y-3 rounded-[1.75rem] border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950/70">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">{role}</h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            {effectiveCount} of {states.length} supported features available
          </p>
        </div>
        <Badge variant="outline">member role</Badge>
      </div>

      <div className="grid gap-3">
        {states.map((state) => {
          const roleEnabled = state.roleEnabled ?? state.siteEnabled;

          return (
            <form
              key={state.featureKey}
              action={saveRoleFeatureState}
              className="grid gap-3 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800"
            >
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="role" value={role} />
              <input type="hidden" name="featureKey" value={state.featureKey} />

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium tracking-tight">{state.label}</p>
                  <Badge
                    variant={state.effectiveEnabled ? 'secondary' : 'default'}
                  >
                    {state.effectiveEnabled ? 'Available' : 'Unavailable'}
                  </Badge>
                  {state.roleEnabled === null ? (
                    <Badge variant="outline">using global default</Badge>
                  ) : null}
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-300">
                  {state.description}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    name="enabled"
                    defaultChecked={roleEnabled}
                    disabled={!state.manifestEnabled}
                  />
                  Enabled for {role.toLowerCase()}
                </label>

                <button
                  type="submit"
                  disabled={!state.manifestEnabled}
                  className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950"
                >
                  Save
                </button>
              </div>
            </form>
          );
        })}
      </div>
    </div>
  );
}
