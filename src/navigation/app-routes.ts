import {
  type AppPermissionKey,
  type AppRole,
  canReadOwnNotifications,
  isAdmin,
} from '@/lib/authorization';
import type { AppHotkey } from '@/src/app-config/contracts';
import {
  type FoundationFeatureKey,
  foundationFeatureKeys,
} from '@/src/app-config/feature-keys';
import { loadActiveApp } from '@/src/app-config/load-active-app';
import { isFeatureEnabled } from '@/src/foundation/features/runtime';
import type { NavigationCategoryKey } from '@/src/navigation/navigation-categories';

export type AppPageKey = string;
export type { AppHotkey };

type Visibility = 'public' | 'guest' | 'authenticated' | 'workspace' | 'admin';

export type AppPageDefinition = {
  key: AppPageKey;
  href: string;
  translationKey: string;
  visibility: Visibility;
  navigationCategory?: NavigationCategoryKey;
  hotkey?: AppHotkey;
  order: number;
  prefetch?: boolean;
  featureKey?: FoundationFeatureKey;
  permission?: AppPermissionKey;
};

const foundationPageDefinitions: readonly AppPageDefinition[] = [
  {
    key: 'blog',
    href: '/blog',
    translationKey: 'links.blog',
    visibility: 'public',
    navigationCategory: 'discover',
    hotkey: ['alt', 'g'],
    order: 110,
    featureKey: 'content.blog',
  },
  {
    key: 'changelog',
    href: '/changelog',
    translationKey: 'links.changelog',
    visibility: 'public',
    navigationCategory: 'discover',
    hotkey: ['alt', 'k'],
    order: 120,
    featureKey: 'content.changelog',
  },
  {
    key: 'reportProblem',
    href: '/report-problem',
    translationKey: 'links.reportProblem',
    visibility: 'public',
    navigationCategory: 'discover',
    hotkey: ['alt', 'b'],
    order: 130,
    featureKey: 'reportProblem',
  },
  {
    key: 'friends',
    href: '/friends',
    translationKey: 'links.friends',
    visibility: 'authenticated',
    navigationCategory: 'social',
    hotkey: ['alt', 'j'],
    order: 220,
    featureKey: 'people.directory',
  },
  {
    key: 'memberChat',
    href: '/chat',
    translationKey: 'links.chat',
    visibility: 'authenticated',
    navigationCategory: 'social',
    hotkey: ['alt', 'u'],
    order: 225,
    featureKey: 'people.directory',
  },
  {
    key: 'groups',
    href: '/groups',
    translationKey: 'links.groups',
    visibility: 'authenticated',
    navigationCategory: 'social',
    hotkey: ['alt', 'o'],
    order: 230,
    featureKey: 'groups',
  },
  {
    key: 'notifications',
    href: '/notifications',
    translationKey: 'links.notifications',
    visibility: 'authenticated',
    navigationCategory: 'social',
    hotkey: ['alt', 'n'],
    order: 240,
    featureKey: 'notifications',
    permission: 'notifications.readOwn',
  },
  {
    key: 'admin',
    href: '/admin',
    translationKey: 'links.adminOverview',
    visibility: 'admin',
    navigationCategory: 'admin',
    hotkey: ['alt', 'm'],
    order: 310,
    featureKey: 'admin.workspace',
    permission: 'admin.access',
  },
  {
    key: 'adminContent',
    href: '/admin/content',
    translationKey: 'links.adminContent',
    visibility: 'admin',
    navigationCategory: 'admin',
    hotkey: ['alt', 'c'],
    order: 320,
    featureKey: 'admin.content',
    permission: 'admin.content.read',
  },
  {
    key: 'adminReports',
    href: '/admin/reports',
    translationKey: 'links.adminReports',
    visibility: 'admin',
    navigationCategory: 'admin',
    hotkey: ['alt', 't'],
    order: 330,
    featureKey: 'admin.reports',
    permission: 'admin.reports.read',
  },
  {
    key: 'adminUsers',
    href: '/admin/users',
    translationKey: 'links.adminUsers',
    visibility: 'admin',
    navigationCategory: 'admin',
    hotkey: ['alt', 'y'],
    order: 340,
    featureKey: 'admin.users',
    permission: 'admin.users.read',
  },
  {
    key: 'adminProblemReports',
    href: '/admin/problem-reports',
    translationKey: 'links.adminProblemReports',
    visibility: 'admin',
    navigationCategory: 'admin',
    hotkey: ['alt', '1'],
    order: 345,
    featureKey: 'reportProblem',
    permission: 'admin.problemReports.read',
  },
  {
    key: 'adminEmailTemplates',
    href: '/admin/email-templates',
    translationKey: 'links.adminEmailTemplates',
    visibility: 'admin',
    navigationCategory: 'admin',
    hotkey: ['alt', 'i'],
    order: 350,
    featureKey: 'admin.systemSettings',
    permission: 'admin.systemSettings.read',
  },
  {
    key: 'adminSystemSettings',
    href: '/admin/system-settings',
    translationKey: 'links.adminSystemSettings',
    visibility: 'admin',
    navigationCategory: 'admin',
    hotkey: ['alt', 's'],
    order: 360,
    featureKey: 'admin.systemSettings',
    permission: 'admin.systemSettings.read',
  },
  {
    key: 'adminDataStudio',
    href: '/admin/data-studio',
    translationKey: 'links.adminDataStudio',
    visibility: 'admin',
    navigationCategory: 'admin',
    hotkey: ['alt', 'd'],
    order: 370,
    featureKey: 'admin.dataStudio',
    permission: 'admin.dataStudio.read',
  },
  {
    key: 'profile',
    href: '/profile',
    translationKey: 'menu.profile',
    visibility: 'authenticated',
    navigationCategory: 'social',
    hotkey: ['alt', 'p'],
    order: 210,
  },
  {
    key: 'settings',
    href: '/settings',
    translationKey: 'menu.settings',
    visibility: 'authenticated',
    hotkey: ['alt', 'e'],
    order: 420,
  },
  {
    key: 'login',
    href: '/login',
    translationKey: 'auth.login',
    visibility: 'guest',
    hotkey: ['alt', 'l'],
    order: 510,
  },
  {
    key: 'register',
    href: '/register',
    translationKey: 'auth.register',
    visibility: 'guest',
    hotkey: ['alt', 'r'],
    order: 520,
    featureKey: 'account.register',
  },
] as const;

