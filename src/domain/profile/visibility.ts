import {
  failure,
  success,
  type ServiceResult,
} from '@/src/domain/shared/result';
import { type FollowerVisibilityRole } from '@/src/profile/follower-visibility';
import {
  type ProfileError,
  type ProfileFollowerVisibilityPayload,
  type ProfileSearchVisibilityPayload,
  type ProfileUseCaseDeps,
} from './shared';
import { getProfileUseCaseDeps } from './default-deps';

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

export type {
  ProfileFollowerVisibilityPayload,
  ProfileSearchVisibilityPayload,
} from './shared';
