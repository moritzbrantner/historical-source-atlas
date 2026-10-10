import { eq } from 'drizzle-orm';
import { getDb } from '@/src/db/client';
import { users } from '@/src/db/schema';
import {
  failure,
  success,
  type ServiceResult,
} from '@/src/domain/shared/result';
import {
  ImageValidationError,
  validateBannerImageUpload,
  validateImageUpload,
} from '@/src/profile/image-validation';
import {
  deleteProfileImage,
  uploadProfileBannerImage,
  uploadProfileImage,
} from '@/src/profile/object-storage';
import {
  type ProfileError,
  type UpdateProfileBannerImagePayload,
  type UpdateProfileImagePayload,
} from './shared';

export async function updateProfileImageUseCase(
  userId: string,
  file: File,
): Promise<ServiceResult<UpdateProfileImagePayload, ProfileError>> {
  const existingUser = await getDb().query.users.findFirst({
    where: (table, { eq: innerEq }) => innerEq(table.id, userId),
  });

  if (!existingUser) {
    return failure({
      code: 'NOT_FOUND',
      message: 'User account was not found.',
    });
  }

  try {
    const validated = await validateImageUpload(file);
    const uploaded = await uploadProfileImage(userId, validated);

    try {
      await getDb()
        .update(users)
        .set({ image: uploaded.key, updatedAt: new Date() })
        .where(eq(users.id, userId));
    } catch (error) {
      await deleteProfileImage(uploaded.key);
      throw error;
    }

    await deleteProfileImage(existingUser.image);

    return success({
      imageKey: uploaded.key,
      imageUrl: uploaded.url,
    });
  } catch (error) {
    if (error instanceof ImageValidationError) {
      return failure({
        code: 'VALIDATION_ERROR',
        message: error.message,
      });
    }

    throw error;
  }
}

export async function removeProfileImageUseCase(
  userId: string,
): Promise<ServiceResult<{ removed: true }, ProfileError>> {
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
    .set({ image: null, updatedAt: new Date() })
    .where(eq(users.id, userId));

  await deleteProfileImage(existingUser.image);

  return success({ removed: true });
}

export async function updateProfileBannerImageUseCase(
  userId: string,
  file: File,
): Promise<ServiceResult<UpdateProfileBannerImagePayload, ProfileError>> {
  const existingUser = await getDb().query.users.findFirst({
    where: (table, { eq: innerEq }) => innerEq(table.id, userId),
  });

  if (!existingUser) {
    return failure({
      code: 'NOT_FOUND',
      message: 'User account was not found.',
    });
  }

  try {
    const validated = await validateBannerImageUpload(file);
    const uploaded = await uploadProfileBannerImage(userId, validated);

    try {
      await getDb()
        .update(users)
        .set({ bannerImage: uploaded.key, updatedAt: new Date() })
        .where(eq(users.id, userId));
    } catch (error) {
      await deleteProfileImage(uploaded.key);
      throw error;
    }

    await deleteProfileImage(existingUser.bannerImage);

    return success({
      imageKey: uploaded.key,
      imageUrl: uploaded.url,
    });
  } catch (error) {
    if (error instanceof ImageValidationError) {
      return failure({
        code: 'VALIDATION_ERROR',
        message: error.message,
      });
    }

    throw error;
  }
}

export async function removeProfileBannerImageUseCase(
  userId: string,
): Promise<ServiceResult<{ removed: true }, ProfileError>> {
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
    .set({ bannerImage: null, updatedAt: new Date() })
    .where(eq(users.id, userId));

  await deleteProfileImage(existingUser.bannerImage);

  return success({ removed: true });
}

export type {
  UpdateProfileBannerImagePayload,
  UpdateProfileImagePayload,
} from './shared';