function hrefFromSlug(slug: string) {
  return slug ? `/${slug}` : '/';
}

export function getAppPublicPageDefinitionsForManifest(
  manifest = loadActiveApp(),
): AppPageDefinition[] {
  const publicNavigationByPageId = new Map(
    manifest.publicNavigation.map((item) => [item.pageId, item]),
  );

  for (const item of manifest.publicNavigation) {
    const page = manifest.publicPages.find(
      (candidate) => candidate.id === item.pageId,
    );

    if (!page) {
      throw new Error(
        `Public navigation item "${item.pageId}" does not match any public page in manifest "${manifest.id}".`,
      );
    }
  }

  return manifest.publicPages.map((page, index) => {
    const navigationItem = publicNavigationByPageId.get(page.id);
    return {
      key: page.id,
      href: hrefFromSlug(page.slug),
      translationKey: `links.${page.id}`,
      visibility: 'public',
      navigationCategory: navigationItem?.category,
      hotkey: navigationItem?.hotkey,
      order: navigationItem?.order ?? 100 + index,
      prefetch: navigationItem?.prefetch,
      featureKey: page.featureKey,
    } satisfies AppPageDefinition;
  });
}

export function composeAppPageDefinitions(
  manifest = loadActiveApp(),
): AppPageDefinition[] {
  return [
    ...getAppPublicPageDefinitionsForManifest(manifest),
    ...foundationPageDefinitions,
  ]
    .filter(
      (page) => !page.featureKey || isFeatureEnabled(page.featureKey, manifest),
    )
    .sort((left, right) => left.order - right.order);
}

export const appPageDefinitions: readonly AppPageDefinition[] =
  composeAppPageDefinitions();

export function formatAppHotkey(hotkey: AppHotkey) {
  return hotkey.map((part) => part.toUpperCase()).join('+');
}

export function canViewAppPage(
  page: AppPageDefinition,
  {
    isAuthenticated,
    role,
    permissionSet,
  }: {
    isAuthenticated: boolean;
    role: AppRole | null | undefined;
    permissionSet?: ReadonlySet<AppPermissionKey>;
  },
) {
  const hasRequiredPermission =
    !page.permission || !permissionSet || permissionSet.has(page.permission);

  if (page.visibility === 'guest') {
    return !isAuthenticated;
  }

  if (page.visibility === 'authenticated') {
    if (page.permission === 'notifications.readOwn') {
      return (
        isAuthenticated &&
        hasRequiredPermission &&
        canReadOwnNotifications(role)
      );
    }

    return isAuthenticated && hasRequiredPermission;
  }

  if (page.visibility === 'admin') {
    return isAuthenticated && hasRequiredPermission && isAdmin(role);
  }

  return hasRequiredPermission;
}

export function getVisibleAppPages({
  isAuthenticated,
  role,
  permissionSet,
  featureStateByKey,
}: {
  isAuthenticated: boolean;
  role: AppRole | null | undefined;
  permissionSet?: ReadonlySet<AppPermissionKey>;
  featureStateByKey?: Partial<Record<FoundationFeatureKey, boolean>>;
}) {
  const normalizedFeatureStates = featureStateByKey
    ? (Object.fromEntries(
        foundationFeatureKeys.map((featureKey) => [
          featureKey,
          featureStateByKey[featureKey] !== false,
        ]),
      ) as Record<FoundationFeatureKey, boolean>)
    : undefined;

  return appPageDefinitions
    .filter(
      (page) =>
        !page.featureKey ||
        normalizedFeatureStates?.[page.featureKey] !== false,
    )
    .filter((page) =>
      canViewAppPage(page, { isAuthenticated, role, permissionSet }),
    );
}
