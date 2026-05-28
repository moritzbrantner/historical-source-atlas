'use client';

import {
  AccountMenu,
  Button,
  defaultLanguageSwitcherLanguages,
  LanguageSwitcher,
  NotificationMenu,
  ThemeModeSwitch,
} from '@moritzbrantner/ui';
import { useEffect, useState, useSyncExternalStore } from 'react';

import { NavigationHotkeysTrigger } from '@/components/navigation-hotkeys-trigger';
import {
  dispatchAllNotificationsMarkedRead,
  dispatchNotificationMarkedRead,
  NOTIFICATION_MARK_ALL_READ_EVENT,
  NOTIFICATION_MARK_READ_EVENT,
} from '@/components/notifications/events';
import { postNotificationRead } from '@/components/notifications/read-action';
import { usePathname, useRouter } from '@/i18n/navigation';
import { type AppLocale, routing } from '@/i18n/routing';
import {
  isTheme,
  THEME_COOKIE_NAME,
  THEME_STORAGE_KEY,
  type Theme,
} from '@/lib/theme';
import type { AppSession } from '@/src/auth';
import type { NotificationPreview } from '@/src/domain/notifications/use-cases';

type NavigationHotkey = readonly [string, string];

type NavigationHotkeyItem = {
  key: string;
  href: string;
  label: string;
  groupLabel: string;
  hotkey?: NavigationHotkey;
  hotkeyLabel?: string;
  searchText: string;
};

type NotificationMenuState = {
  items: NonNullable<NotificationPreview>['items'];
  unreadCount: number;
};

type LocaleShellControlsProps = {
  locale: AppLocale;
  session: AppSession | null;
  notificationCenter: NotificationPreview | null;
  profileHref: string;
  authLabels: {
    login: string;
    register: string;
  };
  profileLabels: {
    profile: string;
    settings: string;
    logout: string;
    openMenu: string;
  };
  notificationLabels: {
    title: string;
    empty: string;
    markAllRead: string;
  };
  languageLabels: {
    label: string;
  };
  themeLabels: {
    label: string;
    light: string;
    dark: string;
  };
  hotkeyItems: NavigationHotkeyItem[];
  hotkeyLabels: {
    button: string;
    title: string;
    description: string;
    searchPlaceholder: string;
    empty: string;
  };
};

function getSystemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function getThemeSnapshot(): Theme {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isTheme(storedTheme) ? storedTheme : getSystemTheme();
}

function subscribeTheme(onStoreChange: () => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const onThemeChange = () => onStoreChange();

  window.addEventListener('storage', onThemeChange);
  window.addEventListener('themechange', onThemeChange);

  return () => {
    window.removeEventListener('storage', onThemeChange);
    window.removeEventListener('themechange', onThemeChange);
  };
}

function persistTheme(theme: Theme) {
  document.documentElement.classList.remove('light', 'dark');
  document.documentElement.classList.add(theme);
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  document.cookie = `${THEME_COOKIE_NAME}=${theme}; path=/; max-age=31536000; samesite=lax`;
  window.dispatchEvent(new Event('themechange'));
}

function formatNotificationDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function markNotificationRead(
  state: NotificationMenuState,
  notificationId: string,
): NotificationMenuState {
  const target = state.items.find((item) => item.id === notificationId);

  if (!target || target.status === 'read') {
    return state;
  }

  return {
    items: state.items.map((item) =>
      item.id === notificationId ? { ...item, status: 'read' } : item,
    ),
    unreadCount: Math.max(0, state.unreadCount - 1),
  };
}

