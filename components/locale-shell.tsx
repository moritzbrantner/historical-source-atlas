import { PageContent, type PlatformNavbarGroup } from '@moritzbrantner/ui';
import type { ReactNode } from 'react';
import { Suspense } from 'react';

import { DeferredConsentBanner } from '@/components/deferred-consent-banner';
import { LocaleShellNavbar } from '@/components/locale-shell-navbar';
import { LocaleShellControls } from '@/components/locale-shell-controls';
import { NavigationAnalyticsTracker } from '@/components/navigation-analytics-tracker';
import { SiteAnnouncementBanner } from '@/components/site-announcement-banner';
import { SiteAnnouncementStack } from '@/components/site-announcement-stack';
import { type AppLocale, withLocalePath } from '@/i18n/routing';
import type { AppSession } from '@/src/auth';
import { getPermissionSetForRole } from '@/src/domain/authorization/service';
import type { NotificationPreview } from '@/src/domain/notifications/use-cases';
import { getFoundationFeatureAvailabilityMap } from '@/src/foundation/features/access';
import { createTranslator } from '@/src/i18n/messages';
import {
  formatAppHotkey,
  getVisibleAppPages,
} from '@/src/navigation/app-routes';
import { buildNavigationCategories } from '@/src/navigation/navigation-categories';
import { buildNavigationSearchText } from '@/src/navigation/search-index';
import { buildPublicProfilePath } from '@/src/profile/tags';
import { loadAppContext } from '@/src/runtime.functions';

type LocaleShellProps = {
  children: ReactNode;
  locale: AppLocale;
  siteName: string;
  session?: AppSession | null;
  notificationCenter?: NotificationPreview | null;
  announcements?: Array<{
    id: string;
    title: string;
    body: string;
    href: string | null;
  }>;
  analyticsEnabled?: boolean;
};

function getHotkeyGroupLabel(
  category: 'discover' | 'social' | 'workspace' | 'admin' | undefined,
  t: ReturnType<typeof createTranslator>,
  fallbackCategory?: 'discover',
) {
  if (category === 'discover') {
    return t('categories.discover');
  }

  if (category === 'social') {
    return t('categories.social');
  }

  if (category === 'workspace') {
    return t('categories.workspace');
  }

  if (category === 'admin') {
    return t('categories.admin');
  }

  if (fallbackCategory === 'discover') {
    return t('categories.discover');
  }

  return t('hotkeys.accountGroup');
}

function getPlatformNavbarItemId(categoryKey: string, href: string) {
  return `${categoryKey}:${href}`;
}

function getSearchFallbackLabel(pageKey: string) {
  return pageKey
    .replace(/[-_]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getSearchLabel(
  t: ReturnType<typeof createTranslator>,
  translationKey: string,
  pageKey: string,
) {
  try {
    return t(translationKey);
  } catch {
    return getSearchFallbackLabel(pageKey);
  }
}

export async function LocaleShell({
  children,
  locale,
  siteName,
  session,
  notificationCenter,
  announcements,
  analyticsEnabled = false,
}: LocaleShellProps) {
  const providedContext =
    session !== undefined && notificationCenter !== undefined
      ? { session, notificationCenter }
      : await loadAppContext();
  const resolvedSession = providedContext.session ?? null;
  const resolvedNotificationCenter = providedContext.notificationCenter ?? null;
  const [permissionSet, featureStateByKey] = await Promise.all([
    getPermissionSetForRole(resolvedSession?.user.role),
    getFoundationFeatureAvailabilityMap(resolvedSession?.user ?? null),
  ]);
  const t = createTranslator(locale, 'NavigationBar');
  const languageT = createTranslator(locale, 'LanguageSelector');
  const themeT = createTranslator(locale, 'ThemeToggle');
  const navigationGroups: PlatformNavbarGroup[] = buildNavigationCategories({
    isAuthenticated: Boolean(resolvedSession?.user?.id),
    role: resolvedSession?.user?.role,
    permissionSet,
    featureStateByKey,
  }).map((category) => ({
    id: category.key,
    label: t(`categories.${category.key}`),
    items: category.links.map((link) => ({
      id: getPlatformNavbarItemId(category.key, link.href),
      href: withLocalePath(link.href, locale),
      label: t(link.translationKey),
      meta: formatAppHotkey(link.hotkey),
    })),
  }));
  const hotkeyLabels = {
    button: t('hotkeys.button'),
    title: t('hotkeys.title'),
    description: t('hotkeys.description'),
    searchPlaceholder: t('hotkeys.searchPlaceholder'),
    empty: t('hotkeys.empty'),
  };
  const hotkeyItems = getVisibleAppPages({
    isAuthenticated: Boolean(resolvedSession?.user?.id),
    role: resolvedSession?.user?.role,
    permissionSet,
    featureStateByKey,
  }).map((page) => {
    const label = getSearchLabel(t, page.translationKey, page.key);
    const groupLabel = getHotkeyGroupLabel(
      page.navigationCategory,
      t,
      page.visibility === 'public' ? 'discover' : undefined,
    );
    const hotkeyLabel = page.hotkey ? formatAppHotkey(page.hotkey) : undefined;

    return {
      key: page.key,
      href: page.href,
      label,
      groupLabel,
      hotkey: page.hotkey,
      hotkeyLabel,
      searchText: buildNavigationSearchText([
        groupLabel,
        label,
        page.key,
        page.href,
        page.hotkey?.join(' ') ?? '',
        hotkeyLabel ?? '',
      ]),
    };
  });
  const actions = (
    <LocaleShellControls
      locale={locale}
      session={resolvedSession}
      notificationCenter={resolvedNotificationCenter}
      profileHref={
        resolvedSession?.user.tag
          ? buildPublicProfilePath(resolvedSession.user.tag)
          : '/profile'
      }
      authLabels={{
        login: t('auth.login'),
        register: t('auth.register'),
      }}
      profileLabels={{
        profile: t('menu.profile'),
        settings: t('menu.settings'),
        logout: t('menu.logout'),
        openMenu: t('menu.openMenu'),
      }}
      notificationLabels={{
        title: t('notifications.title'),
        empty: t('notifications.empty'),
        markAllRead: t('notifications.markRead'),
      }}
      languageLabels={{
        label: languageT('label'),
      }}
      themeLabels={{
        label: themeT('switchTo', { theme: themeT('darkTheme') }),
        light: themeT('lightLabel'),
        dark: themeT('darkLabel'),
      }}
      hotkeyItems={hotkeyItems}
      hotkeyLabels={hotkeyLabels}
    />
  );

  return (
    <>
      <Suspense fallback={null}>
        <NavigationAnalyticsTracker enabled={analyticsEnabled} />
      </Suspense>
      <LocaleShellNavbar
        brandHref={withLocalePath('/', locale)}
        brandLabel={siteName || t('brand')}
        groups={navigationGroups}
        actions={actions}
      />
      <PageContent className="app-shell mx-auto min-h-[calc(100vh-4rem)] w-full max-w-5xl px-4 py-10">
        <DeferredConsentBanner />
        {announcements ? (
          announcements.map((announcement) => (
            <SiteAnnouncementBanner
              key={announcement.id}
              announcement={announcement}
              locale={locale}
            />
          ))
        ) : (
          <Suspense fallback={null}>
            <SiteAnnouncementStack locale={locale} />
          </Suspense>
        )}
        {children}
      </PageContent>
    </>
  );
}
