import { isAdmin, isSuperAdmin, type AppRole } from '@/lib/authorization';
import {
  failure,
  success,
  type ServiceResult,
} from '@/src/domain/shared/result';
import {
  type GroupDetail,
  type GroupError,
  type GroupSummary,
  type GroupUseCaseDeps,
  type GroupVisibility,
  type GroupsPageData,
  buildGroupSummary,
  isGroupAdmin,
  normalizeGroupDescription,
  normalizeGroupName,
  normalizeGroupVisibility,
  toChatMessage,
  toGroupSummary,
  toInvitationSummary,
  toMemberSummary,
  toPendingInvitation,
  validateGroupInput,
} from './shared';
import { getGroupUseCaseDeps } from './default-deps';

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
