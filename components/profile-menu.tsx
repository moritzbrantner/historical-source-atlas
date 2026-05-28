'use client';

import Image from 'next/image';
import { useEffect, useEffectEvent, useRef, useState } from 'react';

import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { buttonVariants } from '@/components/ui/button';
import { useRouter } from '@/i18n/navigation';

type ProfileMenuProps = {
  locale: AppLocale;
  profileHref: string;
  settingsHref: string;
  imageUrl: string | null;
  displayName: string;
  labels: {
    profile: string;
    settings: string;
    logout: string;
    openMenu: string;
  };
};

export function ProfileMenu({
  locale,
  profileHref,
  settingsHref,
  imageUrl,
  displayName,
  labels,
}: ProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const detailsRef = useRef<HTMLDetailsElement | null>(null);
  const router = useRouter();

  const closeMenu = useEffectEvent(() => {
    if (detailsRef.current) {
      detailsRef.current.open = false;
    }

    setOpen(false);
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!detailsRef.current?.contains(event.target as Node)) {
        closeMenu();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <details
      ref={detailsRef}
      className="group relative"
      onToggle={(event) => {
        setOpen(event.currentTarget.open);
      }}
    >
      <summary
        className="relative flex h-9 w-9 list-none items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 [&::-webkit-details-marker]:hidden"
        role="button"
        aria-label={labels.openMenu}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={displayName}
            fill
            sizes="36px"
            unoptimized
            className="object-cover"
          />
        ) : (
          <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-100">
            {displayName.charAt(0).toUpperCase() || 'U'}
          </span>
        )}
      </summary>

      <div
        role="menu"
        className={[
          'absolute right-0 top-full z-20 mt-2 w-44 rounded-md border border-zinc-200 bg-white p-1 shadow-lg transition-opacity dark:border-zinc-700 dark:bg-zinc-900',
          'pointer-events-none invisible opacity-0 group-open:pointer-events-auto group-open:visible group-open:opacity-100',
        ].join(' ')}
      >
        <Link
          href={profileHref}
          onClick={closeMenu}
          className={buttonVariants({
            variant: 'ghost',
            size: 'sm',
            className: 'w-full justify-start',
          })}
        >
          {labels.profile}
        </Link>
        <Link
          href={settingsHref}
          onClick={closeMenu}
          className={buttonVariants({
            variant: 'ghost',
            size: 'sm',
            className: 'w-full justify-start',
          })}
        >
          {labels.settings}
        </Link>
        <button
          type="button"
          className={buttonVariants({
            variant: 'ghost',
            size: 'sm',
            className:
              'w-full justify-start text-red-600 hover:text-red-600 dark:text-red-400 dark:hover:text-red-400',
          })}
          onClick={() => {
            void fetch('/api/auth/logout', {
              method: 'POST',
            }).then(() => {
              closeMenu();
              router.push('/', locale);
              router.refresh();
            });
          }}
        >
          {labels.logout}
        </button>
      </div>
    </details>
  );
}
