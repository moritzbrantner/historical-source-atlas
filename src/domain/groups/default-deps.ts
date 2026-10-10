// Database-backed default for GroupUseCaseDeps; internal to the groups modules.
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
import {
  groupInvitations,
  groupMemberships,
  groupMessages,
  groups,
  users,
} from '@/src/db/schema';
import { isAdmin, isSuperAdmin } from '@/lib/authorization';
import { type GroupUseCaseDeps } from './shared';

export function getGroupUseCaseDeps(): GroupUseCaseDeps {
  return {
    findUserById: (userId) =>
      getDb().query.users.findFirst({
        where: (table, { eq: innerEq }) => innerEq(table.id, userId),
      }),
    createGroupWithOwner: async ({
      id,
      name,
      description,
      visibility,
      ownerId,
    }) => {
      return getDb().transaction(async (tx) => {
        const [createdGroup] = await tx
          .insert(groups)
          .values({
            id,
            name,
            description,
            visibility,
            ownerId,
          })
          .returning();

        if (!createdGroup) {
          throw new Error('Expected group to be created.');
        }

        await tx.insert(groupMemberships).values({
          groupId: createdGroup.id,
          userId: ownerId,
          role: 'OWNER',
        });

        return createdGroup;
      });
    },
    listGroupsForUser: async (userId, actorRole) => {
      const visibilityCondition = isSuperAdmin(actorRole)
        ? sql`true`
        : isAdmin(actorRole)
          ? or(
              eq(groupMemberships.userId, userId),
              eq(groups.visibility, 'PUBLIC'),
            )
          : eq(groupMemberships.userId, userId);
      const membershipRows = await getDb()
        .select({
          id: groups.id,
          name: groups.name,
          description: groups.description,
          visibility: groups.visibility,
          ownerId: groups.ownerId,
          createdAt: groups.createdAt,
          updatedAt: groups.updatedAt,
          role: groupMemberships.role,
        })
        .from(groups)
        .leftJoin(
          groupMemberships,
          and(
            eq(groupMemberships.groupId, groups.id),
            eq(groupMemberships.userId, userId),
          ),
        )
        .where(visibilityCondition)
        .orderBy(asc(groups.name), asc(groups.createdAt));

      return Promise.all(
        membershipRows.map(async (group) => {
          const role = group.role ?? 'VIEWER';
          const [memberCountResult, pendingInvitationCountResult] =
            await Promise.all([
              getDb()
                .select({ value: count() })
                .from(groupMemberships)
                .where(eq(groupMemberships.groupId, group.id)),
              getDb()
                .select({ value: count() })
                .from(groupInvitations)
                .where(
                  and(
                    eq(groupInvitations.groupId, group.id),
                    eq(groupInvitations.status, 'pending'),
                  ),
                ),
            ]);

          return {
            ...group,
            role,
            memberCount: memberCountResult[0]?.value ?? 0,
            pendingInvitationCount:
              role === 'VIEWER'
                ? 0
                : (pendingInvitationCountResult[0]?.value ?? 0),
          };
        }),
      );
    },
    listPendingInvitationsForUser: async (userId) => {
      const inviter = alias(users, 'groupInvitationInviter');
      const rows = await getDb()
        .select({
          id: groupInvitations.id,
          groupId: groupInvitations.groupId,
          invitedUserId: groupInvitations.invitedUserId,
          invitedByUserId: groupInvitations.invitedByUserId,
          status: groupInvitations.status,
          createdAt: groupInvitations.createdAt,
          respondedAt: groupInvitations.respondedAt,
          group: {
            id: groups.id,
            name: groups.name,
            description: groups.description,
            visibility: groups.visibility,
            ownerId: groups.ownerId,
            createdAt: groups.createdAt,
            updatedAt: groups.updatedAt,
          },
          inviter: {
            id: inviter.id,
            email: inviter.email,
            tag: inviter.tag,
            name: inviter.name,
            image: inviter.image,
          },
        })
        .from(groupInvitations)
        .innerJoin(groups, eq(groupInvitations.groupId, groups.id))
        .innerJoin(inviter, eq(groupInvitations.invitedByUserId, inviter.id))
        .where(
          and(
            eq(groupInvitations.invitedUserId, userId),
            eq(groupInvitations.status, 'pending'),
          ),
        )
        .orderBy(asc(groupInvitations.createdAt));

      return rows;
    },
    findGroupById: (groupId) =>
      getDb().query.groups.findFirst({
        where: (table, { eq: innerEq }) => innerEq(table.id, groupId),
      }),
    findMembership: (groupId, userId) =>
      getDb().query.groupMemberships.findFirst({
        where: (table, { and: innerAnd, eq: innerEq }) =>
          innerAnd(
            innerEq(table.groupId, groupId),
            innerEq(table.userId, userId),
          ),
      }),
    listMembers: async (groupId) => {
      const rows = await getDb()
        .select({
          groupId: groupMemberships.groupId,
          userId: groupMemberships.userId,
          role: groupMemberships.role,
          createdAt: groupMemberships.createdAt,
          updatedAt: groupMemberships.updatedAt,
          user: {
            id: users.id,
            email: users.email,
            tag: users.tag,
            name: users.name,
            image: users.image,
          },
        })
        .from(groupMemberships)
        .innerJoin(users, eq(groupMemberships.userId, users.id))
        .where(eq(groupMemberships.groupId, groupId))
        .orderBy(
          sql`case ${groupMemberships.role} when 'OWNER' then 0 when 'ADMIN' then 1 else 2 end`,
          asc(users.name),
          asc(users.tag),
        );

      return rows;
    },
    listPendingInvitations: async (groupId) => {
      const invited = alias(users, 'groupInvitationInvitee');
      const inviter = alias(users, 'groupInvitationDetailInviter');
      const rows = await getDb()
        .select({
          id: groupInvitations.id,
          groupId: groupInvitations.groupId,
          invitedUserId: groupInvitations.invitedUserId,
          invitedByUserId: groupInvitations.invitedByUserId,
          status: groupInvitations.status,
          createdAt: groupInvitations.createdAt,
          respondedAt: groupInvitations.respondedAt,
          invitedUser: {
            id: invited.id,
            email: invited.email,
            tag: invited.tag,
            name: invited.name,
            image: invited.image,
          },
          invitedBy: {
            id: inviter.id,
            email: inviter.email,
            tag: inviter.tag,
            name: inviter.name,
            image: inviter.image,
          },
        })
        .from(groupInvitations)
        .innerJoin(invited, eq(groupInvitations.invitedUserId, invited.id))
        .innerJoin(inviter, eq(groupInvitations.invitedByUserId, inviter.id))
        .where(
          and(
            eq(groupInvitations.groupId, groupId),
            eq(groupInvitations.status, 'pending'),
          ),
        )
        .orderBy(asc(groupInvitations.createdAt));

      return rows;
    },
    listMessages: async (groupId) => {
      const rows = await getDb()
        .select({
          id: groupMessages.id,
          groupId: groupMessages.groupId,
          senderUserId: groupMessages.senderUserId,
          body: groupMessages.body,
          kind: groupMessages.kind,
          metadata: groupMessages.metadata,
          pinnedAt: groupMessages.pinnedAt,
          createdAt: groupMessages.createdAt,
          sender: {
            id: users.id,
            email: users.email,
            tag: users.tag,
            name: users.name,
            image: users.image,
          },
        })
        .from(groupMessages)
        .innerJoin(users, eq(groupMessages.senderUserId, users.id))
        .where(eq(groupMessages.groupId, groupId))
        .orderBy(desc(groupMessages.createdAt))
        .limit(100);

      return rows.reverse();
    },
    findMessageById: (messageId) =>
      getDb().query.groupMessages.findFirst({
        where: (table, { eq: innerEq }) => innerEq(table.id, messageId),
      }),
    findPendingInvitation: (groupId, invitedUserId) =>
      getDb().query.groupInvitations.findFirst({
        where: (table, { and: innerAnd, eq: innerEq }) =>
          innerAnd(
            innerEq(table.groupId, groupId),
            innerEq(table.invitedUserId, invitedUserId),
            innerEq(table.status, 'pending'),
          ),
      }),
    findInvitationById: async (invitationId) => {
      const inviter = alias(users, 'groupInvitationByIdInviter');
      const rows = await getDb()
        .select({
          id: groupInvitations.id,
          groupId: groupInvitations.groupId,
          invitedUserId: groupInvitations.invitedUserId,
          invitedByUserId: groupInvitations.invitedByUserId,
          status: groupInvitations.status,
          createdAt: groupInvitations.createdAt,
          respondedAt: groupInvitations.respondedAt,
          group: {
            id: groups.id,
            name: groups.name,
            description: groups.description,
            visibility: groups.visibility,
            ownerId: groups.ownerId,
            createdAt: groups.createdAt,
            updatedAt: groups.updatedAt,
          },
          inviter: {
            id: inviter.id,
            email: inviter.email,
            tag: inviter.tag,
            name: inviter.name,
            image: inviter.image,
          },
        })
        .from(groupInvitations)
        .innerJoin(groups, eq(groupInvitations.groupId, groups.id))
        .innerJoin(inviter, eq(groupInvitations.invitedByUserId, inviter.id))
        .where(eq(groupInvitations.id, invitationId))
        .limit(1);

      return rows[0];
    },
    createInvitation: async ({
      id,
      groupId,
      invitedUserId,
      invitedByUserId,
    }) => {
      const [createdInvitation] = await getDb()
        .insert(groupInvitations)
        .values({
          id,
          groupId,
          invitedUserId,
          invitedByUserId,
        })
        .returning();

      if (!createdInvitation) {
        throw new Error('Expected group invitation to be created.');
      }

      return createdInvitation;
    },
    createMessage: async ({
      id,
      groupId,
      senderUserId,
      body,
      kind,
      metadata,
      createdAt,
    }) => {
      const [createdMessage] = await getDb()
        .insert(groupMessages)
        .values({
          id,
          groupId,
          senderUserId,
          body,
          kind,
          metadata,
          createdAt,
        })
        .returning();

      if (!createdMessage) {
        throw new Error('Expected group message to be created.');
      }

      return createdMessage;
    },
    updateMessage: async (messageId, input) => {
      const [message] = await getDb()
        .update(groupMessages)
        .set(input)
        .where(eq(groupMessages.id, messageId))
        .returning();

      return message;
    },
    updateInvitationStatus: async (invitationId, status) => {
      await getDb()
        .update(groupInvitations)
        .set({
          status,
          respondedAt: new Date(),
        })
        .where(eq(groupInvitations.id, invitationId));
    },
    addMember: async (groupId, userId, role) => {
      await getDb()
        .insert(groupMemberships)
        .values({
          groupId,
          userId,
          role,
        })
        .onConflictDoNothing();
    },
    updateMemberRole: async (groupId, userId, role) => {
      await getDb()
        .update(groupMemberships)
        .set({
          role,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(groupMemberships.groupId, groupId),
            eq(groupMemberships.userId, userId),
          ),
        );
    },
    removeMember: async (groupId, userId) => {
      await getDb()
        .delete(groupMemberships)
        .where(
          and(
            eq(groupMemberships.groupId, groupId),
            eq(groupMemberships.userId, userId),
          ),
        );
    },
    searchInviteCandidates: async (groupId, actorUserId, query) => {
      const pendingInvitations = alias(
        groupInvitations,
        'pendingGroupInvitations',
      );
      const rows = await getDb()
        .select({
          id: users.id,
          email: users.email,
          tag: users.tag,
          name: users.name,
          image: users.image,
        })
        .from(users)
        .leftJoin(
          groupMemberships,
          and(
            eq(groupMemberships.groupId, groupId),
            eq(groupMemberships.userId, users.id),
          ),
        )
        .leftJoin(
          pendingInvitations,
          and(
            eq(pendingInvitations.groupId, groupId),
            eq(pendingInvitations.invitedUserId, users.id),
            eq(pendingInvitations.status, 'pending'),
          ),
        )
        .where(
          and(
            eq(users.isSearchable, true),
            ne(users.id, actorUserId),
            isNull(groupMemberships.userId),
            isNull(pendingInvitations.id),
            or(
              ilike(users.name, `%${query}%`),
              ilike(users.email, `%${query}%`),
              ilike(users.tag, `%${query}%`),
            ),
          ),
        )
        .orderBy(asc(users.name), asc(users.tag), asc(users.email))
        .limit(12);

      return rows;
    },
  };
}