export function LocaleShellControls({
  locale,
  session,
  notificationCenter,
  profileHref,
  authLabels,
  profileLabels,
  notificationLabels,
  languageLabels,
  themeLabels,
  hotkeyItems,
  hotkeyLabels,
}: LocaleShellControlsProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [notificationState, setNotificationState] =
    useState<NotificationMenuState>({
      items: notificationCenter?.items ?? [],
      unreadCount: notificationCenter?.unreadCount ?? 0,
    });
  const theme = useSyncExternalStore<Theme>(
    subscribeTheme,
    getThemeSnapshot,
    () => 'light',
  );
  const languages = defaultLanguageSwitcherLanguages.filter((language) =>
    routing.locales.includes(language.value as AppLocale),
  );

  useEffect(() => {
    setNotificationState({
      items: notificationCenter?.items ?? [],
      unreadCount: notificationCenter?.unreadCount ?? 0,
    });
  }, [notificationCenter]);

  useEffect(() => {
    function handleMarkRead(event: Event) {
      const detail = (event as CustomEvent<{ notificationId?: string }>).detail;
      const notificationId = detail?.notificationId;

      if (!notificationId) {
        return;
      }

      setNotificationState((currentState) =>
        markNotificationRead(currentState, notificationId),
      );
    }

    function handleMarkAllRead() {
      setNotificationState((currentState) => ({
        items: currentState.items.map((item) =>
          item.status === 'unread' ? { ...item, status: 'read' } : item,
        ),
        unreadCount: 0,
      }));
    }

    window.addEventListener(NOTIFICATION_MARK_READ_EVENT, handleMarkRead);
    window.addEventListener(
      NOTIFICATION_MARK_ALL_READ_EVENT,
      handleMarkAllRead,
    );

    return () => {
      window.removeEventListener(NOTIFICATION_MARK_READ_EVENT, handleMarkRead);
      window.removeEventListener(
        NOTIFICATION_MARK_ALL_READ_EVENT,
        handleMarkAllRead,
      );
    };
  }, []);

  async function markNotificationReadAndNavigate(
    notificationId: string,
    href?: string | null,
  ) {
    let markedRead = false;

    try {
      const response = await postNotificationRead(notificationId);

      if (response.ok) {
        markedRead = true;
        dispatchNotificationMarkedRead(notificationId);
      }
    } finally {
      if (href) {
        router.push(href);
      } else if (markedRead) {
        router.refresh();
      }
    }
  }

  async function markAllNotificationsRead() {
    const response = await fetch('/api/notifications/read', {
      method: 'POST',
    });

    if (!response.ok) {
      return;
    }

    dispatchAllNotificationsMarkedRead();
    router.refresh();
  }

  return (
    <>
      {session?.user?.id ? (
        <>
          <NotificationMenu
            label={notificationLabels.title}
            unreadCount={notificationState.unreadCount}
            emptyLabel={notificationLabels.empty}
            markAllReadLabel={notificationLabels.markAllRead}
            onMarkAllRead={
              notificationState.unreadCount > 0
                ? markAllNotificationsRead
                : undefined
            }
            onMarkRead={(itemId) => {
              void markNotificationReadAndNavigate(itemId);
            }}
            items={notificationState.items.map((item) => {
              const href = item.href;

              return {
                id: item.id,
                title: item.title,
                description: item.body,
                unread: item.status === 'unread',
                meta: formatNotificationDate(item.createdAt),
                onSelect: href
                  ? () => {
                      if (item.status === 'unread') {
                        void markNotificationReadAndNavigate(item.id, href);
                        return;
                      }

                      router.push(href);
                    }
                  : undefined,
              };
            })}
            maxItems={5}
          />
          <AccountMenu
            label={profileLabels.openMenu}
            user={{
              name: session.user.name ?? 'User',
              email: session.user.email ?? undefined,
              imageUrl: session.user.image,
            }}
            items={[
              {
                id: 'profile',
                label: profileLabels.profile,
                onSelect: () => router.push(profileHref),
              },
              {
                id: 'settings',
                label: profileLabels.settings,
                onSelect: () => router.push('/settings'),
              },
              {
                id: 'logout',
                label: profileLabels.logout,
                destructive: true,
                onSelect: () => {
                  void fetch('/api/auth/logout', {
                    method: 'POST',
                  }).then(() => {
                    router.push('/', locale);
                    router.refresh();
                  });
                },
              },
            ]}
          />
        </>
      ) : (
        <>
          <Button asChild variant="ghost" size="sm">
            <a href={`/${locale}/login`}>{authLabels.login}</a>
          </Button>
          <Button asChild size="sm">
            <a href={`/${locale}/register`}>{authLabels.register}</a>
          </Button>
        </>
      )}
      <NavigationHotkeysTrigger items={hotkeyItems} labels={hotkeyLabels} />
      <LanguageSwitcher
        aria-label={languageLabels.label}
        languages={languages}
        value={locale}
        onValueChange={(nextLocale) => {
          router.push(pathname, nextLocale as AppLocale);
        }}
      />
      <ThemeModeSwitch
        aria-label={themeLabels.label}
        mode={theme}
        lightLabel={themeLabels.light}
        darkLabel={themeLabels.dark}
        onModeChange={persistTheme}
      />
    </>
  );
}
