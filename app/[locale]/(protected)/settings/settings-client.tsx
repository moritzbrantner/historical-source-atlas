'use client';

import { AccountDeleteForm } from '@/components/account-delete-form';
import { AccountEmailForm } from '@/components/account-email-form';
import { ProfileBannerForm } from '@/components/profile-banner-form';
import { ProfileBlockedUsersForm } from '@/components/profile-blocked-users-form';
import { ProfileFollowerVisibilityForm } from '@/components/profile-follower-visibility-form';
import { ProfileImageForm } from '@/components/profile-image-form';
import { ConsentSettingsCard } from '@/components/privacy/consent-settings-card';
import { ProfileSearchVisibilityForm } from '@/components/profile-search-visibility-form';
import { AppSettingsPanel } from '@/components/settings/app-settings-panel';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link, usePathname } from '@/i18n/navigation';

import type { AppSession } from '@/src/auth';
import type { AccountCapabilities } from '@/src/auth/oauth/types';
import type { ProfileDirectoryEntry } from '@/src/domain/profile/use-cases';
import { useTranslations } from '@/src/i18n';
import type { ConsentState } from '@/src/privacy/contracts';
import type { FollowerVisibilityRole } from '@/src/profile/follower-visibility';
import {
  isAppSettingsSection,
  settingsSections,
  type SettingsSection,
} from '@/src/settings/sections';

export type { SettingsSection } from '@/src/settings/sections';

export function SettingsClient({
  locale,
  section,
  session,
  accountCapabilities,
  consent,
  initialSearchVisibility,
  initialFollowerVisibility,
  initialBlockedProfiles,
}: {
  locale: string;
  section: SettingsSection;
  session: AppSession;
  accountCapabilities: AccountCapabilities;
  consent: ConsentState;
  initialSearchVisibility: boolean;
  initialFollowerVisibility: FollowerVisibilityRole;
  initialBlockedProfiles: ProfileDirectoryEntry[];
}) {
  const t = useTranslations('SettingsPage');
  const role = session.user.role ?? 'USER';

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">
            {t('title')}
          </h1>
          <Badge variant="secondary">{t(`roles.${role.toLowerCase()}`)}</Badge>
        </div>
        <Badge variant="outline">{locale.toUpperCase()}</Badge>
      </header>

      <SettingsSectionNav activeSection={section} />

      <main className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-4 dark:border-zinc-800">
          <h2 className="text-xl font-semibold tracking-tight">
            {getSectionTitle(t, section)}
          </h2>
          {isAppSettingsSection(section) ? (
            <Badge variant="outline">{t('saveState')}</Badge>
          ) : null}
        </div>
        {renderSettingsSection({
          section,
          session,
          accountCapabilities,
          consent,
          initialSearchVisibility,
          initialFollowerVisibility,
          initialBlockedProfiles,
          t,
        })}
      </main>
    </section>
  );
}

function SettingsSectionNav({
  activeSection,
}: {
  activeSection: SettingsSection;
}) {
  const t = useTranslations('SettingsPage');
  const pathname = usePathname();

  return (
    <nav
      aria-label={t('navigationLabel')}
      className="flex gap-2 overflow-x-auto border-b border-zinc-200 pb-2 dark:border-zinc-800"
    >
      {settingsSections.map((section) => {
        const href =
          section === 'appearance' ? '/settings' : `/settings/${section}`;
        const isActive =
          activeSection === section ||
          (section === 'appearance' && pathname === '/settings');

        return (
          <Link
            key={section}
            href={href}
            aria-current={isActive ? 'page' : undefined}
            className={buttonVariants({
              variant: isActive ? 'default' : 'ghost',
              size: 'sm',
              className: 'shrink-0',
            })}
          >
            {getSectionTitle(t, section)}
          </Link>
        );
      })}
    </nav>
  );
}

