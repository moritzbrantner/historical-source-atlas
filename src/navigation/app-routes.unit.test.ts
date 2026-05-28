import { describe, expect, it } from 'vitest';

import {
  appPageDefinitions,
  composeAppPageDefinitions,
  getVisibleAppPages,
  type AppPageKey,
} from '@/src/navigation/app-routes';
import type { AppManifest } from '@/src/app-config/contracts';

type VisibilityCase = {
  label: string;
  input: {
    isAuthenticated: boolean;
    role: 'USER' | 'MANAGER' | 'ADMIN' | 'SUPERADMIN' | null;
  };
  visibleKeys: readonly AppPageKey[];
  hiddenKeys: readonly AppPageKey[];
};

describe('app routes', () => {
  it('assigns a unique hotkey to every route', () => {
    const seenRoutesByHotkey = new Map<string, string>();
    const duplicates: string[] = [];

    for (const page of appPageDefinitions) {
      if (!page.hotkey) {
        continue;
      }

      const hotkey = page.hotkey.join('+');
      const existingRoute = seenRoutesByHotkey.get(hotkey);

      if (existingRoute) {
        duplicates.push(`${hotkey}: ${existingRoute}, ${page.key}`);
        continue;
      }

      seenRoutesByHotkey.set(hotkey, page.key);
    }

    expect(duplicates).toEqual([]);
  });

  it('indexes public pages even when they are not in navigation', () => {
    const manifest = {
      id: 'searchable-public-pages',
      siteName: 'Searchable Public Pages',
      defaultLocaleMetadata: {
        title: 'Searchable Public Pages',
        description: 'Search fixture',
      },
      enabledFeatures: {},
      publicPages: [
        {
          id: 'home',
          slug: '',
          kind: 'component',
          namespace: 'HomePage',
          render: () => null,
        },
        {
          id: 'legal',
          slug: 'legal',
          kind: 'component',
          namespace: 'LegalPage',
          render: () => null,
        },
      ],
      publicNavigation: [
        {
          pageId: 'home',
          category: 'discover',
          hotkey: ['alt', 'h'],
          order: 10,
        },
      ],
      contentRoots: {
        pages: [],
        blog: [],
        changelog: [],
      },
      loadMessages: () => ({}),
      exampleApis: {},
    } satisfies AppManifest;

    const pages = composeAppPageDefinitions(manifest);
    const legalPage = pages.find((page) => page.key === 'legal');

    expect(legalPage).toMatchObject({
      href: '/legal',
      translationKey: 'links.legal',
      visibility: 'public',
    });
    expect(legalPage?.hotkey).toBeUndefined();
  });

  it.each([
    {
      label: 'guests',
      input: { isAuthenticated: false, role: null },
      visibleKeys: ['home', 'about', 'login', 'register'],
      hiddenKeys: [
        'friends',
        'memberChat',
        'groups',
        'notifications',
        'profile',
        'settings',
        'admin',
        'adminContent',
        'adminReports',
        'adminUsers',
        'adminProblemReports',
        'adminEmailTemplates',
        'adminSystemSettings',
        'adminDataStudio',
      ],
    },
    {
      label: 'signed-in users',
      input: { isAuthenticated: true, role: 'USER' as const },
      visibleKeys: [
        'home',
        'friends',
        'memberChat',
        'groups',
        'notifications',
        'profile',
        'settings',
      ],
      hiddenKeys: [
        'login',
        'register',
        'admin',
        'adminContent',
        'adminReports',
        'adminUsers',
        'adminProblemReports',
        'adminEmailTemplates',
        'adminSystemSettings',
        'adminDataStudio',
      ],
    },
    {
      label: 'managers',
      input: { isAuthenticated: true, role: 'MANAGER' as const },
      visibleKeys: [
        'home',
        'friends',
        'memberChat',
        'groups',
        'notifications',
        'profile',
        'settings',
      ],
      hiddenKeys: [
        'login',
        'register',
        'admin',
        'adminContent',
        'adminReports',
        'adminUsers',
        'adminProblemReports',
        'adminEmailTemplates',
        'adminSystemSettings',
        'adminDataStudio',
      ],
    },
    {
      label: 'admins',
      input: { isAuthenticated: true, role: 'ADMIN' as const },
      visibleKeys: [
        'friends',
        'memberChat',
        'groups',
        'notifications',
        'profile',
        'settings',
        'admin',
        'adminContent',
        'adminReports',
        'adminUsers',
        'adminProblemReports',
        'adminEmailTemplates',
        'adminSystemSettings',
        'adminDataStudio',
      ],
      hiddenKeys: ['login', 'register'],
    },
    {
      label: 'superadmins',
      input: { isAuthenticated: true, role: 'SUPERADMIN' as const },
      visibleKeys: [
        'friends',
        'groups',
        'notifications',
        'profile',
        'settings',
        'admin',
        'adminContent',
        'adminReports',
        'adminUsers',
        'adminProblemReports',
        'adminEmailTemplates',
        'adminSystemSettings',
        'adminDataStudio',
      ],
      hiddenKeys: ['login', 'register'],
    },
  ] satisfies readonly VisibilityCase[])(
    'exposes the right hotkey destinations for $label',
    ({ input, visibleKeys, hiddenKeys }) => {
      const visiblePageKeys = new Set(
        getVisibleAppPages(input).map((page) => page.key),
      );

      for (const key of visibleKeys) {
        expect(visiblePageKeys.has(key)).toBe(true);
      }

      for (const key of hiddenKeys) {
        expect(visiblePageKeys.has(key)).toBe(false);
      }
    },
  );

  it('filters pages whose dynamic feature state is disabled for the active user', () => {
    const visiblePageKeys = new Set(
      getVisibleAppPages({
        isAuthenticated: true,
        role: 'USER',
        featureStateByKey: {
          groups: false,
          notifications: false,
          'people.directory': false,
          'admin.dataStudio': true,
        },
      }).map((page) => page.key),
    );

    expect(visiblePageKeys.has('groups')).toBe(false);
    expect(visiblePageKeys.has('notifications')).toBe(false);
    expect(visiblePageKeys.has('friends')).toBe(false);
    expect(visiblePageKeys.has('memberChat')).toBe(false);
    expect(visiblePageKeys.has('adminDataStudio')).toBe(false);
  });

  it('does not let a raw permission set bypass admin route visibility', () => {
    const visiblePageKeys = new Set(
      getVisibleAppPages({
        isAuthenticated: true,
        role: 'USER',
        permissionSet: new Set(['admin.dataStudio.read', 'admin.access']),
      }).map((page) => page.key),
    );

    expect(visiblePageKeys.has('adminDataStudio')).toBe(false);
    expect(visiblePageKeys.has('admin')).toBe(false);
  });
});
