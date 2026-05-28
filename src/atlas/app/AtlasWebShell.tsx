'use client';

import {
  PlatformNavbar,
  type PlatformNavbarGroup,
  type PlatformNavbarRenderLinkProps,
} from '@moritzbrantner/ui';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const atlasNavigationGroups: PlatformNavbarGroup[] = [
  {
    id: 'explore',
    label: 'Explore',
    items: [
      {
        id: 'atlas',
        href: '/',
        label: 'Atlas',
      },
      {
        id: 'about',
        href: '/about',
        label: 'About',
      },
    ],
  },
];

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
  if (pathname === '/') {
    return 'atlas';
  }

  if (pathname === '/about') {
    return 'about';
  }

  return undefined;
}

function AtlasTopNavbar() {
  const pathname = usePathname();
  const brand = (
    <NextLink href="/" className="block truncate">
      Historical Source Atlas
    </NextLink>
  );

  return (
    <header className="sticky top-0 z-20 overflow-visible border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
      <PlatformNavbar
        key={pathname}
        aria-label="Primary navigation"
        brand={brand}
        groups={atlasNavigationGroups}
        activeItemId={getActiveNavbarItemId(pathname)}
        defaultOpenGroupId={null}
        renderLink={renderAtlasNavbarLink}
      />
    </header>
  );
}

export function AtlasWebShell({ children }: { children: ReactNode }) {
  return (
    <>
      <AtlasTopNavbar />
      {children}
    </>
  );
}
