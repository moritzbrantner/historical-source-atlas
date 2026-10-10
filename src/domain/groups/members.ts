import {
  failure,
  success,
  type ServiceResult,
} from '@/src/domain/shared/result';
import {
  type GroupError,
  type GroupMemberRole,
  type GroupUseCaseDeps,
} from './shared';
import { getGroupUseCaseDeps } from './default-deps';

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
