// Profile kernel shared by the per-capability modules: payload contracts, the deps contract and
// record mappers. The public surface is ./use-cases; import from there.
import {
  type ChatMessageKind,
  type ChatMessageMetadata,
} from '@/src/domain/chat/messages';
import { buildProfileImageUrl } from '@/src/profile/object-storage';
import { type FollowerVisibilityRole } from '@/src/profile/follower-visibility';

export const DISPLAY_NAME_MIN_LENGTH = 2;
export const DISPLAY_NAME_MAX_LENGTH = 60;
export const SEARCH_QUERY_MAX_LENGTH = 80;

export type ProfileError = {
  code: 'VALIDATION_ERROR' | 'NOT_FOUND' | 'FORBIDDEN' | 'CONFLICT';
  message: string;
};

export type ProfileViewPayload = {
  userId: string;
  tag: string;
  displayName: string;
  imageUrl: string | null;
  bannerImageUrl: string | null;
  followerCount: number;
  isOwnProfile: boolean;
  isFollowing: boolean;
  isFriend: boolean;
  isBlockedByViewer: boolean;
};

export type UpdateDisplayNamePayload = {
  displayName: string;
};

export type UpdateProfileTagPayload = {
  tag: string;
};

export type UpdateProfileImagePayload = {
  imageKey: string;
  imageUrl: string;
};

export type UpdateProfileBannerImagePayload = {
  imageKey: string;
  imageUrl: string;
};

export type ProfileDirectoryEntry = {
  userId: string;
  tag: string;
  displayName: string;
  imageUrl: string | null;
};

export type ProfileSearchEntry = ProfileDirectoryEntry & {
  followerCount: number;
  isFollowing: boolean;
  followsViewer: boolean;
  isFriend: boolean;
};

export type ProfileFollowerEntry = ProfileDirectoryEntry & {
  visibilityRole: FollowerVisibilityRole;
};

export type ProfileSearchVisibilityPayload = {
  isSearchable: boolean;
};

export type ProfileFollowerVisibilityPayload = {
  followerVisibility: FollowerVisibilityRole;
};

export type ProfileBlockMutationPayload = {
  blocked: boolean;
};

export type ProfileFollowMutationPayload = {
  following: boolean;
  isFriend: boolean;
};

export type ProfileMessagePayload = {
  message: ProfileChatMessage;
};

export type ProfileMediaMessageInput = {
  body?: string;
  file: File;
};

export type ProfileChatMessage = {
  id: string;
  senderUserId: string;
  body: string;
  kind: ChatMessageKind;
  metadata: ChatMessageMetadata;
  pinnedAt: string | null;
  createdAt: string;
};

export type ProfileChatPayload = {
  member: ProfileDirectoryEntry;
  messages: ProfileChatMessage[];
};

export type ProfileFollowersPayload = {
  profile: {
    userId: string;
    tag: string;
    displayName: string;
  };
  followers: ProfileFollowerEntry[];
  totalFollowerCount: number;
  hiddenFollowerCount: number;
  isOwnProfile: boolean;
};

export type ProfileFollowingPayload = {
  profile: {
    userId: string;
    tag: string;
    displayName: string;
  };
  following: ProfileDirectoryEntry[];
  totalFollowingCount: number;
  isOwnProfile: boolean;
};

export type ProfileUserRecord = {
  id: string;
  email: string | null;
  tag: string;
  name: string | null;
  image: string | null;
  bannerImage: string | null;
  isSearchable: boolean;
  followerVisibility: FollowerVisibilityRole;
};

export type ProfileSearchUserRecord = ProfileUserRecord & {
  followerCount: number | null;
  isFollowing: boolean | null;
  followsViewer: boolean | null;
};

export type BlockRelationshipState = {
  isBlockedByViewer: boolean;
  hasBlockedViewer: boolean;
};

export type ProfileMessageRecord = {
  id: string;
  userId: string;
  actorId: string | null;
  body: string;
  kind: string;
  metadata: unknown;
  pinnedAt: Date | null;
  createdAt: Date;
};

