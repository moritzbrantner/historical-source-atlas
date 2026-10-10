import {
  failure,
  success,
  type ServiceResult,
} from '@/src/domain/shared/result';
import { buildProfileImageUrl } from '@/src/profile/object-storage';
import { canViewerSeeFollower } from '@/src/profile/follower-visibility';
import {
  type ProfileError,
  type ProfileFollowersPayload,
  type ProfileFollowingPayload,
  type ProfileUseCaseDeps,
  type ProfileUserRecord,
  type ProfileViewPayload,
  resolveProfileDisplayName,
  toProfileDirectoryEntry,
  toProfileFollowerEntry,
} from './shared';
import { getProfileUseCaseDeps } from './default-deps';

async function buildProfileView(
  user: ProfileUserRecord,
  viewerUserId: string | null | undefined,
  deps: ProfileUseCaseDeps,
): Promise<ServiceResult<ProfileViewPayload, ProfileError>> {
  const isOwnProfile = Boolean(viewerUserId && viewerUserId === user.id);
  const blockState =
    viewerUserId && !isOwnProfile
      ? await deps.getBlockRelationshipState(viewerUserId, user.id)
      : {
          isBlockedByViewer: false,
          hasBlockedViewer: false,
        };

  if (blockState.hasBlockedViewer) {
    return failure({
      code: 'FORBIDDEN',
      message: 'You cannot view this profile.',
    });
  }

  const [followerCount, isFollowing, isFollowedByProfile] = await Promise.all([
    deps.countFollowers(user.id),
    viewerUserId && !isOwnProfile && !blockState.isBlockedByViewer
      ? deps.hasFollowRelationship(viewerUserId, user.id)
      : Promise.resolve(false),
    viewerUserId && !isOwnProfile && !blockState.isBlockedByViewer
      ? deps.hasFollowRelationship(user.id, viewerUserId)
      : Promise.resolve(false),
  ]);

  return success({
    userId: user.id,
    tag: user.tag,
    displayName: resolveProfileDisplayName(user),
    imageUrl: buildProfileImageUrl(user.image) ?? null,
    bannerImageUrl: buildProfileImageUrl(user.bannerImage) ?? null,
    followerCount,
    isOwnProfile,
    isFollowing,
    isFriend: isFollowing && isFollowedByProfile,
    isBlockedByViewer: blockState.isBlockedByViewer,
  });
}

export async function getProfileViewUseCase(
  profileUserId: string,
  viewerUserId?: string | null,
  deps: ProfileUseCaseDeps = getProfileUseCaseDeps(),
): Promise<ServiceResult<ProfileViewPayload, ProfileError>> {
  const user = await deps.findUserById(profileUserId);

  if (!user) {
    return failure({
      code: 'NOT_FOUND',
      message: 'User account was not found.',
    });
  }

  return buildProfileView(user, viewerUserId, deps);
}

export async function getProfileViewByTagUseCase(
  profileTag: string,
  viewerUserId?: string | null,
  deps: ProfileUseCaseDeps = getProfileUseCaseDeps(),
): Promise<ServiceResult<ProfileViewPayload, ProfileError>> {
  const user = await deps.findUserByTag(profileTag);

  if (!user) {
    return failure({
      code: 'NOT_FOUND',
      message: 'User account was not found.',
    });
  }

  return buildProfileView(user, viewerUserId, deps);
}

export async function listProfileFollowersByTagUseCase(
  profileTag: string,
  viewerUserId?: string | null,
  deps: ProfileUseCaseDeps = getProfileUseCaseDeps(),
): Promise<ServiceResult<ProfileFollowersPayload, ProfileError>> {
  const user = await deps.findUserByTag(profileTag);

  if (!user) {
    return failure({
      code: 'NOT_FOUND',
      message: 'User account was not found.',
    });
  }

  if (viewerUserId && viewerUserId !== user.id) {
    const blockState = await deps.getBlockRelationshipState(
      viewerUserId,
      user.id,
    );

    if (blockState.hasBlockedViewer) {
      return failure({
        code: 'FORBIDDEN',
        message: 'You cannot view this profile.',
      });
    }
  }

  const followers = await deps.listFollowersForUser(user.id);
  const visibleFollowers = followers.filter((follower) =>
    canViewerSeeFollower({
      viewerUserId,
      profileOwnerId: user.id,
      followerUserId: follower.id,
      followerVisibility: follower.followerVisibility,
    }),
  );

  return success({
    profile: {
      userId: user.id,
      tag: user.tag,
      displayName: resolveProfileDisplayName(user),
    },
    followers: visibleFollowers.map(toProfileFollowerEntry),
    totalFollowerCount: followers.length,
    hiddenFollowerCount: Math.max(
      0,
      followers.length - visibleFollowers.length,
    ),
    isOwnProfile: Boolean(viewerUserId && viewerUserId === user.id),
  });
}

export async function listProfileFollowingByTagUseCase(
  profileTag: string,
  viewerUserId?: string | null,
  deps: ProfileUseCaseDeps = getProfileUseCaseDeps(),
): Promise<ServiceResult<ProfileFollowingPayload, ProfileError>> {
  const user = await deps.findUserByTag(profileTag);

  if (!user) {
    return failure({
      code: 'NOT_FOUND',
      message: 'User account was not found.',
    });
  }

  if (viewerUserId && viewerUserId !== user.id) {
    const blockState = await deps.getBlockRelationshipState(
      viewerUserId,
      user.id,
    );

    if (blockState.hasBlockedViewer) {
      return failure({
        code: 'FORBIDDEN',
        message: 'You cannot view this profile.',
      });
    }
  }

  const following = await deps.listFollowingUsers(user.id);

  return success({
    profile: {
      userId: user.id,
      tag: user.tag,
      displayName: resolveProfileDisplayName(user),
    },
    following: following.map(toProfileDirectoryEntry),
    totalFollowingCount: following.length,
    isOwnProfile: Boolean(viewerUserId && viewerUserId === user.id),
  });
}

export type {
  ProfileFollowerEntry,
  ProfileFollowersPayload,
  ProfileFollowingPayload,
  ProfileViewPayload,
} from './shared';
