import Image from 'next/image';
import type { ReactNode } from 'react';

import { LocalizedLink } from '@/i18n/server-link';
import type { AppLocale } from '@/i18n/routing';
import type { ProfileDirectoryEntry } from '@/src/domain/profile/use-cases';
import { buildProfileChatPath, formatProfileTag } from '@/src/profile/tags';

type ProfileChatShellProps = {
  locale: AppLocale;
  profiles: ProfileDirectoryEntry[];
  selectedMemberId: string | null;
  title: string;
  description: string;
  empty: string;
  children: ReactNode;
};

export function ProfileChatShell({
  locale,
  profiles,
  selectedMemberId,
  title,
  description,
  empty,
  children,
}: ProfileChatShellProps) {
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-4 lg:min-h-[40rem] lg:flex-row">
      <aside className="w-full shrink-0 rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 lg:w-80">
        <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            {description}
          </p>
        </div>

        <nav className="max-h-[32rem] space-y-1 overflow-y-auto p-2">
          {profiles.length > 0 ? (
            profiles.map((profile) => {
              const isSelected = profile.userId === selectedMemberId;

              return (
                <LocalizedLink
                  key={profile.userId}
                  href={buildProfileChatPath(profile.userId)}
                  locale={locale}
                  aria-current={isSelected ? 'page' : undefined}
                  className={[
                    'flex min-w-0 items-center gap-3 rounded-md px-3 py-2 text-left transition-colors',
                    isSelected
                      ? 'bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950'
                      : 'text-zinc-900 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-900',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <Avatar
                    imageUrl={profile.imageUrl}
                    displayName={profile.displayName}
                    selected={isSelected}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {profile.displayName}
                    </span>
                    <span
                      className={[
                        'block truncate text-xs',
                        isSelected
                          ? 'text-zinc-300 dark:text-zinc-600'
                          : 'text-zinc-500 dark:text-zinc-400',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {formatProfileTag(profile.tag)}
                    </span>
                  </span>
                </LocalizedLink>
              );
            })
          ) : (
            <p className="rounded-md border border-dashed border-zinc-300 p-4 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
              {empty}
            </p>
          )}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </section>
  );
}

function Avatar({
  imageUrl,
  displayName,
  selected,
}: {
  imageUrl: string | null;
  displayName: string;
  selected: boolean;
}) {
  return (
    <span
      className={[
        'relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border text-sm font-semibold',
        selected
          ? 'border-white/30 bg-white/15 text-white dark:border-zinc-950/20 dark:bg-zinc-950/10 dark:text-zinc-950'
          : 'border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={displayName}
          fill
          sizes="44px"
          unoptimized
          className="object-cover"
        />
      ) : (
        <span>{displayName.charAt(0).toUpperCase() || 'U'}</span>
      )}
    </span>
  );
}