function renderSettingsSection({
  section,
  session,
  accountCapabilities,
  consent,
  initialSearchVisibility,
  initialFollowerVisibility,
  initialBlockedProfiles,
  t,
}: {
  section: SettingsSection;
  session: AppSession;
  accountCapabilities: AccountCapabilities;
  consent: ConsentState;
  initialSearchVisibility: boolean;
  initialFollowerVisibility: FollowerVisibilityRole;
  initialBlockedProfiles: ProfileDirectoryEntry[];
  t: ReturnType<typeof useTranslations>;
}) {
  if (isAppSettingsSection(section)) {
    return <AppSettingsPanel section={section} />;
  }

  switch (section) {
    case 'profile':
      return (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('profilePictureTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ProfileImageForm
                currentImage={session.user.image ?? null}
                labels={{
                  chooseImage: t('form.chooseImage'),
                  hint: t('form.hint'),
                  upload: t('form.upload'),
                  uploading: t('form.uploading'),
                  remove: t('form.remove'),
                  success: t('form.success'),
                  empty: t('form.empty'),
                  alt: t('form.alt'),
                  cropTitle: t('form.cropTitle'),
                  cropDescription: t('form.cropDescription'),
                  cropZoom: t('form.cropZoom'),
                  cropCancel: t('form.cropCancel'),
                  cropApply: t('form.cropApply'),
                  ready: t('form.ready'),
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('profileBannerTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ProfileBannerForm
                currentImage={session.user.bannerImage ?? null}
                labels={{
                  chooseImage: t('bannerForm.chooseImage'),
                  hint: t('bannerForm.hint'),
                  upload: t('bannerForm.upload'),
                  uploading: t('bannerForm.uploading'),
                  remove: t('bannerForm.remove'),
                  success: t('bannerForm.success'),
                  empty: t('bannerForm.empty'),
                  alt: t('bannerForm.alt'),
                  ready: t('bannerForm.ready'),
                }}
              />
            </CardContent>
          </Card>
        </div>
      );

    case 'privacy':
      return (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('profileDiscovery.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ProfileSearchVisibilityForm
                initialIsSearchable={initialSearchVisibility}
                labels={{
                  title: t('profileDiscovery.toggleTitle'),
                  description: t('profileDiscovery.toggleDescription'),
                  saving: t('profileDiscovery.saving'),
                  successEnabled: t('profileDiscovery.successEnabled'),
                  successDisabled: t('profileDiscovery.successDisabled'),
                  error: t('profileDiscovery.error'),
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('followerVisibility.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ProfileFollowerVisibilityForm
                initialFollowerVisibility={initialFollowerVisibility}
                labels={{
                  saving: t('followerVisibility.saving'),
                  success: t('followerVisibility.success'),
                  error: t('followerVisibility.error'),
                  options: {
                    PUBLIC: {
                      title: t('followerVisibility.options.PUBLIC.title'),
                      description: t(
                        'followerVisibility.options.PUBLIC.description',
                      ),
                    },
                    MEMBERS: {
                      title: t('followerVisibility.options.MEMBERS.title'),
                      description: t(
                        'followerVisibility.options.MEMBERS.description',
                      ),
                    },
                    PRIVATE: {
                      title: t('followerVisibility.options.PRIVATE.title'),
                      description: t(
                        'followerVisibility.options.PRIVATE.description',
                      ),
                    },
                  },
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('blockedUsers.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ProfileBlockedUsersForm
                initialProfiles={initialBlockedProfiles}
                labels={{
                  empty: t('blockedUsers.empty'),
                  unblock: t('blockedUsers.unblock'),
                  unblocking: t('blockedUsers.unblocking'),
                  error: t('blockedUsers.error'),
                  success: t('blockedUsers.success'),
                }}
              />
            </CardContent>
          </Card>

          <ConsentSettingsCard initialConsent={consent} />
        </div>
      );

    case 'account': {
      const passwordManagementDisabled = !accountCapabilities.hasPassword;

      return (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('account.email.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              {passwordManagementDisabled ? (
                <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-300">
                  {t('account.passwordlessNotice')}
                </p>
              ) : null}
              <AccountEmailForm
                currentEmail={session.user.email}
                disabled={!accountCapabilities.canManageEmailWithPassword}
                labels={{
                  currentEmail: t('account.email.currentEmail'),
                  currentEmailMissing: t('account.email.currentEmailMissing'),
                  newEmail: t('account.email.newEmail'),
                  currentPassword: t('account.email.currentPassword'),
                  save: t('account.email.save'),
                  saving: t('account.email.saving'),
                  success: t('account.email.success'),
                  genericError: t('account.email.genericError'),
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>{t('account.deletion.title')}</CardTitle>
                <Badge variant="outline">{t('account.deletion.badge')}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-300">
                {t('account.deletion.warning')}
              </p>
              {passwordManagementDisabled ? (
                <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-300">
                  {t('account.passwordlessNotice')}
                </p>
              ) : null}
              <AccountDeleteForm
                disabled={!accountCapabilities.canDeleteWithPassword}
                labels={{
                  currentPassword: t('account.deletion.currentPassword'),
                  remove: t('account.deletion.remove'),
                  removing: t('account.deletion.removing'),
                  redirecting: t('account.deletion.redirecting'),
                  genericError: t('account.deletion.genericError'),
                }}
              />
            </CardContent>
          </Card>
        </div>
      );
    }
  }
}

function getSectionTitle(
  t: ReturnType<typeof useTranslations>,
  section: SettingsSection,
) {
  return t(`tabs.${section}`);
}
