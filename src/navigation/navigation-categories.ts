import type { AppPermissionKey, AppRole } from '@/lib/authorization';
import type { FoundationFeatureKey } from '@/src/app-config/feature-keys';
import {
  type AppPageDefinition,
  type AppHotkey,
  getVisibleAppPages,
} from '@/src/navigation/app-routes';

export type NavigationCategoryKey =
  | 'discover'
  | 'social'
  | 'workspace'
  | 'admin';

type NavigationLinkDefinition = {
  href: string;
  key: string;
  translationKey: string;
  hotkey: AppHotkey;
  prefetch?: boolean;
  order: number;
};

type NavigationCategoryDefinition = {
  key: NavigationCategoryKey;
  links: readonly NavigationLinkDefinition[];
};

export type NavigationCategory = {
  key: NavigationCategoryKey;
  links: readonly NavigationLinkDefinition[];
};

function isNavigationPage(
  page: AppPageDefinition,
  category: NavigationCategoryKey,
): page is AppPageDefinition & {
  navigationCategory: NavigationCategoryKey;
  hotkey: AppHotkey;
} {
  return page.navigationCategory === category && Boolean(page.hotkey);
}

export function buildNavigationCategories({
  isAuthenticated,
  role,
  permissionSet,
  featureStateByKey,
}: {
  isAuthenticated: boolean;
  role: AppRole | null | undefined;
  permissionSet?: ReadonlySet<AppPermissionKey>;
  featureStateByKey?: Partial<Record<FoundationFeatureKey, boolean>>;
}): NavigationCategory[] {
  const pages = getVisibleAppPages({
    isAuthenticated,
    role,
    permissionSet,
    featureStateByKey,
  });

  const navigationCategoryDefinitions: readonly NavigationCategoryDefinition[] =
    [
      {
        key: 'discover',
        links: pages
          .filter((page) => isNavigationPage(page, 'discover'))
          .map((page) => ({
            href: page.href,
            key: page.key,
            translationKey: page.translationKey,
            hotkey: page.hotkey,
            prefetch: page.prefetch,
            order: page.order,
          })),
      },
      {
        key: 'social',
        links: pages
          .filter((page) => isNavigationPage(page, 'social'))
          .map((page) => ({
            href: page.href,
            key: page.key,
            translationKey: page.translationKey,
            hotkey: page.hotkey,
            prefetch: page.prefetch,
            order: page.order,
          })),
      },
      {
        key: 'workspace',
        links: pages
          .filter((page) => isNavigationPage(page, 'workspace'))
          .map((page) => ({
            href: page.href,
            key: page.key,
            translationKey: page.translationKey,
            hotkey: page.hotkey,
            prefetch: page.prefetch,
            order: page.order,
          })),
      },
      {
        key: 'admin',
        links: pages
          .filter((page) => isNavigationPage(page, 'admin'))
          .map((page) => ({
            href: page.href,
            key: page.key,
            translationKey: page.translationKey,
            hotkey: page.hotkey,
            prefetch: page.prefetch,
            order: page.order,
          })),
      },
    ];

  return navigationCategoryDefinitions.flatMap((category) => {
    const links = [...category.links].sort(
      (left, right) => left.order - right.order,
    );

    if (!links.length) {
      return [];
    }

    return [{ key: category.key, links }];
  });
}
