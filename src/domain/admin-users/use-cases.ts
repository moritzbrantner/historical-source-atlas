import type { AppRole } from '@/lib/authorization';
import { isAdmin, isSuperAdmin } from '@/lib/authorization';
import type { FoundationFeatureKey } from '@/src/app-config/feature-keys';
import { getDb } from '@/src/db/client';
import { users } from '@/src/db/schema';
import {
  canApplyUserFeatureOverrides,
  saveUserFeatureOverride,
} from '@/src/foundation/features/access';
import {
  failure,
  success,
  type ServiceResult,
} from '@/src/domain/shared/result';
import { eq } from 'drizzle-orm';

export type RoleManagementError =
  | {
      code: 'FORBIDDEN';
      message: string;
    }
  | {
      code: 'NOT_FOUND';
      message: string;
    }
  | {
      code: 'CONFLICT';
      message: string;
    };

export type UserStatusAction = 'disable' | 'reactivate' | 'clearLockout';

export type UserStatusManagementError =
  | {
      code: 'FORBIDDEN';
      message: string;
    }
  | {
      code: 'NOT_FOUND';
      message: string;
    }
  | {
      code: 'CONFLICT';
      message: string;
    }
  | {
      code: 'VALIDATION_ERROR';
      message: string;
    };

type UserRoleRecord = {
  id: string;
  role: AppRole;
  disabledAt?: Date | null;
};

export type UserFeatureManagementError =
  | {
      code: 'FORBIDDEN';
      message: string;
    }
  | {
      code: 'NOT_FOUND';
      message: string;
    }
  | {
      code: 'CONFLICT';
      message: string;
    }
  | {
      code: 'VALIDATION_ERROR';
      message: string;
    };

type UpdateAdminUserRoleDependencies = {
  findUserById: (userId: string) => Promise<UserRoleRecord | undefined>;
  countUsersByRole: (role: AppRole) => Promise<number>;
  updateUserRole: (userId: string, nextRole: AppRole) => Promise<void>;
};

type UpdateAdminUserStatusDependencies = {
  findUserById: (userId: string) => Promise<UserRoleRecord | undefined>;
  countActiveUsersByRole: (role: AppRole) => Promise<number>;
  disableUser: (
    userId: string,
    input: { disabledById: string; disabledReason: string | null },
  ) => Promise<void>;
  reactivateUser: (userId: string) => Promise<void>;
  clearUserLockout: (userId: string) => Promise<void>;
};

type UpdateAdminUserFeatureDependencies = {
  findUserById: (userId: string) => Promise<UserRoleRecord | undefined>;
  saveUserFeatureOverride: (input: {
    userId: string;
    featureKey: FoundationFeatureKey;
    enabled: boolean;
  }) => Promise<void>;
};

