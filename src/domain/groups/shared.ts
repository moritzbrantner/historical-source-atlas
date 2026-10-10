// Groups kernel shared by the per-capability modules: contracts, the deps contract, input
// validation and record mappers. The public surface is ./use-cases; import from there.
import { type AppRole } from '@/lib/authorization';
import {
  isChatMessageKind,
  parseChatMessageMetadata,
  type ChatMessageKind,
  type ChatMessageMetadata,
} from '@/src/domain/chat/messages';
import { buildProfileImageUrl } from '@/src/profile/object-storage';

export const GROUP_NAME_MIN_LENGTH = 2;
export const GROUP_NAME_MAX_LENGTH = 80;
export const GROUP_DESCRIPTION_MAX_LENGTH = 500;
export const GROUP_MESSAGE_MAX_LENGTH = 500;
export const SEARCH_QUERY_MAX_LENGTH = 80;

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

export type UserRecord = {
  id: string;
  email: string | null;
  tag: string;
  name: string | null;
  image: string | null;
};

export type GroupRecord = {
  id: string;
  name: string;
  description: string | null;
  visibility: GroupVisibility;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type MembershipRecord = {
  groupId: string;
  userId: string;
  role: GroupMemberRole;
  createdAt: Date;
  updatedAt: Date;
};

export type InvitationRecord = {
  id: string;
  groupId: string;
  invitedUserId: string;
  invitedByUserId: string;
  status: GroupInvitationStatus;
  createdAt: Date;
  respondedAt: Date | null;
};

export type GroupMembershipRow = GroupRecord & {
  role: GroupViewerRole;
  memberCount: number;
  pendingInvitationCount: number;
};

export type PendingInvitationForUserRow = InvitationRecord & {
  group: GroupRecord;
  inviter: UserRecord;
};

export type MemberRow = MembershipRecord & {
  user: UserRecord;
};

export type PendingInvitationRow = InvitationRecord & {
  invitedUser: UserRecord;
  invitedBy: UserRecord;
};

export type GroupMessageRecord = {
  id: string;
  groupId: string;
  senderUserId: string;
  body: string;
  kind: string;
  metadata: unknown;
  pinnedAt: Date | null;
  createdAt: Date;
};

export type GroupMessageRow = GroupMessageRecord & {
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

export function normalizeGroupName(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

export function normalizeGroupDescription(value: string | null | undefined) {
  const description = value?.trim().replace(/\s+/g, ' ') ?? '';
  return description || null;
}

export function normalizeGroupVisibility(
  value: GroupVisibility | null | undefined,
): GroupVisibility {
  return value === 'PUBLIC' ? 'PUBLIC' : 'PRIVATE';
}

export function resolveDisplayName(user: Pick<UserRecord, 'name' | 'email'>) {
  const trimmedName = user.name?.trim();

  if (trimmedName) {
    return trimmedName;
  }

  const emailPrefix = user.email?.split('@')[0]?.trim();
  return emailPrefix || 'User';
}

export function toUserSummary(user: UserRecord): GroupUserSummary {
  return {
    userId: user.id,
    tag: user.tag,
    displayName: resolveDisplayName(user),
    imageUrl: buildProfileImageUrl(user.image) ?? null,
  };
}

export function toGroupSummary(row: GroupMembershipRow): GroupSummary {
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

export function toInvitationSummary(
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

export function toMemberSummary(row: MemberRow): GroupMemberSummary {
  return {
    ...toUserSummary(row.user),
    role: row.role,
    joinedAt: row.createdAt.toISOString(),
  };
}

export function toPendingInvitation(
  row: PendingInvitationRow,
): GroupPendingInvitation {
  return {
    id: row.id,
    invitedUser: toUserSummary(row.invitedUser),
    invitedBy: toUserSummary(row.invitedBy),
    createdAt: row.createdAt.toISOString(),
  };
}

export function toChatMessage(row: GroupMessageRow): GroupChatMessage {
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

export function resolveChatMessageKind(kind: string): ChatMessageKind {
  return isChatMessageKind(kind) ? kind : 'text';
}

export function isGroupAdmin(role: GroupMemberRole | null | undefined) {
  return role === 'OWNER' || role === 'ADMIN';
}

export function validateGroupInput(
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

export async function buildGroupSummary(
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
