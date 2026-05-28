'use client';

import Image from 'next/image';
import { Search, X } from 'lucide-react';
import { useDeferredValue, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from '@/i18n/navigation';
import type {
  ProfileDirectoryEntry,
  ProfileSearchEntry,
} from '@/src/domain/profile/use-cases';
import { readProblemDetail } from '@/src/http/problem-client';
import { useTranslations } from '@/src/i18n';
import { formatProfileTag } from '@/src/profile/tags';

type FollowMutationResponse = {
  following?: boolean;
  isFriend?: boolean;
};

type ProfileFriendSearchDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onProfileFollowed?: (
    profile: ProfileDirectoryEntry,
    payload: FollowMutationResponse,
  ) => void;
  onProfileUnfollowed?: (profile: ProfileSearchEntry) => void;
  onProfileBlocked?: (profile: ProfileDirectoryEntry) => void;
};

export function ProfileFriendSearchDialog({
  isOpen,
  onOpenChange,
  onProfileFollowed,
  onProfileUnfollowed,
  onProfileBlocked,
}: ProfileFriendSearchDialogProps) {
  const t = useTranslations('PeoplePage');
  const searchErrorMessage = t('search.error');
  const followErrorMessage = t('actions.error');
  const blockErrorMessage = t('actions.blockError');
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [searchResults, setSearchResults] = useState<ProfileSearchEntry[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [pendingUserIds, setPendingUserIds] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const normalizedQuery = deferredQuery.trim();

    const abortController = new AbortController();

    async function loadSearchResults() {
      setIsSearching(true);
      setSearchError(null);

      try {
        const searchParams = new URLSearchParams({
          refresh: String(refreshKey),
        });
        if (normalizedQuery) {
          searchParams.set('query', normalizedQuery);
        }
        const response = await fetch(
          `/api/profile/search?${searchParams.toString()}`,
          {
            signal: abortController.signal,
          },
        );

        if (!response.ok) {
          const problem = await readProblemDetail(response, searchErrorMessage);
          setSearchError(problem.message);
          setSearchResults([]);
          return;
        }

        const payload = (await response.json()) as {
          profiles?: ProfileSearchEntry[];
        };
        setSearchResults(payload.profiles ?? []);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setSearchError(searchErrorMessage);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }

    void loadSearchResults();

    return () => {
      abortController.abort();
    };
  }, [deferredQuery, isOpen, refreshKey, searchErrorMessage]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onOpenChange(false);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onOpenChange]);

  function markPendingUser(userId: string, isPending: boolean) {
    setPendingUserIds((current) => {
      if (isPending) {
        return current.includes(userId) ? current : [...current, userId];
      }

      return current.filter((currentUserId) => currentUserId !== userId);
    });
  }

  function replaceSearchProfile(
    profile: ProfileSearchEntry,
    updates: Partial<ProfileSearchEntry>,
  ) {
    setSearchResults((current) =>
      current.map((currentProfile) =>
        currentProfile.userId === profile.userId
          ? { ...currentProfile, ...updates }
          : currentProfile,
      ),
    );
  }

  async function followProfile(profile: ProfileSearchEntry) {
    markPendingUser(profile.userId, true);
    setActionError(null);
    setActionMessage(null);

    try {
      const response = await fetch('/api/profile/follow', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ userId: profile.userId }),
      });

      if (!response.ok) {
        const problem = await readProblemDetail(response, followErrorMessage);
        setActionError(problem.message);
        return;
      }

      const payload = (await response.json()) as FollowMutationResponse;

      setActionMessage(
        payload.isFriend
          ? t('actions.friendAdded', { name: profile.displayName })
          : t('actions.followAdded', { name: profile.displayName }),
      );
      replaceSearchProfile(profile, {
        isFollowing: true,
        isFriend: Boolean(payload.isFriend),
        followerCount: profile.followerCount + 1,
      });
      onProfileFollowed?.(profile, payload);
    } catch {
      setActionError(followErrorMessage);
    } finally {
      markPendingUser(profile.userId, false);
    }
  }

  async function unfollowProfile(profile: ProfileSearchEntry) {
    markPendingUser(profile.userId, true);
    setActionError(null);
    setActionMessage(null);

    try {
      const response = await fetch('/api/profile/follow', {
        method: 'DELETE',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ userId: profile.userId }),
      });

      if (!response.ok) {
        const problem = await readProblemDetail(response, followErrorMessage);
        setActionError(problem.message);
        return;
      }

      replaceSearchProfile(profile, {
        isFollowing: false,
        isFriend: false,
        followerCount: Math.max(0, profile.followerCount - 1),
      });
      onProfileUnfollowed?.(profile);
    } catch {
      setActionError(followErrorMessage);
    } finally {
      markPendingUser(profile.userId, false);
    }
  }

  async function blockProfile(profile: ProfileSearchEntry) {
    markPendingUser(profile.userId, true);
    setActionError(null);
    setActionMessage(null);

    try {
      const response = await fetch('/api/profile/block', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ userId: profile.userId }),
      });

      if (!response.ok) {
        const problem = await readProblemDetail(response, blockErrorMessage);
        setActionError(problem.message);
        return;
      }

      setSearchResults((current) =>
        current.filter(
          (currentProfile) => currentProfile.userId !== profile.userId,
        ),
      );
      setRefreshKey((current) => current + 1);
      onProfileBlocked?.(profile);
    } catch {
      setActionError(blockErrorMessage);
    } finally {
      markPendingUser(profile.userId, false);
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-zinc-950/55 px-4 py-16 backdrop-blur-sm sm:items-center sm:py-8"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onOpenChange(false);
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="friend-search-title"
        className="w-full max-w-2xl overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 p-5 dark:border-zinc-800">
          <div className="space-y-1">
            <h2
              id="friend-search-title"
              className="text-lg font-semibold text-zinc-950 dark:text-zinc-50"
            >
              {t('search.title')}
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              {t('search.description')}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 w-9 px-0"
            aria-label={t('search.close')}
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <div className="space-y-4 p-5">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('search.placeholder')}
              aria-label={t('search.placeholder')}
              autoFocus
              className="pl-9"
            />
          </div>

          {isSearching ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              {t('search.loading')}
            </p>
          ) : null}
          {searchError ? (
            <p className="text-sm text-red-600 dark:text-red-400">
              {searchError}
            </p>
          ) : null}
          {actionError ? (
            <p className="text-sm text-red-600 dark:text-red-400">
              {actionError}
            </p>
          ) : null}
          {actionMessage ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              {actionMessage}
            </p>
          ) : null}

          {!deferredQuery.trim() &&
          !isSearching &&
          searchResults.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-300 p-5 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
              {t('search.idle')}
            </div>
          ) : null}

          {deferredQuery.trim() &&
          !isSearching &&
          !searchError &&
          searchResults.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-300 p-5 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
              {t('search.empty')}
            </div>
          ) : null}

          {searchResults.length > 0 ? (
            <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
              {searchResults.map((profile) => (
                <ProfileSearchResultRow
                  key={profile.userId}
                  profile={profile}
                  isPending={pendingUserIds.includes(profile.userId)}
                  onFollow={() => followProfile(profile)}
                  onUnfollow={() => unfollowProfile(profile)}
                  onBlock={() => blockProfile(profile)}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ProfileSearchResultRow({
  profile,
  isPending,
  onFollow,
  onUnfollow,
  onBlock,
}: {
  profile: ProfileSearchEntry;
  isPending: boolean;
  onFollow: () => void;
  onUnfollow: () => void;
  onBlock: () => void;
}) {
  const t = useTranslations('PeoplePage');
  const relationshipLabel = profile.isFriend
    ? t('search.badges.friend')
    : profile.followsViewer
      ? t('search.badges.followsYou')
      : profile.followerCount > 0
        ? t('search.badges.popular', { count: profile.followerCount })
        : null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3 dark:border-zinc-800">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar imageUrl={profile.imageUrl} displayName={profile.displayName} />
        <div className="min-w-0">
          <Link
            href={`/profile/@${profile.tag}`}
            className="block truncate font-medium hover:underline"
          >
            {profile.displayName}
          </Link>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            {formatProfileTag(profile.tag)}
          </p>
          {relationshipLabel ? (
            <p className="mt-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {relationshipLabel}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={onBlock}
        >
          {isPending ? t('actions.blocking') : t('actions.block')}
        </Button>

        <Button
          type="button"
          size="sm"
          variant={profile.isFollowing ? 'outline' : 'default'}
          disabled={isPending}
          onClick={profile.isFollowing ? onUnfollow : onFollow}
        >
          {isPending
            ? profile.isFollowing
              ? t('actions.unfollowing')
              : t('actions.following')
            : profile.isFollowing
              ? t('actions.unfollow')
              : t('actions.follow')}
        </Button>
      </div>
    </div>
  );
}

function Avatar({
  imageUrl,
  displayName,
}: {
  imageUrl: string | null;
  displayName: string;
}) {
  return (
    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 text-sm font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={displayName}
          fill
          sizes="48px"
          unoptimized
          className="object-cover"
        />
      ) : (
        <span>{displayName.charAt(0).toUpperCase() || 'U'}</span>
      )}
    </div>
  );
}
