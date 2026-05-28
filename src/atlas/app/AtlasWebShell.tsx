'use client';

import {
  defaultLanguageSwitcherLanguages,
  LanguageSwitcher,
  PlatformNavbar,
  type PlatformNavbarGroup,
  type PlatformNavbarRenderLinkProps,
  ThemeModeSwitch,
} from '@moritzbrantner/ui';
import NextLink from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useSyncExternalStore } from 'react';

import {
  type AppLocale,
  routing,
  stripLocaleFromPathname,
  withLocalePath,
} from '@/i18n/routing';
import {
  isTheme,
  THEME_COOKIE_NAME,
  THEME_STORAGE_KEY,
  type Theme,
} from '@/lib/theme';

function getAtlasNavigationGroups(locale: AppLocale): PlatformNavbarGroup[] {
  return [
    {
      id: 'explore',
      label: 'Explore',
      items: [
        {
          id: 'atlas',
          href: withLocalePath('/atlas', locale),
          label: 'Atlas',
        },
        {
          id: 'about',
          href: withLocalePath('/atlas/about', locale),
          label: 'About',
        },
      ],
    },
  ];
}

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

const languageLabels: Record<AppLocale, string> = {
  de: 'Sprachauswahl',
  en: 'Language selector',
  es: 'Selector de idioma',
  fr: 'Selecteur de langue',
};

const themeLabels: Record<
  AppLocale,
  {
    dark: string;
    label: string;
    light: string;
  }
> = {
  de: {
    dark: 'Dunkel',
    label: 'Darstellung wechseln',
    light: 'Hell',
  },
  en: {
    dark: 'Dark',
    label: 'Toggle theme',
    light: 'Light',
  },
  es: {
    dark: 'Oscuro',
    label: 'Cambiar tema',
    light: 'Claro',
  },
  fr: {
    dark: 'Sombre',
    label: 'Changer le theme',
    light: 'Clair',
  },
};

function renderAtlasNavbarLink({
  href,
  className,
  children,
  onClick,
  disabled,
  'aria-current': ariaCurrent,
}: PlatformNavbarRenderLinkProps) {
  if (!href || disabled) {
    return (
      <button
        type="button"
        className={className}
        disabled={disabled}
        onClick={disabled ? undefined : onClick}
        aria-current={ariaCurrent}
      >
        {children}
      </button>
    );
  }

  return (
    <NextLink
      href={href}
      className={className}
      onClick={onClick}
      aria-current={ariaCurrent}
    >
      {children}
    </NextLink>
  );
}

function getActiveNavbarItemId(pathname: string | null) {
  const normalizedPathname = stripLocaleFromPathname(pathname ?? '/');

  if (
    normalizedPathname === '/atlas' ||
    normalizedPathname.startsWith('/atlas/sources/')
  ) {
    return 'atlas';
  }

  if (normalizedPathname === '/atlas/about') {
    return 'about';
  }

  return undefined;
}

function AtlasTopNavbar({ locale }: { locale: AppLocale }) {
  const pathname = usePathname();
  const router = useRouter();
  const theme = useSyncExternalStore<Theme>(
    subscribeTheme,
    getThemeSnapshot,
    () => 'light',
  );
  const languages = defaultLanguageSwitcherLanguages.filter((language) =>
    routing.locales.includes(language.value as AppLocale),
  );
  const controls = (
    <>
      <LanguageSwitcher
        aria-label={languageLabels[locale]}
        languages={languages}
        value={locale}
        onValueChange={(nextLocale) => {
          router.push(
            withLocalePath(
              stripLocaleFromPathname(pathname ?? '/atlas'),
              nextLocale as AppLocale,
            ),
          );
        }}
      />
      <ThemeModeSwitch
        aria-label={themeLabels[locale].label}
        mode={theme}
        lightLabel={themeLabels[locale].light}
        darkLabel={themeLabels[locale].dark}
        onModeChange={persistTheme}
      />
    </>
  );
  const brand = (
    <NextLink
      href={withLocalePath('/atlas', locale)}
      className="block truncate"
    >
      Historical Source Atlas
    </NextLink>
  );

  return (
    <header className="sticky top-0 z-20 overflow-visible border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
      <PlatformNavbar
        key={pathname}
        aria-label="Primary navigation"
        brand={brand}
        groups={getAtlasNavigationGroups(locale)}
        actions={controls}
        activeItemId={getActiveNavbarItemId(pathname)}
        defaultOpenGroupId={null}
        renderLink={renderAtlasNavbarLink}
      />
    </header>
  );
}

export function AtlasWebShell({
  children,
  locale,
}: {
  children: ReactNode;
  locale: AppLocale;
}) {
  return (
    <>
      <AtlasTopNavbar locale={locale} />
      {children}
    </>
  );
}
