'use client';

import Image from 'next/image';
import { MessageSquare, Send, UserPlus, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { ProfileFriendSearchDialog } from '@/components/profile-friend-search-dialog';
import type { AppLocale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type {
  ProfileDirectoryEntry,
  ProfileSearchEntry,
} from '@/src/domain/profile/use-cases';
import { readProblemDetail } from '@/src/http/problem-client';
import {
  buildProfileChatPath,
  buildPublicProfileFollowersPath,
  buildPublicProfileFollowingPath,
  formatProfileTag,
} from '@/src/profile/tags';

type ProfileFollowPanelProps = {
  locale: AppLocale;
  profileUserId: string;
  profileTag: string;
  displayName: string;
  imageUrl: string | null;
  bannerImageUrl: string | null;
  initialFollowerCount: number;
  initialFollowingCount: number;
  initialFriendCount?: number;
  initialIsFollowing: boolean;
  initialIsFriend: boolean;
  initialIsBlockedByViewer: boolean;
  isOwnProfile: boolean;
  canManageFollowState: boolean;
  canManageBlockState: boolean;
  canViewFollowersPage: boolean;
  canAddFriends: boolean;
  canSendMessage: boolean;
  labels: {
    followers: string;
    followingCount: string;
    friends: string;
    addFriend: string;
    follow: string;
    unfollow: string;
    following: string;
    unfollowing: string;
    block: string;
    unblock: string;
    blocking: string;
    unblocking: string;
    blockedDescription: string;
    error: string;
    sendMessage: string;
    sendMessageTitle: string;
    sendMessageDescription: string;
    sendMessagePlaceholder: string;
    sendMessageCancel: string;
    sendMessageSubmit: string;
    sendMessageSending: string;
    sendMessageSent: string;
    sendMessageOpenChat: string;
    sendMessageError: string;
  };
};

type FollowMutationResponse = {
  isFriend?: boolean;
};

export function ProfileFollowPanel({
  locale,
  profileUserId,
  profileTag,
  displayName,
  imageUrl,
  bannerImageUrl,
  initialFollowerCount,
  initialFollowingCount,
  initialFriendCount,
  initialIsFollowing,
  initialIsFriend,
  initialIsBlockedByViewer,
  isOwnProfile,
  canManageFollowState,
  canManageBlockState,
  canViewFollowersPage,
  canAddFriends,
  canSendMessage,
  labels,
}: ProfileFollowPanelProps) {
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [followingCount, setFollowingCount] = useState(initialFollowingCount);
  const [friendCount, setFriendCount] = useState(initialFriendCount);
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isFriend, setIsFriend] = useState(initialIsFriend);
  const [isBlockedByViewer, setIsBlockedByViewer] = useState(
    initialIsBlockedByViewer,
  );
  const [isFriendSearchOpen, setIsFriendSearchOpen] = useState(false);
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messageFeedback, setMessageFeedback] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [pendingAction, setPendingAction] = useState<'follow' | 'block' | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  async function handleFollowToggle() {
    const nextIsFollowing = !isFollowing;

    setPendingAction('follow');
    setError(null);

    try {
      const response = await fetch('/api/profile/follow', {
        method: nextIsFollowing ? 'POST' : 'DELETE',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ userId: profileUserId }),
      });

      if (!response.ok) {
        const problem = await readProblemDetail(response, labels.error);
        setError(problem.message);
        return;
      }

      const payload = (await response.json()) as FollowMutationResponse;
      setIsFollowing(nextIsFollowing);
      setIsFriend(nextIsFollowing && Boolean(payload.isFriend));
      setFollowerCount((current) =>
        Math.max(0, current + (nextIsFollowing ? 1 : -1)),
      );
    } catch {
      setError(labels.error);
    } finally {
      setPendingAction(null);
    }
  }

  async function handleBlockToggle() {
    const nextIsBlocked = !isBlockedByViewer;

    setPendingAction('block');
    setError(null);

    try {
      const response = await fetch('/api/profile/block', {
        method: nextIsBlocked ? 'POST' : 'DELETE',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ userId: profileUserId }),
      });

      if (!response.ok) {
        const problem = await readProblemDetail(response, labels.error);
        setError(problem.message);
        return;
      }

      if (nextIsBlocked && isFollowing) {
        setIsFollowing(false);
        setIsFriend(false);
        setFollowerCount((current) => Math.max(0, current - 1));
      }

      setIsBlockedByViewer(nextIsBlocked);
    } catch {
      setError(labels.error);
    } finally {
      setPendingAction(null);
    }
  }

  async function handleMessageSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSendingMessage(true);
    setMessageFeedback(null);
    setMessageError(null);

    try {
      const response = await fetch('/api/profile/message', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ userId: profileUserId, message }),
      });

      if (!response.ok) {
        const problem = await readProblemDetail(
          response,
          labels.sendMessageError,
        );
        setMessageError(problem.message);
        return;
      }

      setMessage('');
      setMessageFeedback(labels.sendMessageSent);
    } catch {
      setMessageError(labels.sendMessageError);
    } finally {
      setIsSendingMessage(false);
    }
  }

  function handleProfileFollowed(
    _profile: ProfileDirectoryEntry,
    payload: FollowMutationResponse,
  ) {
    setFollowingCount((current) => current + 1);

    if (payload.isFriend) {
      setFriendCount((current) =>
        typeof current === 'number' ? current + 1 : current,
      );
    }
  }

  function handleProfileUnfollowed(profile: ProfileSearchEntry) {
    setFollowingCount((current) => Math.max(0, current - 1));
    if (profile.isFriend) {
      setFriendCount((current) =>
        typeof current === 'number' ? Math.max(0, current - 1) : current,
      );
    }
  }

  return (
    <>
      <section className="mx-auto max-w-3xl">
        <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white/80 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/70">
          <div className="relative h-28 bg-gradient-to-r from-sky-100 via-white to-emerald-100 dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-900">
            {bannerImageUrl ? (
              <Image
                src={bannerImageUrl}
                alt=""
                fill
                sizes="(min-width: 768px) 768px, calc(100vw - 32px)"
                unoptimized
                className="object-cover"
                priority
              />
            ) : null}
          </div>

          <div className="flex flex-col gap-6 px-6 pb-6 md:flex-row md:items-end md:justify-between">
            <div className="-mt-12 flex items-end gap-4">
              <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-zinc-100 text-3xl font-semibold text-zinc-700 shadow-sm dark:border-zinc-950 dark:bg-zinc-800 dark:text-zinc-100">
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={displayName}
                    fill
                    sizes="96px"
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <span>{displayName.charAt(0).toUpperCase() || 'U'}</span>
                )}
              </div>

              <div className="space-y-2 pb-1">
                <h1 className="text-3xl font-semibold tracking-tight">
                  {displayName}
                </h1>
                <p className="text-sm text-zinc-600 dark:text-zinc-300">
                  {formatProfileTag(profileTag)}
                </p>
                <div className="flex flex-wrap gap-2">
                  {canViewFollowersPage ? (
                    <Link
                      href={buildPublicProfileFollowersPath(profileTag)}
                      locale={locale}
                      className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-sm text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-700 dark:hover:bg-zinc-800"
                    >
                      <span className="font-semibold">{followerCount}</span>
                      <span>{labels.followers}</span>
                    </Link>
                  ) : (
                    <ProfileStatPill
                      label={labels.followers}
                      value={followerCount}
                    />
                  )}
                  {canViewFollowersPage ? (
                    <ProfileStatLink
                      href={buildPublicProfileFollowingPath(profileTag)}
                      locale={locale}
                      label={labels.followingCount}
                      value={followingCount}
                    />
                  ) : (
                    <ProfileStatPill
                      label={labels.followingCount}
                      value={followingCount}
                    />
                  )}
                  {typeof friendCount === 'number' ? (
                    <ProfileStatLink
                      href="/friends"
                      locale={locale}
                      label={labels.friends}
                      value={friendCount}
                    />
                  ) : null}
                </div>
              </div>
            </div>

            {isOwnProfile && canAddFriends ? (
              <Button
                type="button"
                className="gap-2 self-start md:self-auto"
                onClick={() => setIsFriendSearchOpen(true)}
              >
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                {labels.addFriend}
              </Button>
            ) : null}

            {!isOwnProfile && canManageFollowState ? (
              <div className="flex flex-wrap items-center justify-end gap-3">
                {canSendMessage && isFriend && !isBlockedByViewer ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={() => {
                      setIsMessageDialogOpen(true);
                      setMessageFeedback(null);
                      setMessageError(null);
                    }}
                  >
                    <MessageSquare className="h-4 w-4" aria-hidden="true" />
                    {labels.sendMessage}
                  </Button>
                ) : null}

                {!isBlockedByViewer ? (
                  <Button
                    type="button"
                    onClick={handleFollowToggle}
                    disabled={pendingAction !== null}
                  >
                    {pendingAction === 'follow'
                      ? isFollowing
                        ? labels.unfollowing
                        : labels.following
                      : isFollowing
                        ? labels.unfollow
                        : labels.follow}
                  </Button>
                ) : null}

                {canManageBlockState ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBlockToggle}
                    disabled={pendingAction !== null}
                  >
                    {pendingAction === 'block'
                      ? isBlockedByViewer
                        ? labels.unblocking
                        : labels.blocking
                      : isBlockedByViewer
                        ? labels.unblock
                        : labels.block}
                  </Button>
                ) : null}
              </div>
            ) : null}

            {!isOwnProfile && !canManageFollowState && canManageBlockState ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleBlockToggle}
                disabled={pendingAction !== null}
              >
                {pendingAction === 'block'
                  ? isBlockedByViewer
                    ? labels.unblocking
                    : labels.blocking
                  : isBlockedByViewer
                    ? labels.unblock
                    : labels.block}
              </Button>
            ) : null}
          </div>
        </div>

        {isBlockedByViewer ? (
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">
            {labels.blockedDescription}
          </p>
        ) : null}
        {error ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : null}
      </section>

      <ProfileFriendSearchDialog
        isOpen={isFriendSearchOpen}
        onOpenChange={setIsFriendSearchOpen}
        onProfileFollowed={handleProfileFollowed}
        onProfileUnfollowed={handleProfileUnfollowed}
      />

      <ProfileMessageDialog
        isOpen={isMessageDialogOpen}
        displayName={displayName}
        message={message}
        isSending={isSendingMessage}
        feedback={messageFeedback}
        error={messageError}
        chatHref={buildProfileChatPath(profileUserId)}
        labels={labels}
        locale={locale}
        onMessageChange={setMessage}
        onSubmit={handleMessageSubmit}
        onClose={() => {
          setIsMessageDialogOpen(false);
          setMessageFeedback(null);
          setMessageError(null);
        }}
      />
    </>
  );
}