async function createDefaultDependencies(): Promise<UpdateAdminUserRoleDependencies> {
  return {
    findUserById: async (userId) => {
      return getDb().query.users.findFirst({
        where: (table, { eq: innerEq }) => innerEq(table.id, userId),
        columns: {
          id: true,
          role: true,
          disabledAt: true,
        },
      });
    },
    countUsersByRole: async (role) => {
      const matchingUsers = await getDb().query.users.findMany({
        where: (table, { eq: innerEq }) => innerEq(table.role, role),
        columns: { id: true },
      });

      return matchingUsers.length;
    },
    updateUserRole: async (userId, nextRole) => {
      await getDb()
        .update(users)
        .set({
          role: nextRole,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    },
  };
}

async function createStatusDependencies(): Promise<UpdateAdminUserStatusDependencies> {
  return {
    findUserById: async (userId) => {
      return getDb().query.users.findFirst({
        where: (table, { eq: innerEq }) => innerEq(table.id, userId),
        columns: {
          id: true,
          role: true,
          disabledAt: true,
        },
      });
    },
    countActiveUsersByRole: async (role) => {
      const matchingUsers = await getDb().query.users.findMany({
        where: (table, { and: innerAnd, eq: innerEq, isNull }) =>
          innerAnd(innerEq(table.role, role), isNull(table.disabledAt)),
        columns: { id: true },
      });

      return matchingUsers.length;
    },
    disableUser: async (userId, input) => {
      await getDb()
        .update(users)
        .set({
          disabledAt: new Date(),
          disabledReason: input.disabledReason,
          disabledById: input.disabledById,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    },
    reactivateUser: async (userId) => {
      await getDb()
        .update(users)
        .set({
          disabledAt: null,
          disabledReason: null,
          disabledById: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    },
    clearUserLockout: async (userId) => {
      await getDb()
        .update(users)
        .set({
          failedSignInAttempts: 0,
          lockoutUntil: null,
          lockoutClearedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    },
  };
}

async function createFeatureDependencies(): Promise<UpdateAdminUserFeatureDependencies> {
  return {
    findUserById: async (userId) => {
      return getDb().query.users.findFirst({
        where: (table, { eq: innerEq }) => innerEq(table.id, userId),
        columns: {
          id: true,
          role: true,
        },
      });
    },
    saveUserFeatureOverride,
  };
}

export async function updateAdminUserRoleUseCase(
  input: {
    actorUserId: string;
    targetUserId: string;
    nextRole: AppRole;
  },
  depsPromise: Promise<UpdateAdminUserRoleDependencies> = createDefaultDependencies(),
): Promise<ServiceResult<{ role: AppRole }, RoleManagementError>> {
  const deps = await depsPromise;
  const [actor, target] = await Promise.all([
    deps.findUserById(input.actorUserId),
    deps.findUserById(input.targetUserId),
  ]);

  if (!actor || !isSuperAdmin(actor.role)) {
    return failure({
      code: 'FORBIDDEN',
      message: 'Only superadmins can change user roles.',
    });
  }

  if (!target) {
    return failure({
      code: 'NOT_FOUND',
      message: 'The selected user could not be found.',
    });
  }

  if (target.id === actor.id) {
    return failure({
      code: 'CONFLICT',
      message: 'Superadmins cannot change their own role from this screen.',
    });
  }

  if (target.role === 'SUPERADMIN' && input.nextRole !== 'SUPERADMIN') {
    const superadminCount = await deps.countUsersByRole('SUPERADMIN');

    if (superadminCount <= 1) {
      return failure({
        code: 'CONFLICT',
        message: 'At least one superadmin account must remain available.',
      });
    }
  }

  if (target.role !== input.nextRole) {
    await deps.updateUserRole(target.id, input.nextRole);
  }

  return success({
    role: input.nextRole,
  });
}

export async function updateAdminUserStatusUseCase(
  input: {
    actorUserId: string;
    targetUserId: string;
    action: UserStatusAction;
    reason?: string | null;
  },
  depsPromise: Promise<UpdateAdminUserStatusDependencies> = createStatusDependencies(),
): Promise<
  ServiceResult<{ action: UserStatusAction }, UserStatusManagementError>
> {
  const deps = await depsPromise;
  const [actor, target] = await Promise.all([
    deps.findUserById(input.actorUserId),
    deps.findUserById(input.targetUserId),
  ]);

  if (!actor || !isSuperAdmin(actor.role)) {
    return failure({
      code: 'FORBIDDEN',
      message: 'Only superadmins can manage account status.',
    });
  }

  if (!target) {
    return failure({
      code: 'NOT_FOUND',
      message: 'The selected user could not be found.',
    });
  }

  const reason = input.reason?.trim() || null;

  if (reason && reason.length > 500) {
    return failure({
      code: 'VALIDATION_ERROR',
      message: 'Disable reason must be 500 characters or fewer.',
    });
  }

  if (input.action === 'disable') {
    if (target.id === actor.id) {
      return failure({
        code: 'CONFLICT',
        message: 'Superadmins cannot disable their own account.',
      });
    }

    if (target.role === 'SUPERADMIN' && !target.disabledAt) {
      const activeSuperadminCount =
        await deps.countActiveUsersByRole('SUPERADMIN');

      if (activeSuperadminCount <= 1) {
        return failure({
          code: 'CONFLICT',
          message: 'At least one active superadmin account must remain.',
        });
      }
    }

    if (!target.disabledAt) {
      await deps.disableUser(target.id, {
        disabledById: actor.id,
        disabledReason: reason,
      });
    }

    return success({ action: input.action });
  }

  if (input.action === 'reactivate') {
    if (target.disabledAt) {
      await deps.reactivateUser(target.id);
    }

    return success({ action: input.action });
  }

  await deps.clearUserLockout(target.id);
  return success({ action: input.action });
}

export async function updateAdminUserFeatureAccessUseCase(
  input: {
    actorUserId: string;
    targetUserId: string;
    featureKey: FoundationFeatureKey;
    enabled: boolean;
  },
  depsPromise: Promise<UpdateAdminUserFeatureDependencies> = createFeatureDependencies(),
): Promise<ServiceResult<{ enabled: boolean }, UserFeatureManagementError>> {
  const deps = await depsPromise;
  const [actor, target] = await Promise.all([
    deps.findUserById(input.actorUserId),
    deps.findUserById(input.targetUserId),
  ]);

  if (!actor || !isAdmin(actor.role)) {
    return failure({
      code: 'FORBIDDEN',
      message: 'Only admins and superadmins can manage per-user functionality.',
    });
  }

  if (!target) {
    return failure({
      code: 'NOT_FOUND',
      message: 'The selected user could not be found.',
    });
  }

  if (isAdmin(target.role)) {
    return failure({
      code: 'CONFLICT',
      message:
        'Per-user functionality controls are only available for non-admin accounts.',
    });
  }

  if (!canApplyUserFeatureOverrides(input.featureKey, target.role)) {
    return failure({
      code: 'VALIDATION_ERROR',
      message: 'This functionality cannot be overridden for individual users.',
    });
  }

  await deps.saveUserFeatureOverride({
    userId: target.id,
    featureKey: input.featureKey,
    enabled: input.enabled,
  });

  return success({
    enabled: input.enabled,
  });
}
