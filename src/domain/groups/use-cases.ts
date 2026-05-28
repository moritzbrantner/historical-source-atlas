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
import { isAdmin, isSuperAdmin, type AppRole } from '@/lib/authorization';
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
  buildProfileImageUrl,
  deleteProfileImage,
  uploadChatMedia,
} from '@/src/profile/object-storage';

const GROUP_NAME_MIN_LENGTH = 2;
const GROUP_NAME_MAX_LENGTH = 80;
const GROUP_DESCRIPTION_MAX_LENGTH = 500;
const GROUP_MESSAGE_MAX_LENGTH = 500;
const SEARCH_QUERY_MAX_LENGTH = 80;

export type GroupMemberRole = 'OWNER' | 'ADMIN' | 'MEMBER';
export type GroupVisibility = 'PUBLIC' | 'PRIVATE';
export type GroupViewerRole = GroupMemberRole | 'VIEWER';
export type GroupInvitationStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'revoked';

export type GroupError = {
  code: 'VALIDATION_ERROR' | 'NOT_FOUND' | 'FORBIDDEN' | 'CONFLICT';
  message: string;
};

export type GroupUserSummary = {
  userId: string;
  tag: string;
  displayName: string;
  imageUrl: string | null;
};

export type GroupSummary = {
  id: string;
  name: string;
  description: string | null;
  visibility: GroupVisibility;
  ownerId: string;
  role: GroupViewerRole;
  memberCount: number;
  pendingInvitationCount: number;
};

export type GroupInvitationSummary = {
  id: string;
  groupId: string;
  groupName: string;
  invitedBy: GroupUserSummary;
  createdAt: string;
};

export type GroupMemberSummary = GroupUserSummary & {
  role: GroupMemberRole;
  joinedAt: string;
};

export type GroupPendingInvitation = {
  id: string;
  invitedUser: GroupUserSummary;
  invitedBy: GroupUserSummary;
  createdAt: string;
};

export type GroupChatMessage = {
  id: string;
  groupId: string;
  sender: GroupUserSummary;
  body: string;
  kind: ChatMessageKind;
  metadata: ChatMessageMetadata;
  pinnedAt: string | null;
  createdAt: string;
};

export type GroupsPageData = {
  groups: GroupSummary[];
  invitations: GroupInvitationSummary[];
};

export type GroupDetail = GroupSummary & {
  members: GroupMemberSummary[];
  pendingInvitations: GroupPendingInvitation[];
  messages: GroupChatMessage[];
  canInvite: boolean;
  canManageMembers: boolean;
  canSendMessages: boolean;
};

type UserRecord = {
  id: string;
  email: string | null;
  tag: string;
  name: string | null;
  image: string | null;
};

type GroupRecord = {
  id: string;
  name: string;
  description: string | null;
  visibility: GroupVisibility;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
};

type MembershipRecord = {
  groupId: string;
  userId: string;
  role: GroupMemberRole;
  createdAt: Date;
  updatedAt: Date;
};

type InvitationRecord = {
  id: string;
  groupId: string;
  invitedUserId: string;
  invitedByUserId: string;
  status: GroupInvitationStatus;
  createdAt: Date;
  respondedAt: Date | null;
};

type GroupMembershipRow = GroupRecord & {
  role: GroupViewerRole;
  memberCount: number;
  pendingInvitationCount: number;
};

type PendingInvitationForUserRow = InvitationRecord & {
  group: GroupRecord;
  inviter: UserRecord;
};

type MemberRow = MembershipRecord & {
  user: UserRecord;
};

type PendingInvitationRow = InvitationRecord & {
  invitedUser: UserRecord;
  invitedBy: UserRecord;
};

type GroupMessageRecord = {
  id: string;
  groupId: string;
  senderUserId: string;
  body: string;
  kind: string;
  metadata: unknown;
  pinnedAt: Date | null;
  createdAt: Date;
};

type GroupMessageRow = GroupMessageRecord & {
  sender: UserRecord;
};