function ProfileMessageDialog({
  isOpen,
  displayName,
  message,
  isSending,
  feedback,
  error,
  chatHref,
  labels,
  locale,
  onMessageChange,
  onSubmit,
  onClose,
}: {
  isOpen: boolean;
  displayName: string;
  message: string;
  isSending: boolean;
  feedback: string | null;
  error: string | null;
  chatHref: string;
  labels: ProfileFollowPanelProps['labels'];
  locale: AppLocale;
  onMessageChange: (message: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-zinc-950/55 px-4 py-16 backdrop-blur-sm sm:items-center sm:py-8"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-message-title"
        className="w-full max-w-lg overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
        onSubmit={onSubmit}
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 p-5 dark:border-zinc-800">
          <div className="space-y-1">
            <h2
              id="profile-message-title"
              className="text-lg font-semibold text-zinc-950 dark:text-zinc-50"
            >
              {labels.sendMessageTitle}
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              {labels.sendMessageDescription.replace('{name}', displayName)}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 w-9 px-0"
            aria-label={labels.sendMessageCancel}
            onClick={onClose}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <div className="space-y-4 p-5">
          <Textarea
            value={message}
            onChange={(event) => onMessageChange(event.target.value)}
            placeholder={labels.sendMessagePlaceholder}
            aria-label={labels.sendMessagePlaceholder}
            maxLength={500}
            autoFocus
          />

          {feedback ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <p className="text-emerald-700 dark:text-emerald-400">
                {feedback}
              </p>
              <Link
                href={chatHref}
                locale={locale}
                className="font-medium text-zinc-950 underline-offset-4 hover:underline dark:text-zinc-50"
              >
                {labels.sendMessageOpenChat}
              </Link>
            </div>
          ) : null}
          {error ? (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              {labels.sendMessageCancel}
            </Button>
            <Button
              type="submit"
              className="gap-2"
              disabled={isSending || message.trim().length === 0}
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              {isSending ? labels.sendMessageSending : labels.sendMessageSubmit}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

function ProfileStatLink({
  href,
  locale,
  label,
  value,
}: {
  href: string;
  locale: AppLocale;
  label: string;
  value: number;
}) {
  return (
    <Link
      href={href}
      locale={locale}
      className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-sm text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-700 dark:hover:bg-zinc-800"
    >
      <span className="font-semibold">{value}</span>
      <span>{label}</span>
    </Link>
  );
}

function ProfileStatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
      <span className="font-semibold">{value}</span>
      <span>{label}</span>
    </div>
  );
}
