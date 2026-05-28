'use client';

import Image from 'next/image';
import { UserPlus } from 'lucide-react';
import { useState } from 'react';

import { ProfileFriendSearchDialog } from '@/components/profile-friend-search-dialog';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { ProfileDirectoryEntry } from '@/src/domain/profile/use-cases';
import { readProblemDetail } from '@/src/http/problem-client';
import { useTranslations } from '@/src/i18n';
import { formatProfileTag } from '@/src/profile/tags';

type FriendsDirectoryProps = {
  initialFriends: ProfileDirectoryEntry[];
};

type FollowMutationResponse = {
  isFriend?: boolean;
};

export function FriendsDirectory({ initialFriends }: FriendsDirectoryProps) {
  const t = useTranslations('PeoplePage');
  const followErrorMessage = t('actions.error');
  const blockErrorMessage = t('actions.blockError');
  const [friendProfiles, setFriendProfiles] = useState(initialFriends);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [pendingUserIds, setPendingUserIds] = useState<string[]>([]);

  function markPendingUser(userId: string, isPending: boolean) {
    setPendingUserIds((current) => {
      if (isPending) {
        return current.includes(userId) ? current : [...current, userId];
      }

      return current.filter((currentUserId) => currentUserId !== userId);
    });
  }

  async function updateFollowState(
    profile: ProfileDirectoryEntry,
    shouldFollow: boolean,
  ) {
    markPendingUser(profile.userId, true);
    setActionError(null);
    setActionMessage(null);

    try {
      const response = await fetch('/api/profile/follow', {
        method: shouldFollow ? 'POST' : 'DELETE',
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

      if (shouldFollow) {
        if (payload.isFriend) {
          setFriendProfiles((current) =>
            current.some(
              (currentProfile) => currentProfile.userId === profile.userId,
            )
              ? current
              : [profile, ...current],
          );
          setActionMessage(
            t('actions.friendAdded', { name: profile.displayName }),
          );
        } else {
          setActionMessage(
            t('actions.followAdded', { name: profile.displayName }),
          );
        }
      } else {
        setFriendProfiles((current) =>
          current.filter(
            (currentProfile) => currentProfile.userId !== profile.userId,
          ),
        );
      }
    } catch {
      setActionError(followErrorMessage);
    } finally {
      markPendingUser(profile.userId, false);
    }
  }

  async function blockProfile(profile: ProfileDirectoryEntry) {
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

      setFriendProfiles((current) =>
        current.filter(
          (currentProfile) => currentProfile.userId !== profile.userId,
        ),
      );
    } catch {
      setActionError(blockErrorMessage);
    } finally {
      markPendingUser(profile.userId, false);
    }
  }

  function handleSearchProfileFollowed(
    profile: ProfileDirectoryEntry,
    payload: FollowMutationResponse,
  ) {
    setActionError(null);
    if (payload.isFriend) {
      setFriendProfiles((current) =>
        current.some(
          (currentProfile) => currentProfile.userId === profile.userId,
        )
          ? current
          : [profile, ...current],
      );
      setActionMessage(t('actions.friendAdded', { name: profile.displayName }));
      return;
    }

    setActionMessage(t('actions.followAdded', { name: profile.displayName }));
  }

  function handleSearchProfileBlocked(profile: ProfileDirectoryEntry) {
    setActionError(null);
    setActionMessage(null);
    setFriendProfiles((current) =>
      current.filter(
        (currentProfile) => currentProfile.userId !== profile.userId,
      ),
    );
  }

  function handleSearchProfileUnfollowed(profile: ProfileDirectoryEntry) {
    setActionError(null);
    setActionMessage(null);
    setFriendProfiles((current) =>
      current.filter(
        (currentProfile) => currentProfile.userId !== profile.userId,
      ),
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle>{t('friends.title')}</CardTitle>
            <CardDescription>
              {friendProfiles.length > 0
                ? t('friends.description', { count: friendProfiles.length })
                : t('friends.empty')}
            </CardDescription>
          </div>
          <Button
            type="button"
            className="gap-2 self-start"
            onClick={() => setIsSearchOpen(true)}
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            {t('actions.addFriend')}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
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

          {friendProfiles.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-300 p-5 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
              {t('friends.empty')}
            </div>
          ) : null}

          {friendProfiles.map((profile) => (
            <ProfileRow
              key={profile.userId}
              profile={profile}
              actionLabel={t('actions.unfollow')}
              pendingLabel={t('actions.unfollowing')}
              actionVariant="outline"
              isPending={pendingUserIds.includes(profile.userId)}
              onAction={() => updateFollowState(profile, false)}
              secondaryActionLabel={t('actions.block')}
              secondaryPendingLabel={t('actions.blocking')}
              onSecondaryAction={() => blockProfile(profile)}
            />
          ))}
        </CardContent>
      </Card>

      <ProfileFriendSearchDialog
        isOpen={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        onProfileFollowed={handleSearchProfileFollowed}
        onProfileUnfollowed={handleSearchProfileUnfollowed}
        onProfileBlocked={handleSearchProfileBlocked}
      />
    </>
  );
}

function ProfileRow({
  profile,
  actionLabel,
  pendingLabel,
  actionVariant,
  isPending,
  onAction,
  secondaryActionLabel,
  secondaryPendingLabel,
  onSecondaryAction,
}: {
  profile: ProfileDirectoryEntry;
  actionLabel: string;
  pendingLabel: string;
  actionVariant: 'default' | 'outline';
  isPending: boolean;
  onAction: () => void;
  secondaryActionLabel?: string;
  secondaryPendingLabel?: string;
  onSecondaryAction?: () => void;
}) {
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
        </div>
      </div>

      <div className="flex items-center gap-2">
        {secondaryActionLabel && onSecondaryAction ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={onSecondaryAction}
          >
            {isPending ? secondaryPendingLabel : secondaryActionLabel}
          </Button>
        ) : null}

        <Button
          type="button"
          variant={actionVariant}
          size="sm"
          disabled={isPending}
          onClick={onAction}
        >
          {isPending ? pendingLabel : actionLabel}
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
