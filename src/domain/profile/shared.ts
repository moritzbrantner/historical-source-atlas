import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  isNull,
  ne,
  or,
  sql,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import { getDb } from '@/src/db/client';
import { notifications, userBlocks, userFollows, users } from '@/src/db/schema';
import {
  failure,
  success,
  type ServiceResult,
} from '@/src/domain/shared/result';
import {
  isChatMessageKind,
  normalizeChatMessageInput,
  parseChatMessageMetadata,
  toggleTodoMetadata,
  voteInPollMetadata,
  type ChatMessageInput,
  type ChatMessageKind,
  type ChatMessageMetadata,
} from '@/src/domain/chat/messages';
import {
  ChatMediaValidationError,
  validateChatMediaUpload,
} from '@/src/domain/chat/media';
import {
  ImageValidationError,
  validateBannerImageUpload,
  validateImageUpload,
} from '@/src/profile/image-validation';
import {
  buildProfileImageUrl,
  deleteProfileImage,
  uploadChatMedia,
  uploadProfileBannerImage,
  uploadProfileImage,
} from '@/src/profile/object-storage';
import {
  canViewerSeeFollower,
  type FollowerVisibilityRole,
} from '@/src/profile/follower-visibility';
import {
  buildProfileChatPath,
  buildPublicProfilePath,
  normalizeProfileTagInput,
  validateProfileTag,
} from '@/src/profile/tags';

const DISPLAY_NAME_MIN_LENGTH = 2;
const DISPLAY_NAME_MAX_LENGTH = 60;
const SEARCH_QUERY_MAX_LENGTH = 80;

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

type ProfileUserRecord = {
  id: string;
  email: string | null;
  tag: string;
  name: string | null;
  image: string | null;
  bannerImage: string | null;
  isSearchable: boolean;
  followerVisibility: FollowerVisibilityRole;
};

type ProfileSearchUserRecord = ProfileUserRecord & {
  followerCount: number | null;
  isFollowing: boolean | null;
  followsViewer: boolean | null;
};

type BlockRelationshipState = {
  isBlockedByViewer: boolean;
  hasBlockedViewer: boolean;
};

