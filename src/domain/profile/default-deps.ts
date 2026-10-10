// Database-backed default for ProfileUseCaseDeps; internal to the profile modules.
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
import { type ProfileUseCaseDeps } from './shared';

export function getProfileUseCaseDeps(): ProfileUseCaseDeps {
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
