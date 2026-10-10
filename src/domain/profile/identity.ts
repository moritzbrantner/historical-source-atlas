import { eq } from 'drizzle-orm';
import { getDb } from '@/src/db/client';
import { users } from '@/src/db/schema';
import {
  failure,
  success,
  type ServiceResult,
} from '@/src/domain/shared/result';
import {
  normalizeProfileTagInput,
  validateProfileTag,
} from '@/src/profile/tags';
import {
  DISPLAY_NAME_MAX_LENGTH,
  DISPLAY_NAME_MIN_LENGTH,
  type ProfileError,
  type ProfileUseCaseDeps,
  type UpdateDisplayNamePayload,
  type UpdateProfileTagPayload,
} from './shared';
import { getProfileUseCaseDeps } from './default-deps';

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

export type {
  UpdateDisplayNamePayload,
  UpdateProfileTagPayload,
} from './shared';