export type GroupUseCaseDeps = {
  findUserById: (userId: string) => Promise<UserRecord | undefined>;
  createGroupWithOwner: (input: {
    id: string;
    name: string;
    description: string | null;
    visibility: GroupVisibility;
    ownerId: string;
  }) => Promise<GroupRecord>;
  listGroupsForUser: (
    userId: string,
    actorRole: AppRole,
  ) => Promise<GroupMembershipRow[]>;
  listPendingInvitationsForUser: (
    userId: string,
  ) => Promise<PendingInvitationForUserRow[]>;
  findGroupById: (groupId: string) => Promise<GroupRecord | undefined>;
  findMembership: (
    groupId: string,
    userId: string,
  ) => Promise<MembershipRecord | undefined>;
  listMembers: (groupId: string) => Promise<MemberRow[]>;
  listPendingInvitations: (groupId: string) => Promise<PendingInvitationRow[]>;
  listMessages: (groupId: string) => Promise<GroupMessageRow[]>;
  findMessageById: (
    messageId: string,
  ) => Promise<GroupMessageRecord | undefined>;
  findPendingInvitation: (
    groupId: string,
    invitedUserId: string,
  ) => Promise<InvitationRecord | undefined>;
  findInvitationById: (
    invitationId: string,
  ) => Promise<PendingInvitationForUserRow | undefined>;
  createInvitation: (input: {
    id: string;
    groupId: string;
    invitedUserId: string;
    invitedByUserId: string;
  }) => Promise<InvitationRecord>;
  createMessage: (input: {
    id: string;
    groupId: string;
    senderUserId: string;
    body: string;
    kind: ChatMessageKind;
    metadata: ChatMessageMetadata;
    createdAt: Date;
  }) => Promise<GroupMessageRecord>;
  updateMessage: (
    messageId: string,
    input: {
      metadata?: ChatMessageMetadata;
      pinnedAt?: Date | null;
    },
  ) => Promise<GroupMessageRecord | undefined>;
  updateInvitationStatus: (
    invitationId: string,
    status: Exclude<GroupInvitationStatus, 'pending'>,
  ) => Promise<void>;
  addMember: (
    groupId: string,
    userId: string,
    role: GroupMemberRole,
  ) => Promise<void>;
  updateMemberRole: (
    groupId: string,
    userId: string,
    role: Exclude<GroupMemberRole, 'OWNER'>,
  ) => Promise<void>;
  removeMember: (groupId: string, userId: string) => Promise<void>;
  searchInviteCandidates: (
    groupId: string,
    actorUserId: string,
    query: string,
  ) => Promise<UserRecord[]>;
};