type ProfileMessageRecord = {
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

function getProfileUseCaseDeps(): ProfileUseCaseDeps {
  const viewerBlocks = alias(userBlocks, 'viewerBlocks');
  const targetBlocks = alias(userBlocks, 'targetBlocks');
  const reciprocalFollows = alias(userFollows, 'reciprocalFollows');
  const viewerFollows = alias(userFollows, 'viewerFollows');
  const targetFollows = alias(userFollows, 'targetFollows');
  const followerCounts = alias(userFollows, 'followerCounts');

  return {
    findUserById: (userId) =>
      getDb().query.users.findFirst({
        where: (table, { eq: innerEq }) => innerEq(table.id, userId),
      }),
    findUserByTag: (tag) =>
      getDb().query.users.findFirst({
        where: (table, { eq: innerEq }) => innerEq(table.tag, tag),
      }),
    findUserByTagExcludingId: (tag, userId) =>
      getDb().query.users.findFirst({
        where: (table, { and: innerAnd, eq: innerEq, ne: innerNe }) =>
          innerAnd(innerEq(table.tag, tag), innerNe(table.id, userId)),
      }),
    countFollowers: async (userId) => {
      const [result] = await getDb()
        .select({ value: count() })
        .from(userFollows)
        .where(eq(userFollows.followingId, userId));

      return result?.value ?? 0;
    },
    hasFollowRelationship: async (followerId, followingId) => {
      const relationship = await getDb().query.userFollows.findFirst({
        where: (table, { and: innerAnd, eq: innerEq }) =>
          innerAnd(
            innerEq(table.followerId, followerId),
            innerEq(table.followingId, followingId),
          ),
      });

      return Boolean(relationship);
    },
    createFollowRelationship: async (followerId, followingId) => {
      await getDb()
        .insert(userFollows)
        .values({
          followerId,
          followingId,
        })
        .onConflictDoNothing();
    },
    deleteFollowRelationship: async (followerId, followingId) => {
      await getDb()
        .delete(userFollows)
        .where(
          and(
            eq(userFollows.followerId, followerId),
            eq(userFollows.followingId, followingId),
          ),
        );
    },
    deleteFollowRelationshipsBetweenUsers: async (
      firstUserId,
      secondUserId,
    ) => {
      await getDb()
        .delete(userFollows)
        .where(
          or(
            and(
              eq(userFollows.followerId, firstUserId),
              eq(userFollows.followingId, secondUserId),
            ),
            and(
              eq(userFollows.followerId, secondUserId),
              eq(userFollows.followingId, firstUserId),
            ),
          ),
        );
    },
    getBlockRelationshipState: async (viewerUserId, otherUserId) => {
      const [isBlockedByViewer, hasBlockedViewer] = await Promise.all([
        getDb().query.userBlocks.findFirst({
          where: (table, { and: innerAnd, eq: innerEq }) =>
            innerAnd(
              innerEq(table.blockerId, viewerUserId),
              innerEq(table.blockedId, otherUserId),
            ),
        }),
        getDb().query.userBlocks.findFirst({
          where: (table, { and: innerAnd, eq: innerEq }) =>
            innerAnd(
              innerEq(table.blockerId, otherUserId),
              innerEq(table.blockedId, viewerUserId),
            ),
        }),
      ]);

      return {
        isBlockedByViewer: Boolean(isBlockedByViewer),
        hasBlockedViewer: Boolean(hasBlockedViewer),
      };
    },
    createBlockRelationship: async (blockerId, blockedId) => {
      await getDb()
        .insert(userBlocks)
        .values({
          blockerId,
          blockedId,
        })
        .onConflictDoNothing();
    },
    deleteBlockRelationship: async (blockerId, blockedId) => {
      await getDb()
        .delete(userBlocks)
        .where(
          and(
            eq(userBlocks.blockerId, blockerId),
            eq(userBlocks.blockedId, blockedId),
          ),
        );
    },
    listFollowingUsers: async (followerId) => {
      const rows = await getDb()
        .select({
          id: users.id,
          email: users.email,
          tag: users.tag,
          name: users.name,
          image: users.image,
          bannerImage: users.bannerImage,
          isSearchable: users.isSearchable,
          followerVisibility: users.followerVisibility,
        })
        .from(userFollows)
        .innerJoin(users, eq(userFollows.followingId, users.id))
        .where(eq(userFollows.followerId, followerId))
        .orderBy(asc(users.name), asc(users.tag), asc(users.email));

      return rows;
    },
    listFriendUsers: async (userId) => {
      const rows = await getDb()
        .select({
          id: users.id,
          email: users.email,
          tag: users.tag,
          name: users.name,
          image: users.image,
          bannerImage: users.bannerImage,
          isSearchable: users.isSearchable,
          followerVisibility: users.followerVisibility,
        })
        .from(userFollows)
        .innerJoin(
          reciprocalFollows,
          and(
            eq(reciprocalFollows.followerId, userFollows.followingId),
            eq(reciprocalFollows.followingId, userId),
          ),
        )
        .innerJoin(users, eq(userFollows.followingId, users.id))
        .where(eq(userFollows.followerId, userId))
        .orderBy(asc(users.name), asc(users.tag), asc(users.email));

      return rows;
    },
    listBlockedUsers: async (blockerId) => {
      const rows = await getDb()
        .select({
          id: users.id,
          email: users.email,
          tag: users.tag,
          name: users.name,
          image: users.image,
          bannerImage: users.bannerImage,
          isSearchable: users.isSearchable,
          followerVisibility: users.followerVisibility,
        })
        .from(userBlocks)
        .innerJoin(users, eq(userBlocks.blockedId, users.id))
        .where(eq(userBlocks.blockerId, blockerId))
        .orderBy(asc(users.name), asc(users.tag), asc(users.email));

      return rows;
    },
    listFollowersForUser: async (followingId) => {
      const rows = await getDb()
        .select({
          id: users.id,
          email: users.email,
          tag: users.tag,
          name: users.name,
          image: users.image,
          bannerImage: users.bannerImage,
          isSearchable: users.isSearchable,
          followerVisibility: users.followerVisibility,
        })
        .from(userFollows)
        .innerJoin(users, eq(userFollows.followerId, users.id))
        .where(eq(userFollows.followingId, followingId))
        .orderBy(asc(users.name), asc(users.tag), asc(users.email));

      return rows;
    },
    listProfileMessagesBetweenUsers: (firstUserId, secondUserId) =>
      getDb()
        .select({
          id: notifications.id,
          actorId: notifications.actorId,
          body: notifications.body,
          kind: notifications.kind,
          metadata: notifications.metadata,
          pinnedAt: notifications.pinnedAt,
          createdAt: notifications.createdAt,
        })
        .from(notifications)
        .where(
          and(
            eq(notifications.audience, 'user'),
            or(
              and(
                eq(notifications.userId, firstUserId),
                eq(notifications.actorId, secondUserId),
              ),
              and(
                eq(notifications.userId, secondUserId),
                eq(notifications.actorId, firstUserId),
              ),
            ),
          ),
        )
        .orderBy(asc(notifications.createdAt))
        .limit(100),
    findProfileMessageById: (messageId) =>
      getDb().query.notifications.findFirst({
        where: (table, { eq: innerEq }) => innerEq(table.id, messageId),
      }),
    searchUsersToFollow: async (viewerUserId, query) => {
      const relationshipPriority = sql<number>`case
        when ${viewerFollows.followingId} is not null and ${targetFollows.followerId} is not null then 0
        when ${targetFollows.followerId} is not null then 1
        when count(${followerCounts.followerId}) > 0 then 2
        else 3
      end`;
      const followerCount = sql<number>`count(${followerCounts.followerId})::int`;
      const searchFilter = query
        ? or(
            ilike(users.name, `%${query}%`),
            ilike(users.email, `%${query}%`),
            ilike(users.tag, `%${query}%`),
          )
        : undefined;
      const filters = [
        eq(users.isSearchable, true),
        ne(users.id, viewerUserId),
        isNull(viewerBlocks.blockerId),
        isNull(targetBlocks.blockerId),
      ];
      if (searchFilter) {
        filters.push(searchFilter);
      }

      const rows = await getDb()
        .select({
          id: users.id,
          email: users.email,
          tag: users.tag,
          name: users.name,
          image: users.image,
          bannerImage: users.bannerImage,
          isSearchable: users.isSearchable,
          followerVisibility: users.followerVisibility,
          followerCount,
          isFollowing: sql<boolean>`${viewerFollows.followingId} is not null`,
          followsViewer: sql<boolean>`${targetFollows.followerId} is not null`,
        })
        .from(users)
        .leftJoin(
          viewerFollows,
          and(
            eq(viewerFollows.followingId, users.id),
            eq(viewerFollows.followerId, viewerUserId),
          ),
        )
        .leftJoin(
          targetFollows,
          and(
            eq(targetFollows.followerId, users.id),
            eq(targetFollows.followingId, viewerUserId),
          ),
        )
        .leftJoin(followerCounts, eq(followerCounts.followingId, users.id))
        .leftJoin(
          viewerBlocks,
          and(
            eq(viewerBlocks.blockerId, viewerUserId),
            eq(viewerBlocks.blockedId, users.id),
          ),
        )
        .leftJoin(
          targetBlocks,
          and(
            eq(targetBlocks.blockerId, users.id),
            eq(targetBlocks.blockedId, viewerUserId),
          ),
        )
        .where(and(...filters))
        .groupBy(
          users.id,
          users.email,
          users.tag,
          users.name,
          users.image,
          users.bannerImage,
          users.isSearchable,
          users.followerVisibility,
          viewerFollows.followingId,
          targetFollows.followerId,
        )
        .orderBy(
          relationshipPriority,
          desc(followerCount),
          asc(users.name),
          asc(users.tag),
          asc(users.email),
        )
        .limit(12);

      return rows;
    },
    updateUserSearchVisibility: async (userId, isSearchable) => {
      await getDb()
        .update(users)
        .set({ isSearchable, updatedAt: new Date() })
        .where(eq(users.id, userId));
    },
    updateUserFollowerVisibility: async (userId, followerVisibility) => {
      await getDb()
        .update(users)
        .set({ followerVisibility, updatedAt: new Date() })
        .where(eq(users.id, userId));
    },
    updateUserTag: async (userId, tag) => {
      await getDb()
        .update(users)
        .set({ tag, updatedAt: new Date() })
        .where(eq(users.id, userId));
    },
    createProfileMessageNotification: async (input) => {
      const notificationId = crypto.randomUUID();

      const [notification] = await getDb()
        .insert(notifications)
        .values({
          id: notificationId,
          userId: input.targetUserId,
          actorId: input.senderUserId,
          title: input.title,
          body: input.body,
          kind: input.kind,
          metadata: input.metadata,
          href: input.href,
          audience: 'user',
          audienceValue: input.targetUserId,
          createdAt: input.createdAt,
        })
        .returning();

      if (!notification) {
        throw new Error('Expected profile message notification to be created.');
      }

      return notification;
    },
    updateProfileMessage: async (messageId, input) => {
      const [message] = await getDb()
        .update(notifications)
        .set(input)
        .where(eq(notifications.id, messageId))
        .returning();

      return message;
    },
  };
}

function resolveProfileDisplayName(
  user: Pick<ProfileUserRecord, 'name' | 'email'>,
) {
  const trimmedName = user.name?.trim();

  if (trimmedName) {
    return trimmedName;
  }

  const emailPrefix = user.email?.split('@')[0]?.trim();
  return emailPrefix || 'User';
}

function toProfileDirectoryEntry(
  user: ProfileUserRecord,
): ProfileDirectoryEntry {
  return {
    userId: user.id,
    tag: user.tag,
    displayName: resolveProfileDisplayName(user),
    imageUrl: buildProfileImageUrl(user.image) ?? null,
  };
}

function toProfileSearchEntry(
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

function toProfileFollowerEntry(user: ProfileUserRecord): ProfileFollowerEntry {
  return {
    ...toProfileDirectoryEntry(user),
    visibilityRole: user.followerVisibility,
  };
}

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

async function updateFollowRelationship(
  actorUserId: string,
  targetUserId: string,
  shouldFollow: boolean,
  deps: ProfileUseCaseDeps = getProfileUseCaseDeps(),
): Promise<ServiceResult<ProfileFollowMutationPayload, ProfileError>> {
  if (actorUserId === targetUserId) {
    return failure({
      code: 'VALIDATION_ERROR',
      message: 'You cannot follow your own profile.',
    });
  }

  const targetUser = await deps.findUserById(targetUserId);

  if (!targetUser) {
    return failure({
      code: 'NOT_FOUND',
      message: 'User account was not found.',
    });
  }

  if (shouldFollow) {
    const blockState = await deps.getBlockRelationshipState(
      actorUserId,
      targetUserId,
    );

    if (blockState.isBlockedByViewer) {
      return failure({
        code: 'FORBIDDEN',
        message: 'Unblock this user before following them.',
      });
    }

    if (blockState.hasBlockedViewer) {
      return failure({
        code: 'FORBIDDEN',
        message: 'You cannot follow this user.',
      });
    }
  }

  if (shouldFollow) {
    await deps.createFollowRelationship(actorUserId, targetUserId);
    return success({
      following: true,
      isFriend: await deps.hasFollowRelationship(targetUserId, actorUserId),
    });
  }

  await deps.deleteFollowRelationship(actorUserId, targetUserId);
  return success({ following: false, isFriend: false });
}

export function followUserUseCase(
  actorUserId: string,
  targetUserId: string,
  deps?: ProfileUseCaseDeps,
) {
  return updateFollowRelationship(actorUserId, targetUserId, true, deps);
}

export function unfollowUserUseCase(
  actorUserId: string,
  targetUserId: string,
  deps?: ProfileUseCaseDeps,
) {
  return updateFollowRelationship(actorUserId, targetUserId, false, deps);
}

export async function sendProfileMessageUseCase(
  actorUserId: string,
  targetUserId: string,
  input: string | ChatMessageInput,
  deps: ProfileUseCaseDeps = getProfileUseCaseDeps(),
): Promise<ServiceResult<ProfileMessagePayload, ProfileError>> {
  const normalizedMessage = normalizeChatMessageInput(input);

  if (actorUserId === targetUserId) {
    return failure({
      code: 'VALIDATION_ERROR',
      message: 'You cannot message your own profile.',
    });
  }

  if (!normalizedMessage.ok) {
    return failure({
      code: 'VALIDATION_ERROR',
      message: normalizedMessage.error,
    });
  }

  const [senderUser, targetUser] = await Promise.all([
    deps.findUserById(actorUserId),
    deps.findUserById(targetUserId),
  ]);

  if (!senderUser || !targetUser) {
    return failure({
      code: 'NOT_FOUND',
      message: 'User account was not found.',
    });
  }

  const blockState = await deps.getBlockRelationshipState(
    actorUserId,
    targetUserId,
  );

  if (blockState.isBlockedByViewer || blockState.hasBlockedViewer) {
    return failure({
      code: 'FORBIDDEN',
      message: 'You cannot message this user.',
    });
  }

  const [actorFollowsTarget, targetFollowsActor] = await Promise.all([
    deps.hasFollowRelationship(actorUserId, targetUserId),
    deps.hasFollowRelationship(targetUserId, actorUserId),
  ]);

  if (!actorFollowsTarget || !targetFollowsActor) {
    return failure({
      code: 'FORBIDDEN',
      message: 'You can only message friends.',
    });
  }

  const senderName = resolveProfileDisplayName(senderUser);
  const createdMessage = await deps.createProfileMessageNotification({
    senderUserId: actorUserId,
    targetUserId,
    title: `${senderName} sent you a message`,
    body: normalizedMessage.value.body,
    kind: normalizedMessage.value.kind,
    metadata: normalizedMessage.value.metadata,
    href: buildProfileChatPath(actorUserId),
    createdAt: new Date(),
  });

  return success({
    message: toProfileChatMessage(createdMessage),
  });
}

export async function sendProfileMediaMessageUseCase(
  actorUserId: string,
  targetUserId: string,
  input: ProfileMediaMessageInput,
  deps: ProfileUseCaseDeps = getProfileUseCaseDeps(),
): Promise<ServiceResult<ProfileMessagePayload, ProfileError>> {
  if (actorUserId === targetUserId) {
    return failure({
      code: 'VALIDATION_ERROR',
      message: 'You cannot message your own profile.',
    });
  }

  const caption = input.body?.trim() ?? '';

  if (caption.length > 500) {
    return failure({
      code: 'VALIDATION_ERROR',
      message: 'Messages must be 500 characters or fewer.',
    });
  }

  const [senderUser, targetUser] = await Promise.all([
    deps.findUserById(actorUserId),
    deps.findUserById(targetUserId),
  ]);

  if (!senderUser || !targetUser) {
    return failure({
      code: 'NOT_FOUND',
      message: 'User account was not found.',
    });
  }

  const blockState = await deps.getBlockRelationshipState(
    actorUserId,
    targetUserId,
  );

  if (blockState.isBlockedByViewer || blockState.hasBlockedViewer) {
    return failure({
      code: 'FORBIDDEN',
      message: 'You cannot message this user.',
    });
  }

  const [actorFollowsTarget, targetFollowsActor] = await Promise.all([
    deps.hasFollowRelationship(actorUserId, targetUserId),
    deps.hasFollowRelationship(targetUserId, actorUserId),
  ]);

  if (!actorFollowsTarget || !targetFollowsActor) {
    return failure({
      code: 'FORBIDDEN',
      message: 'You can only message friends.',
    });
  }

  try {
    const validated = await validateChatMediaUpload(input.file);
    const uploaded = await uploadChatMedia(actorUserId, validated);
    const body = caption || validated.filename;
    const senderName = resolveProfileDisplayName(senderUser);

    try {
      const createdMessage = await deps.createProfileMessageNotification({
        senderUserId: actorUserId,
        targetUserId,
        title: `${senderName} sent you a ${validated.type}`,
        body,
        kind: 'media',
        metadata: {
          media: {
            key: uploaded.key,
            url: uploaded.url,
            filename: validated.filename,
            mimeType: validated.mimeType,
            size: validated.size,
            type: validated.type,
          },
        },
        href: buildProfileChatPath(actorUserId),
        createdAt: new Date(),
      });

      return success({
        message: toProfileChatMessage(createdMessage),
      });
    } catch (error) {
      await deleteProfileImage(uploaded.key);
      throw error;
    }
  } catch (error) {
    if (error instanceof ChatMediaValidationError) {
      return failure({
        code: 'VALIDATION_ERROR',
        message: error.message,
      });
    }

    throw error;
  }
}

export async function updateProfileChatMessageUseCase(
  actorUserId: string,
  input: {
    messageId: string;
    action: 'pin' | 'unpin' | 'vote-poll' | 'toggle-todo';
    optionId?: string;
    itemId?: string;
    completed?: boolean;
  },
  deps: ProfileUseCaseDeps = getProfileUseCaseDeps(),
): Promise<ServiceResult<{ message: ProfileChatMessage }, ProfileError>> {
  const message = await deps.findProfileMessageById(input.messageId);

  if (!message || !message.actorId) {
    return failure({
      code: 'NOT_FOUND',
      message: 'Message was not found.',
    });
  }

  if (message.userId !== actorUserId && message.actorId !== actorUserId) {
    return failure({
      code: 'FORBIDDEN',
      message: 'You cannot update this message.',
    });
  }

  const kind = resolveChatMessageKind(message.kind);
  const metadata = parseChatMessageMetadata(kind, message.metadata);
  let update: { metadata?: ChatMessageMetadata; pinnedAt?: Date | null };

  if (input.action === 'pin' || input.action === 'unpin') {
    update = {
      pinnedAt: input.action === 'pin' ? new Date() : null,
    };
  } else if (input.action === 'vote-poll') {
    if (kind !== 'poll' || !input.optionId) {
      return failure({
        code: 'VALIDATION_ERROR',
        message: 'Choose a poll option.',
      });
    }

    const updatedMetadata = voteInPollMetadata(
      metadata,
      input.optionId,
      actorUserId,
    );

    if (!updatedMetadata) {
      return failure({
        code: 'VALIDATION_ERROR',
        message: 'Choose a poll option.',
      });
    }

    update = { metadata: updatedMetadata };
  } else {
    if (kind !== 'todo' || !input.itemId || input.completed === undefined) {
      return failure({
        code: 'VALIDATION_ERROR',
        message: 'Choose a todo item.',
      });
    }

    const updatedMetadata = toggleTodoMetadata(
      metadata,
      input.itemId,
      actorUserId,
      input.completed,
    );

    if (!updatedMetadata) {
      return failure({
        code: 'VALIDATION_ERROR',
        message: 'Choose a todo item.',
      });
    }

    update = { metadata: updatedMetadata };
  }

  const updatedMessage = await deps.updateProfileMessage(
    input.messageId,
    update,
  );

  if (!updatedMessage || !updatedMessage.actorId) {
    return failure({
      code: 'NOT_FOUND',
      message: 'Message was not found.',
    });
  }

  return success({ message: toProfileChatMessage(updatedMessage) });
}

export async function getProfileChatUseCase(
  actorUserId: string,
  memberUserId: string,
  deps: ProfileUseCaseDeps = getProfileUseCaseDeps(),
): Promise<ServiceResult<ProfileChatPayload, ProfileError>> {
  if (actorUserId === memberUserId) {
    return failure({
      code: 'VALIDATION_ERROR',
      message: 'You cannot chat with yourself.',
    });
  }

  const [actorUser, memberUser] = await Promise.all([
    deps.findUserById(actorUserId),
    deps.findUserById(memberUserId),
  ]);

  if (!actorUser || !memberUser) {
    return failure({
      code: 'NOT_FOUND',
      message: 'User account was not found.',
    });
  }

  const blockState = await deps.getBlockRelationshipState(
    actorUserId,
    memberUserId,
  );

  if (blockState.isBlockedByViewer || blockState.hasBlockedViewer) {
    return failure({
      code: 'FORBIDDEN',
      message: 'You cannot chat with this user.',
    });
  }

  const [actorFollowsMember, memberFollowsActor] = await Promise.all([
    deps.hasFollowRelationship(actorUserId, memberUserId),
    deps.hasFollowRelationship(memberUserId, actorUserId),
  ]);

  if (!actorFollowsMember || !memberFollowsActor) {
    return failure({
      code: 'FORBIDDEN',
      message: 'You can only chat with friends.',
    });
  }

  const messages = await deps.listProfileMessagesBetweenUsers(
    actorUserId,
    memberUserId,
  );

  return success({
    member: toProfileDirectoryEntry(memberUser),
    messages: messages
      .filter((message) => message.actorId)
      .map(toProfileChatMessage),
  });
}

function toProfileChatMessage(message: {
  id: string;
  actorId: string | null;
  body: string;
  kind: string;
  metadata: unknown;
  pinnedAt: Date | null;
  createdAt: Date;
}): ProfileChatMessage {
  const kind = resolveChatMessageKind(message.kind);

  return {
    id: message.id,
    senderUserId: message.actorId!,
    body: message.body,
    kind,
    metadata: parseChatMessageMetadata(kind, message.metadata),
    pinnedAt: message.pinnedAt?.toISOString() ?? null,
    createdAt: message.createdAt.toISOString(),
  };
}

function resolveChatMessageKind(kind: string): ChatMessageKind {
  return isChatMessageKind(kind) ? kind : 'text';
}

async function updateBlockRelationship(
  actorUserId: string,
  targetUserId: string,
  shouldBlock: boolean,
  deps: ProfileUseCaseDeps = getProfileUseCaseDeps(),
): Promise<ServiceResult<ProfileBlockMutationPayload, ProfileError>> {
  if (actorUserId === targetUserId) {
    return failure({
      code: 'VALIDATION_ERROR',
      message: `You cannot ${shouldBlock ? 'block' : 'unblock'} your own profile.`,
    });
  }

  const targetUser = await deps.findUserById(targetUserId);

  if (!targetUser) {
    return failure({
      code: 'NOT_FOUND',
      message: 'User account was not found.',
    });
  }

  if (shouldBlock) {
    await deps.createBlockRelationship(actorUserId, targetUserId);
    await deps.deleteFollowRelationshipsBetweenUsers(actorUserId, targetUserId);
    return success({ blocked: true });
  }

  await deps.deleteBlockRelationship(actorUserId, targetUserId);
  return success({ blocked: false });
}

export function blockUserUseCase(
  actorUserId: string,
  targetUserId: string,
  deps?: ProfileUseCaseDeps,
) {
  return updateBlockRelationship(actorUserId, targetUserId, true, deps);
}

export function unblockUserUseCase(
  actorUserId: string,
  targetUserId: string,
  deps?: ProfileUseCaseDeps,
) {
  return updateBlockRelationship(actorUserId, targetUserId, false, deps);
}

export async function listFollowingProfilesUseCase(
  userId: string,
  deps: ProfileUseCaseDeps = getProfileUseCaseDeps(),
): Promise<ServiceResult<{ profiles: ProfileDirectoryEntry[] }, ProfileError>> {
  const user = await deps.findUserById(userId);

  if (!user) {
    return failure({
      code: 'NOT_FOUND',
      message: 'User account was not found.',
    });
  }

  const profiles = await deps.listFollowingUsers(userId);

  return success({
    profiles: profiles.map(toProfileDirectoryEntry),
  });
}

export async function listFriendProfilesUseCase(
  userId: string,
  deps: ProfileUseCaseDeps = getProfileUseCaseDeps(),
): Promise<ServiceResult<{ profiles: ProfileDirectoryEntry[] }, ProfileError>> {
  const user = await deps.findUserById(userId);

  if (!user) {
    return failure({
      code: 'NOT_FOUND',
      message: 'User account was not found.',
    });
  }

  const profiles = await deps.listFriendUsers(userId);

  return success({
    profiles: profiles.map(toProfileDirectoryEntry),
  });
}

export async function listBlockedProfilesUseCase(
  userId: string,
  deps: ProfileUseCaseDeps = getProfileUseCaseDeps(),
): Promise<ServiceResult<{ profiles: ProfileDirectoryEntry[] }, ProfileError>> {
  const user = await deps.findUserById(userId);

  if (!user) {
    return failure({
      code: 'NOT_FOUND',
      message: 'User account was not found.',
    });
  }

  const profiles = await deps.listBlockedUsers(userId);

  return success({
    profiles: profiles.map(toProfileDirectoryEntry),
  });
}

export async function searchUsersToFollowUseCase(
  userId: string,
  rawQuery: string,
  deps: ProfileUseCaseDeps = getProfileUseCaseDeps(),
): Promise<ServiceResult<{ profiles: ProfileSearchEntry[] }, ProfileError>> {
  const user = await deps.findUserById(userId);

  if (!user) {
    return failure({
      code: 'NOT_FOUND',
      message: 'User account was not found.',
    });
  }

  const query = rawQuery.trim();

  if (query.length > SEARCH_QUERY_MAX_LENGTH) {
    return failure({
      code: 'VALIDATION_ERROR',
      message: `Search must be ${SEARCH_QUERY_MAX_LENGTH} characters or fewer.`,
    });
  }

  const profiles = await deps.searchUsersToFollow(userId, query);

  return success({
    profiles: profiles.map(toProfileSearchEntry),
  });
}

export async function getProfileSearchVisibilityUseCase(
  userId: string,
  deps: ProfileUseCaseDeps = getProfileUseCaseDeps(),
): Promise<ServiceResult<ProfileSearchVisibilityPayload, ProfileError>> {
  const user = await deps.findUserById(userId);

  if (!user) {
    return failure({
      code: 'NOT_FOUND',
      message: 'User account was not found.',
    });
  }

  return success({
    isSearchable: user.isSearchable,
  });
}

export async function getProfileFollowerVisibilityUseCase(
  userId: string,
  deps: ProfileUseCaseDeps = getProfileUseCaseDeps(),
): Promise<ServiceResult<ProfileFollowerVisibilityPayload, ProfileError>> {
  const user = await deps.findUserById(userId);

  if (!user) {
    return failure({
      code: 'NOT_FOUND',
      message: 'User account was not found.',
    });
  }

  return success({
    followerVisibility: user.followerVisibility,
  });
}

export async function updateProfileSearchVisibilityUseCase(
  userId: string,
  isSearchable: boolean,
  deps: ProfileUseCaseDeps = getProfileUseCaseDeps(),
): Promise<ServiceResult<ProfileSearchVisibilityPayload, ProfileError>> {
  const user = await deps.findUserById(userId);

  if (!user) {
    return failure({
      code: 'NOT_FOUND',
      message: 'User account was not found.',
    });
  }

  await deps.updateUserSearchVisibility(userId, isSearchable);

  return success({
    isSearchable,
  });
}

export async function updateProfileFollowerVisibilityUseCase(
  userId: string,
  followerVisibility: FollowerVisibilityRole,
  deps: ProfileUseCaseDeps = getProfileUseCaseDeps(),
): Promise<ServiceResult<ProfileFollowerVisibilityPayload, ProfileError>> {
  const user = await deps.findUserById(userId);

  if (!user) {
    return failure({
      code: 'NOT_FOUND',
      message: 'User account was not found.',
    });
  }

  await deps.updateUserFollowerVisibility(userId, followerVisibility);

  return success({
    followerVisibility,
  });
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

export async function updateDisplayNameUseCase(
  userId: string,
  rawDisplayName: string,
): Promise<ServiceResult<UpdateDisplayNamePayload, ProfileError>> {
  const displayName = rawDisplayName.trim();

  if (displayName.length < DISPLAY_NAME_MIN_LENGTH) {
    return failure({
      code: 'VALIDATION_ERROR',
      message: `Display name must be at least ${DISPLAY_NAME_MIN_LENGTH} characters.`,
    });
  }

  if (displayName.length > DISPLAY_NAME_MAX_LENGTH) {
    return failure({
      code: 'VALIDATION_ERROR',
      message: `Display name must be ${DISPLAY_NAME_MAX_LENGTH} characters or fewer.`,
    });
  }

  const existingUser = await getDb().query.users.findFirst({
    where: (table, { eq: innerEq }) => innerEq(table.id, userId),
  });

  if (!existingUser) {
    return failure({
      code: 'NOT_FOUND',
      message: 'User account was not found.',
    });
  }

  await getDb()
    .update(users)
    .set({ name: displayName, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return success({
    displayName,
  });
}

export async function updateProfileTagUseCase(
  userId: string,
  rawTag: string,
  deps: ProfileUseCaseDeps = getProfileUseCaseDeps(),
): Promise<ServiceResult<UpdateProfileTagPayload, ProfileError>> {
  const tag = normalizeProfileTagInput(rawTag);
  const validation = validateProfileTag(tag);

  if (!validation.ok) {
    return failure({
      code: 'VALIDATION_ERROR',
      message: validation.message,
    });
  }

  const existingUser = await deps.findUserById(userId);

  if (!existingUser) {
    return failure({
      code: 'NOT_FOUND',
      message: 'User account was not found.',
    });
  }

  if (existingUser.tag === tag) {
    return success({ tag });
  }

  const duplicateUser = await deps.findUserByTagExcludingId(tag, userId);

  if (duplicateUser) {
    return failure({
      code: 'CONFLICT',
      message: 'That tag is already taken.',
    });
  }

  await deps.updateUserTag(userId, tag);

  return success({ tag });
}

export async function updateProfileImageUseCase(
  userId: string,
  file: File,
): Promise<ServiceResult<UpdateProfileImagePayload, ProfileError>> {
  const existingUser = await getDb().query.users.findFirst({
    where: (table, { eq: innerEq }) => innerEq(table.id, userId),
  });

  if (!existingUser) {
    return failure({
      code: 'NOT_FOUND',
      message: 'User account was not found.',
    });
  }

  try {
    const validated = await validateImageUpload(file);
    const uploaded = await uploadProfileImage(userId, validated);

    try {
      await getDb()
        .update(users)
        .set({ image: uploaded.key, updatedAt: new Date() })
        .where(eq(users.id, userId));
    } catch (error) {
      await deleteProfileImage(uploaded.key);
      throw error;
    }

    await deleteProfileImage(existingUser.image);

    return success({
      imageKey: uploaded.key,
      imageUrl: uploaded.url,
    });
  } catch (error) {
    if (error instanceof ImageValidationError) {
      return failure({
        code: 'VALIDATION_ERROR',
        message: error.message,
      });
    }

    throw error;
  }
}

export async function removeProfileImageUseCase(
  userId: string,
): Promise<ServiceResult<{ removed: true }, ProfileError>> {
  const existingUser = await getDb().query.users.findFirst({
    where: (table, { eq: innerEq }) => innerEq(table.id, userId),
  });

  if (!existingUser) {
    return failure({
      code: 'NOT_FOUND',
      message: 'User account was not found.',
    });
  }

  await getDb()
    .update(users)
    .set({ image: null, updatedAt: new Date() })
    .where(eq(users.id, userId));

  await deleteProfileImage(existingUser.image);

  return success({ removed: true });
}

export async function updateProfileBannerImageUseCase(
  userId: string,
  file: File,
): Promise<ServiceResult<UpdateProfileBannerImagePayload, ProfileError>> {
  const existingUser = await getDb().query.users.findFirst({
    where: (table, { eq: innerEq }) => innerEq(table.id, userId),
  });

  if (!existingUser) {
    return failure({
      code: 'NOT_FOUND',
      message: 'User account was not found.',
    });
  }

  try {
    const validated = await validateBannerImageUpload(file);
    const uploaded = await uploadProfileBannerImage(userId, validated);

    try {
      await getDb()
        .update(users)
        .set({ bannerImage: uploaded.key, updatedAt: new Date() })
        .where(eq(users.id, userId));
    } catch (error) {
      await deleteProfileImage(uploaded.key);
      throw error;
    }

    await deleteProfileImage(existingUser.bannerImage);

    return success({
      imageKey: uploaded.key,
      imageUrl: uploaded.url,
    });
  } catch (error) {
    if (error instanceof ImageValidationError) {
      return failure({
        code: 'VALIDATION_ERROR',
        message: error.message,
      });
    }

    throw error;
  }
}

export async function removeProfileBannerImageUseCase(
  userId: string,
): Promise<ServiceResult<{ removed: true }, ProfileError>> {
  const existingUser = await getDb().query.users.findFirst({
    where: (table, { eq: innerEq }) => innerEq(table.id, userId),
  });

  if (!existingUser) {
    return failure({
      code: 'NOT_FOUND',
      message: 'User account was not found.',
    });
  }

  await getDb()
    .update(users)
    .set({ bannerImage: null, updatedAt: new Date() })
    .where(eq(users.id, userId));

  await deleteProfileImage(existingUser.bannerImage);

  return success({ removed: true });
}
