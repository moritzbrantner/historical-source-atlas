import {
  failure,
  success,
  type ServiceResult,
} from '@/src/domain/shared/result';
import {
  type ProfileBlockMutationPayload,
  type ProfileDirectoryEntry,
  type ProfileError,
  type ProfileUseCaseDeps,
  toProfileDirectoryEntry,
} from './shared';
import { getProfileUseCaseDeps } from './default-deps';

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

export type {
  ProfileBlockMutationPayload,
  ProfileDirectoryEntry,
} from './shared';
