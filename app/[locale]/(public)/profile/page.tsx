import { ProfileFollowPanel } from '@/components/profile-follow-panel';
import {
  getProfileViewUseCase,
  listFriendProfilesUseCase,
  listFollowingProfilesUseCase,
} from '@/src/domain/profile/use-cases';
import { isFeatureEnabledForUser } from '@/src/foundation/features/access';
import { createTranslator } from '@/src/i18n/messages';
import { requireAuth, resolveLocale } from '@/src/server/page-guards';

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  const session = await requireAuth(locale);
  const t = createTranslator(locale, 'ProfilePage');
  const [profileViewResult, followingResult, friendsResult, followEnabled] =
    await Promise.all([
      getProfileViewUseCase(session.user.id, session.user.id),
      listFollowingProfilesUseCase(session.user.id),
      listFriendProfilesUseCase(session.user.id),
      isFeatureEnabledForUser('profiles.follow', session.user),
    ]);
  const displayName =
    session.user.name ?? session.user.email?.split('@')[0] ?? 'User';
  const profile = profileViewResult.ok ? profileViewResult.data : null;
  const followerCount = profileViewResult.ok
    ? profileViewResult.data.followerCount
    : 0;
  const followingCount = followingResult.ok
    ? followingResult.data.profiles.length
    : 0;
  const friendCount = friendsResult.ok ? friendsResult.data.profiles.length : 0;
  const profileTag = profile?.tag ?? session.user.tag ?? '';

  return (
    <section>
      <ProfileFollowPanel
        locale={locale}
        profileUserId={session.user.id}
        profileTag={profileTag}
        displayName={profile?.displayName ?? displayName}
        imageUrl={profile?.imageUrl ?? null}
        bannerImageUrl={profile?.bannerImageUrl ?? null}
        initialFollowerCount={followerCount}
        initialFollowingCount={followingCount}
        initialFriendCount={friendCount}
        initialIsFollowing={false}
        initialIsFriend={false}
        initialIsBlockedByViewer={false}
        isOwnProfile={true}
        canManageFollowState={false}
        canManageBlockState={false}
        canViewFollowersPage={true}
        canAddFriends={followEnabled}
        canSendMessage={false}
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
    </section>
  );
}
