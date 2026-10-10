import {
  failure,
  success,
  type ServiceResult,
} from '@/src/domain/shared/result';
import {
  type GroupError,
  type GroupPendingInvitation,
  type GroupSummary,
  type GroupUseCaseDeps,
  type GroupUserSummary,
  SEARCH_QUERY_MAX_LENGTH,
  buildGroupSummary,
  isGroupAdmin,
  toPendingInvitation,
  toUserSummary,
} from './shared';
import { getGroupUseCaseDeps } from './default-deps';

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
