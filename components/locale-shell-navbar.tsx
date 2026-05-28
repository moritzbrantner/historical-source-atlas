'use client';

import {
  PlatformNavbar,
  type PlatformNavbarGroup,
  type PlatformNavbarRenderLinkProps,
} from '@moritzbrantner/ui';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

type LocaleShellNavbarProps = {
  brandHref: string;
  brandLabel: string;
  groups: PlatformNavbarGroup[];
  actions: ReactNode;
};

function renderNavbarLink({
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

export function LocaleShellNavbar({
  brandHref,
  brandLabel,
  groups,
  actions,
}: LocaleShellNavbarProps) {
  const pathname = usePathname();
  const brand = (
    <NextLink href={brandHref} className="block truncate">
      {brandLabel}
    </NextLink>
  );

  return (
    <header className="sticky top-0 z-10 overflow-visible border-b border-zinc-200 bg-white/95 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/95">
      <PlatformNavbar
        key={pathname}
        aria-label="Primary navigation"
        brand={brand}
        groups={groups}
        actions={actions}
        defaultOpenGroupId={null}
        renderLink={renderNavbarLink}
      />
    </header>
  );
}