export type ProfileUseCaseDeps = {
  findUserById: (userId: string) => Promise<ProfileUserRecord | undefined>;
  findUserByTag: (tag: string) => Promise<ProfileUserRecord | undefined>;
  findUserByTagExcludingId: (
    tag: string,
    userId: string,
  ) => Promise<ProfileUserRecord | undefined>;
  countFollowers: (userId: string) => Promise<number>;
  hasFollowRelationship: (
    followerId: string,
    followingId: string,
  ) => Promise<boolean>;
  createFollowRelationship: (
    followerId: string,
    followingId: string,
  ) => Promise<void>;
  deleteFollowRelationship: (
    followerId: string,
    followingId: string,
  ) => Promise<void>;
  deleteFollowRelationshipsBetweenUsers: (
    firstUserId: string,
    secondUserId: string,
  ) => Promise<void>;
  getBlockRelationshipState: (
    viewerUserId: string,
    otherUserId: string,
  ) => Promise<BlockRelationshipState>;
  createBlockRelationship: (
    blockerId: string,
    blockedId: string,
  ) => Promise<void>;
  deleteBlockRelationship: (
    blockerId: string,
    blockedId: string,
  ) => Promise<void>;
  listFollowingUsers: (followerId: string) => Promise<ProfileUserRecord[]>;
  listFriendUsers: (userId: string) => Promise<ProfileUserRecord[]>;
  listBlockedUsers: (blockerId: string) => Promise<ProfileUserRecord[]>;
  listFollowersForUser: (followingId: string) => Promise<ProfileUserRecord[]>;
  listProfileMessagesBetweenUsers: (
    firstUserId: string,
    secondUserId: string,
  ) => Promise<
    Array<{
      id: string;
      actorId: string | null;
      body: string;
      kind: string;
      metadata: unknown;
      pinnedAt: Date | null;
      createdAt: Date;
    }>
  >;
  findProfileMessageById: (
    messageId: string,
  ) => Promise<ProfileMessageRecord | undefined>;
  searchUsersToFollow: (
    viewerUserId: string,
    query: string,
  ) => Promise<ProfileSearchUserRecord[]>;
  updateUserSearchVisibility: (
    userId: string,
    isSearchable: boolean,
  ) => Promise<void>;
  updateUserFollowerVisibility: (
    userId: string,
    followerVisibility: FollowerVisibilityRole,
  ) => Promise<void>;
  updateUserTag: (userId: string, tag: string) => Promise<void>;
  createProfileMessageNotification: (input: {
    senderUserId: string;
    targetUserId: string;
    title: string;
    body: string;
    kind: ChatMessageKind;
    metadata: ChatMessageMetadata;
    href: string;
    createdAt: Date;
  }) => Promise<ProfileMessageRecord>;
  updateProfileMessage: (
    messageId: string,
    input: {
      metadata?: ChatMessageMetadata;
      pinnedAt?: Date | null;
    },
  ) => Promise<ProfileMessageRecord | undefined>;
};

export function resolveProfileDisplayName(
  user: Pick<ProfileUserRecord, 'name' | 'email'>,
) {
  const trimmedName = user.name?.trim();

  if (trimmedName) {
    return trimmedName;
  }

  const emailPrefix = user.email?.split('@')[0]?.trim();
  return emailPrefix || 'User';
}

export function toProfileDirectoryEntry(
  user: ProfileUserRecord,
): ProfileDirectoryEntry {
  return {
    userId: user.id,
    tag: user.tag,
    displayName: resolveProfileDisplayName(user),
    imageUrl: buildProfileImageUrl(user.image) ?? null,
  };
}

export function toProfileSearchEntry(
  user: ProfileSearchUserRecord,
): ProfileSearchEntry {
  const isFollowing = Boolean(user.isFollowing);
  const followsViewer = Boolean(user.followsViewer);

  return {
    ...toProfileDirectoryEntry(user),
    followerCount: user.followerCount ?? 0,
    isFollowing,
    followsViewer,
    isFriend: isFollowing && followsViewer,
  };
}

export function toProfileFollowerEntry(
  user: ProfileUserRecord,
): ProfileFollowerEntry {
  return {
    ...toProfileDirectoryEntry(user),
    visibilityRole: user.followerVisibility,
  };
}
