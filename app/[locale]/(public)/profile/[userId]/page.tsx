import { notFound } from 'next/navigation';

import { ProfileFollowPanel } from '@/components/profile-follow-panel';
import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { LocalizedLink } from '@/i18n/server-link';
import { getAuthSession } from '@/src/auth.server';
import {
  getProfileViewByTagUseCase,
  listFriendProfilesUseCase,
  listFollowingProfilesUseCase,
} from '@/src/domain/profile/use-cases';
import {
  isFeatureEnabledForUser,
  isSiteFeatureEnabled,
} from '@/src/foundation/features/access';
import { createTranslator } from '@/src/i18n/messages';
import {
  buildPublicProfileBlogPath,
  parseProfileTagSegment,
} from '@/src/profile/tags';
import {
  notFoundUnlessFeatureEnabled,
  resolveLocale,
} from '@/src/server/page-guards';

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ locale: string; userId: string }>;
}) {
  const { locale: rawLocale, userId: rawTagSegment } = await params;
  const locale = resolveLocale(rawLocale);
  await notFoundUnlessFeatureEnabled('profiles.public');
  const profileTag = parseProfileTagSegment(rawTagSegment);

  if (!profileTag) {
    notFound();
  }

  const t = createTranslator(locale, 'ProfilePage');
  const blogT = createTranslator(locale, 'BlogPage');
  const session = await getAuthSession();
  const viewerUserId = session?.user.id ?? null;
  const followEnabled = await isFeatureEnabledForUser(
    'profiles.follow',
    session?.user ?? null,
  );
  const blogEnabled = await isSiteFeatureEnabled('profiles.blog');
  const result = await getProfileViewByTagUseCase(profileTag, viewerUserId);

  if (!result.ok) {
    notFound();
  }

  const profile = result.data;
  const [followingResult, friendsResult] = await Promise.all([
    listFollowingProfilesUseCase(profile.userId),
    profile.isOwnProfile
      ? listFriendProfilesUseCase(profile.userId)
      : Promise.resolve(null),
  ]);
  const followingCount = followingResult.ok
    ? followingResult.data.profiles.length
    : 0;
  const friendCount = friendsResult?.ok
    ? friendsResult.data.profiles.length
    : undefined;

  return (
    <section>
      <div className="mx-auto max-w-3xl space-y-1 px-1">
        <h1 className="text-3xl font-semibold tracking-tight">
          {t('view.title')}
        </h1>
        <CardDescription>{t('view.description')}</CardDescription>
      </div>

      <ProfileFollowPanel
        locale={locale}
        profileUserId={profile.userId}
        profileTag={profile.tag}
        displayName={profile.displayName}
        imageUrl={profile.imageUrl}
        bannerImageUrl={profile.bannerImageUrl}
        initialFollowerCount={profile.followerCount}
        initialFollowingCount={followingCount}
        initialFriendCount={friendCount}
        initialIsFollowing={profile.isFollowing}
        initialIsFriend={profile.isFriend}
        initialIsBlockedByViewer={profile.isBlockedByViewer}
        isOwnProfile={profile.isOwnProfile}
        canManageFollowState={Boolean(viewerUserId) && followEnabled}
        canManageBlockState={Boolean(viewerUserId)}
        canViewFollowersPage={followEnabled}
        canAddFriends={
          profile.isOwnProfile && Boolean(viewerUserId) && followEnabled
        }
        canSendMessage={Boolean(viewerUserId) && followEnabled}
        labels={{
          followers: t('view.followers'),
          followingCount: t('view.followingCount'),
          friends: t('view.friends'),
          addFriend: t('view.addFriend'),
          follow: t('view.follow'),
          unfollow: t('view.unfollow'),
          following: t('view.following'),
          unfollowing: t('view.unfollowing'),
          block: t('view.block'),
          unblock: t('view.unblock'),
          blocking: t('view.blocking'),
          unblocking: t('view.unblocking'),
          blockedDescription: t('view.blockedDescription'),
          error: t('view.error'),
          sendMessage: t('view.sendMessage'),
          sendMessageTitle: t('view.sendMessageTitle'),
          sendMessageDescription: t('view.sendMessageDescription'),
          sendMessagePlaceholder: t('view.sendMessagePlaceholder'),
          sendMessageCancel: t('view.sendMessageCancel'),
          sendMessageSubmit: t('view.sendMessageSubmit'),
          sendMessageSending: t('view.sendMessageSending'),
          sendMessageSent: t('view.sendMessageSent'),
          sendMessageOpenChat: t('view.sendMessageOpenChat'),
          sendMessageError: t('view.sendMessageError'),
        }}
      />

      {blogEnabled ? (
        <Card className="mx-auto max-w-3xl">
          <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1.5">
              <CardTitle>{blogT('profileCard.title')}</CardTitle>
              <CardDescription>
                {blogT('profileCard.description', {
                  name: profile.displayName,
                })}
              </CardDescription>
            </div>

            <LocalizedLink
              href={buildPublicProfileBlogPath(profile.tag)}
              locale={locale}
              className={buttonVariants({ variant: 'default' })}
            >
              {blogT('profileCard.open')}
            </LocalizedLink>
          </CardHeader>

          <CardContent>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {blogT('profileCard.caption')}
            </p>
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}