function getGroupUseCaseDeps(): GroupUseCaseDeps {
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

function normalizeGroupName(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeGroupDescription(value: string | null | undefined) {
  const description = value?.trim().replace(/\s+/g, ' ') ?? '';
  return description || null;
}

function normalizeGroupVisibility(
  value: GroupVisibility | null | undefined,
): GroupVisibility {
  return value === 'PUBLIC' ? 'PUBLIC' : 'PRIVATE';
}

function resolveDisplayName(user: Pick<UserRecord, 'name' | 'email'>) {
  const trimmedName = user.name?.trim();

  if (trimmedName) {
    return trimmedName;
  }

  const emailPrefix = user.email?.split('@')[0]?.trim();
  return emailPrefix || 'User';
}

function toUserSummary(user: UserRecord): GroupUserSummary {
  return {
    userId: user.id,
    tag: user.tag,
    displayName: resolveDisplayName(user),
    imageUrl: buildProfileImageUrl(user.image) ?? null,
  };
}

function toGroupSummary(row: GroupMembershipRow): GroupSummary {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    visibility: row.visibility,
    ownerId: row.ownerId,
    role: row.role,
    memberCount: Number(row.memberCount),
    pendingInvitationCount: Number(row.pendingInvitationCount),
  };
}

function toInvitationSummary(
  row: PendingInvitationForUserRow,
): GroupInvitationSummary {
  return {
    id: row.id,
    groupId: row.groupId,
    groupName: row.group.name,
    invitedBy: toUserSummary(row.inviter),
    createdAt: row.createdAt.toISOString(),
  };
}

function toMemberSummary(row: MemberRow): GroupMemberSummary {
  return {
    ...toUserSummary(row.user),
    role: row.role,
    joinedAt: row.createdAt.toISOString(),
  };
}

function toPendingInvitation(
  row: PendingInvitationRow,
): GroupPendingInvitation {
  return {
    id: row.id,
    invitedUser: toUserSummary(row.invitedUser),
    invitedBy: toUserSummary(row.invitedBy),
    createdAt: row.createdAt.toISOString(),
  };
}

function toChatMessage(row: GroupMessageRow): GroupChatMessage {
  const kind = resolveChatMessageKind(row.kind);

  return {
    id: row.id,
    groupId: row.groupId,
    sender: toUserSummary(row.sender),
    body: row.body,
    kind,
    metadata: parseChatMessageMetadata(kind, row.metadata),
    pinnedAt: row.pinnedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function resolveChatMessageKind(kind: string): ChatMessageKind {
  return isChatMessageKind(kind) ? kind : 'text';
}

function isGroupAdmin(role: GroupMemberRole | null | undefined) {
  return role === 'OWNER' || role === 'ADMIN';
}

function validateGroupInput(
  name: string,
  description: string | null,
): GroupError | null {
  if (name.length < GROUP_NAME_MIN_LENGTH) {
    return {
      code: 'VALIDATION_ERROR',
      message: `Group names must be at least ${GROUP_NAME_MIN_LENGTH} characters.`,
    };
  }

  if (name.length > GROUP_NAME_MAX_LENGTH) {
    return {
      code: 'VALIDATION_ERROR',
      message: `Group names must be ${GROUP_NAME_MAX_LENGTH} characters or fewer.`,
    };
  }

  if ((description?.length ?? 0) > GROUP_DESCRIPTION_MAX_LENGTH) {
    return {
      code: 'VALIDATION_ERROR',
      message: `Group descriptions must be ${GROUP_DESCRIPTION_MAX_LENGTH} characters or fewer.`,
    };
  }

  return null;
}

async function buildGroupSummary(
  group: GroupRecord,
  role: GroupViewerRole,
  deps: GroupUseCaseDeps,
): Promise<GroupSummary> {
  const [members, invitations] = await Promise.all([
    deps.listMembers(group.id),
    deps.listPendingInvitations(group.id),
  ]);

  return {
    id: group.id,
    name: group.name,
    description: group.description,
    visibility: group.visibility,
    ownerId: group.ownerId,
    role,
    memberCount: members.length,
    pendingInvitationCount: role === 'VIEWER' ? 0 : invitations.length,
  };
}

export async function getGroupsPageDataUseCase(
  userId: string,
  actorRole: AppRole,
  deps: GroupUseCaseDeps = getGroupUseCaseDeps(),
): Promise<ServiceResult<GroupsPageData, GroupError>> {
  const user = await deps.findUserById(userId);

  if (!user) {
    return failure({
      code: 'NOT_FOUND',
      message: 'User account was not found.',
    });
  }

  const [groupRows, invitationRows] = await Promise.all([
    deps.listGroupsForUser(userId, actorRole),
    deps.listPendingInvitationsForUser(userId),
  ]);

  return success({
    groups: groupRows.map(toGroupSummary),
    invitations: invitationRows.map(toInvitationSummary),
  });
}

export async function createGroupUseCase(
  actorUserId: string,
  input: {
    name: string;
    description?: string | null;
    visibility?: GroupVisibility | null;
  },
  deps: GroupUseCaseDeps = getGroupUseCaseDeps(),
): Promise<ServiceResult<GroupSummary, GroupError>> {
  const actor = await deps.findUserById(actorUserId);

  if (!actor) {
    return failure({
      code: 'NOT_FOUND',
      message: 'User account was not found.',
    });
  }

  const name = normalizeGroupName(input.name);
  const description = normalizeGroupDescription(input.description);
  const visibility = normalizeGroupVisibility(input.visibility);
  const validationError = validateGroupInput(name, description);

  if (validationError) {
    return failure(validationError);
  }

  const group = await deps.createGroupWithOwner({
    id: crypto.randomUUID(),
    name,
    description,
    visibility,
    ownerId: actorUserId,
  });

  return success(await buildGroupSummary(group, 'OWNER', deps));
}

export async function getGroupDetailUseCase(
  actorUserId: string,
  actorRole: AppRole,
  groupId: string,
  deps: GroupUseCaseDeps = getGroupUseCaseDeps(),
): Promise<ServiceResult<GroupDetail, GroupError>> {
  const [group, membership] = await Promise.all([
    deps.findGroupById(groupId),
    deps.findMembership(groupId, actorUserId),
  ]);

  if (!group) {
    return failure({
      code: 'NOT_FOUND',
      message: 'Group was not found.',
    });
  }

  const canViewAsAdmin =
    isSuperAdmin(actorRole) ||
    (isAdmin(actorRole) && group.visibility === 'PUBLIC');

  if (!membership && !canViewAsAdmin) {
    return failure({
      code: 'FORBIDDEN',
      message: 'You are not a member of this group.',
    });
  }

  const viewerRole = membership?.role ?? 'VIEWER';
  const canInvite = membership ? isGroupAdmin(membership.role) : false;
  const canManageMembers = membership
    ? membership.role === 'OWNER' || membership.role === 'ADMIN'
    : false;

  const [memberRows, invitationRows, messageRows] = await Promise.all([
    deps.listMembers(groupId),
    canInvite ? deps.listPendingInvitations(groupId) : Promise.resolve([]),
    deps.listMessages(groupId),
  ]);

  return success({
    id: group.id,
    name: group.name,
    description: group.description,
    visibility: group.visibility,
    ownerId: group.ownerId,
    role: viewerRole,
    memberCount: memberRows.length,
    pendingInvitationCount: invitationRows.length,
    members: memberRows.map(toMemberSummary),
    pendingInvitations: invitationRows.map(toPendingInvitation),
    messages: messageRows.map(toChatMessage),
    canInvite,
    canManageMembers,
    canSendMessages: Boolean(membership),
  });
}

export async function getGroupMessagesUseCase(
  actorUserId: string,
  groupId: string,
  deps: GroupUseCaseDeps = getGroupUseCaseDeps(),
): Promise<ServiceResult<{ messages: GroupChatMessage[] }, GroupError>> {
  const [group, membership] = await Promise.all([
    deps.findGroupById(groupId),
    deps.findMembership(groupId, actorUserId),
  ]);

  if (!group) {
    return failure({
      code: 'NOT_FOUND',
      message: 'Group was not found.',
    });
  }

  if (!membership) {
    return failure({
      code: 'FORBIDDEN',
      message: 'You are not a member of this group.',
    });
  }

  const messages = await deps.listMessages(groupId);

  return success({
    messages: messages.map(toChatMessage),
  });
}

export async function sendGroupMessageUseCase(
  actorUserId: string,
  groupId: string,
  input: string | ChatMessageInput,
  deps: GroupUseCaseDeps = getGroupUseCaseDeps(),
): Promise<ServiceResult<{ message: GroupChatMessage }, GroupError>> {
  const normalizedMessage = normalizeChatMessageInput(input);

  if (!normalizedMessage.ok) {
    return failure({
      code: 'VALIDATION_ERROR',
      message:
        normalizedMessage.error ===
        'Messages must be between 1 and 500 characters.'
          ? `Messages must be between 1 and ${GROUP_MESSAGE_MAX_LENGTH} characters.`
          : normalizedMessage.error,
    });
  }

  const [group, membership, actor] = await Promise.all([
    deps.findGroupById(groupId),
    deps.findMembership(groupId, actorUserId),
    deps.findUserById(actorUserId),
  ]);

  if (!group) {
    return failure({
      code: 'NOT_FOUND',
      message: 'Group was not found.',
    });
  }

  if (!membership) {
    return failure({
      code: 'FORBIDDEN',
      message: 'You are not a member of this group.',
    });
  }

  if (!actor) {
    return failure({
      code: 'NOT_FOUND',
      message: 'User account was not found.',
    });
  }

  const message = await deps.createMessage({
    id: crypto.randomUUID(),
    groupId,
    senderUserId: actorUserId,
    body: normalizedMessage.value.body,
    kind: normalizedMessage.value.kind,
    metadata: normalizedMessage.value.metadata,
    createdAt: new Date(),
  });

  return success({
    message: toChatMessage({
      ...message,
      sender: actor,
    }),
  });
}

export async function sendGroupMediaMessageUseCase(
  actorUserId: string,
  groupId: string,
  input: { body?: string; file: File },
  deps: GroupUseCaseDeps = getGroupUseCaseDeps(),
): Promise<ServiceResult<{ message: GroupChatMessage }, GroupError>> {
  const caption = input.body?.trim() ?? '';

  if (caption.length > GROUP_MESSAGE_MAX_LENGTH) {
    return failure({
      code: 'VALIDATION_ERROR',
      message: `Messages must be ${GROUP_MESSAGE_MAX_LENGTH} characters or fewer.`,
    });
  }

  const [group, membership, actor] = await Promise.all([
    deps.findGroupById(groupId),
    deps.findMembership(groupId, actorUserId),
    deps.findUserById(actorUserId),
  ]);

  if (!group) {
    return failure({
      code: 'NOT_FOUND',
      message: 'Group was not found.',
    });
  }

  if (!membership) {
    return failure({
      code: 'FORBIDDEN',
      message: 'You are not a member of this group.',
    });
  }

  if (!actor) {
    return failure({
      code: 'NOT_FOUND',
      message: 'User account was not found.',
    });
  }

  try {
    const validated = await validateChatMediaUpload(input.file);
    const uploaded = await uploadChatMedia(actorUserId, validated);

    try {
      const message = await deps.createMessage({
        id: crypto.randomUUID(),
        groupId,
        senderUserId: actorUserId,
        body: caption || validated.filename,
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
        createdAt: new Date(),
      });

      return success({
        message: toChatMessage({
          ...message,
          sender: actor,
        }),
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

export async function updateGroupChatMessageUseCase(
  actorUserId: string,
  input: {
    groupId: string;
    messageId: string;
    action: 'pin' | 'unpin' | 'vote-poll' | 'toggle-todo';
    optionId?: string;
    itemId?: string;
    completed?: boolean;
  },
  deps: GroupUseCaseDeps = getGroupUseCaseDeps(),
): Promise<ServiceResult<{ message: GroupChatMessage }, GroupError>> {
  const [message, membership, actor] = await Promise.all([
    deps.findMessageById(input.messageId),
    deps.findMembership(input.groupId, actorUserId),
    deps.findUserById(actorUserId),
  ]);

  if (!message || message.groupId !== input.groupId) {
    return failure({
      code: 'NOT_FOUND',
      message: 'Message was not found.',
    });
  }

  if (!membership) {
    return failure({
      code: 'FORBIDDEN',
      message: 'You are not a member of this group.',
    });
  }

  if (!actor) {
    return failure({
      code: 'NOT_FOUND',
      message: 'User account was not found.',
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

  const updatedMessage = await deps.updateMessage(input.messageId, update);

  if (!updatedMessage) {
    return failure({
      code: 'NOT_FOUND',
      message: 'Message was not found.',
    });
  }

  return success({
    message: toChatMessage({
      ...updatedMessage,
      sender: actor,
    }),
  });
}

export async function searchGroupInviteCandidatesUseCase(
  actorUserId: string,
  groupId: string,
  rawQuery: string,
  deps: GroupUseCaseDeps = getGroupUseCaseDeps(),
): Promise<ServiceResult<{ users: GroupUserSummary[] }, GroupError>> {
  const membership = await deps.findMembership(groupId, actorUserId);

  if (!membership || !isGroupAdmin(membership.role)) {
    return failure({
      code: 'FORBIDDEN',
      message: 'Only group admins can invite members.',
    });
  }

  const query = rawQuery.trim();

  if (!query) {
    return success({ users: [] });
  }

  if (query.length > SEARCH_QUERY_MAX_LENGTH) {
    return failure({
      code: 'VALIDATION_ERROR',
      message: `Search must be ${SEARCH_QUERY_MAX_LENGTH} characters or fewer.`,
    });
  }

  const candidates = await deps.searchInviteCandidates(
    groupId,
    actorUserId,
    query,
  );

  return success({
    users: candidates.map(toUserSummary),
  });
}

export async function inviteUserToGroupUseCase(
  actorUserId: string,
  groupId: string,
  invitedUserId: string,
  deps: GroupUseCaseDeps = getGroupUseCaseDeps(),
): Promise<ServiceResult<{ invitation: GroupPendingInvitation }, GroupError>> {
  const [group, actorMembership, invitedUser] = await Promise.all([
    deps.findGroupById(groupId),
    deps.findMembership(groupId, actorUserId),
    deps.findUserById(invitedUserId),
  ]);

  if (!group) {
    return failure({
      code: 'NOT_FOUND',
      message: 'Group was not found.',
    });
  }

  if (!actorMembership || !isGroupAdmin(actorMembership.role)) {
    return failure({
      code: 'FORBIDDEN',
      message: 'Only group admins can invite members.',
    });
  }

  if (!invitedUser) {
    return failure({
      code: 'NOT_FOUND',
      message: 'User account was not found.',
    });
  }

  const [existingMembership, existingInvitation, inviter] = await Promise.all([
    deps.findMembership(groupId, invitedUserId),
    deps.findPendingInvitation(groupId, invitedUserId),
    deps.findUserById(actorUserId),
  ]);

  if (existingMembership) {
    return failure({
      code: 'CONFLICT',
      message: 'That user is already a group member.',
    });
  }

  if (existingInvitation) {
    return failure({
      code: 'CONFLICT',
      message: 'That user already has a pending invitation.',
    });
  }

  if (!inviter) {
    return failure({
      code: 'NOT_FOUND',
      message: 'User account was not found.',
    });
  }

  const invitation = await deps.createInvitation({
    id: crypto.randomUUID(),
    groupId,
    invitedUserId,
    invitedByUserId: actorUserId,
  });

  return success({
    invitation: toPendingInvitation({
      ...invitation,
      invitedUser,
      invitedBy: inviter,
    }),
  });
}

export async function respondToGroupInvitationUseCase(
  actorUserId: string,
  invitationId: string,
  decision: 'accept' | 'decline',
  deps: GroupUseCaseDeps = getGroupUseCaseDeps(),
): Promise<
  ServiceResult<
    { status: 'accepted' | 'declined'; group: GroupSummary | null },
    GroupError
  >
> {
  const invitation = await deps.findInvitationById(invitationId);

  if (!invitation) {
    return failure({
      code: 'NOT_FOUND',
      message: 'Invitation was not found.',
    });
  }

  if (invitation.invitedUserId !== actorUserId) {
    return failure({
      code: 'FORBIDDEN',
      message: 'This invitation belongs to another user.',
    });
  }

  if (invitation.status !== 'pending') {
    return failure({
      code: 'CONFLICT',
      message: 'This invitation has already been answered.',
    });
  }

  if (decision === 'decline') {
    await deps.updateInvitationStatus(invitationId, 'declined');
    return success({ status: 'declined', group: null });
  }

  await deps.addMember(invitation.groupId, actorUserId, 'MEMBER');
  await deps.updateInvitationStatus(invitationId, 'accepted');

  return success({
    status: 'accepted',
    group: await buildGroupSummary(invitation.group, 'MEMBER', deps),
  });
}

export async function updateGroupMemberRoleUseCase(
  actorUserId: string,
  groupId: string,
  targetUserId: string,
  role: Exclude<GroupMemberRole, 'OWNER'>,
  deps: GroupUseCaseDeps = getGroupUseCaseDeps(),
): Promise<
  ServiceResult<
    { userId: string; role: Exclude<GroupMemberRole, 'OWNER'> },
    GroupError
  >
> {
  const [actorMembership, targetMembership] = await Promise.all([
    deps.findMembership(groupId, actorUserId),
    deps.findMembership(groupId, targetUserId),
  ]);

  if (!actorMembership || actorMembership.role !== 'OWNER') {
    return failure({
      code: 'FORBIDDEN',
      message: 'Only the group owner can change member roles.',
    });
  }

  if (!targetMembership) {
    return failure({
      code: 'NOT_FOUND',
      message: 'Group member was not found.',
    });
  }

  if (targetMembership.role === 'OWNER') {
    return failure({
      code: 'VALIDATION_ERROR',
      message: 'The group owner role cannot be changed here.',
    });
  }

  await deps.updateMemberRole(groupId, targetUserId, role);

  return success({
    userId: targetUserId,
    role,
  });
}

export async function removeGroupMemberUseCase(
  actorUserId: string,
  groupId: string,
  targetUserId: string,
  deps: GroupUseCaseDeps = getGroupUseCaseDeps(),
): Promise<ServiceResult<{ removed: boolean; userId: string }, GroupError>> {
  const [actorMembership, targetMembership] = await Promise.all([
    deps.findMembership(groupId, actorUserId),
    deps.findMembership(groupId, targetUserId),
  ]);

  if (!actorMembership) {
    return failure({
      code: 'FORBIDDEN',
      message: 'You are not a member of this group.',
    });
  }

  if (!targetMembership) {
    return failure({
      code: 'NOT_FOUND',
      message: 'Group member was not found.',
    });
  }

  if (targetMembership.role === 'OWNER') {
    return failure({
      code: 'VALIDATION_ERROR',
      message: 'The group owner cannot be removed.',
    });
  }

  const removingSelf = actorUserId === targetUserId;

  if (!removingSelf) {
    if (actorMembership.role === 'MEMBER') {
      return failure({
        code: 'FORBIDDEN',
        message: 'Only group admins can remove members.',
      });
    }

    if (
      actorMembership.role === 'ADMIN' &&
      targetMembership.role !== 'MEMBER'
    ) {
      return failure({
        code: 'FORBIDDEN',
        message: 'Admins can only remove regular members.',
      });
    }
  }

  await deps.removeMember(groupId, targetUserId);

  return success({
    removed: true,
    userId: targetUserId,
  });
}
