import { describe, expect, it, vi } from 'vitest';

import {
  updateAdminUserRoleUseCase,
  updateAdminUserStatusUseCase,
} from '@/src/domain/admin-users/use-cases';

describe('admin user role management', () => {
  it('allows a superadmin to update another user role', async () => {
    const updateUserRole = vi.fn().mockResolvedValue(undefined);

    const result = await updateAdminUserRoleUseCase(
      {
        actorUserId: 'superadmin_1',
        targetUserId: 'user_1',
        nextRole: 'ADMIN',
      },
      Promise.resolve({
        findUserById: async (userId) =>
          userId === 'superadmin_1'
            ? { id: 'superadmin_1', role: 'SUPERADMIN' as const }
            : { id: 'user_1', role: 'USER' as const },
        countUsersByRole: async () => 1,
        updateUserRole,
      }),
    );

    expect(result).toEqual({
      ok: true,
      data: {
        role: 'ADMIN',
      },
    });
    expect(updateUserRole).toHaveBeenCalledWith('user_1', 'ADMIN');
  });

  it('blocks non-superadmins from changing roles', async () => {
    const result = await updateAdminUserRoleUseCase(
      {
        actorUserId: 'admin_1',
        targetUserId: 'user_1',
        nextRole: 'ADMIN',
      },
      Promise.resolve({
        findUserById: async (userId) =>
          userId === 'admin_1'
            ? { id: 'admin_1', role: 'ADMIN' as const }
            : { id: 'user_1', role: 'USER' as const },
        countUsersByRole: async () => 1,
        updateUserRole: async () => undefined,
      }),
    );

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Only superadmins can change user roles.',
      },
    });
  });

  it('prevents removing the final superadmin role', async () => {
    const updateUserRole = vi.fn().mockResolvedValue(undefined);

    const result = await updateAdminUserRoleUseCase(
      {
        actorUserId: 'superadmin_2',
        targetUserId: 'superadmin_1',
        nextRole: 'ADMIN',
      },
      Promise.resolve({
        findUserById: async (userId) => ({
          id: userId,
          role: 'SUPERADMIN' as const,
        }),
        countUsersByRole: async () => 1,
        updateUserRole,
      }),
    );

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'CONFLICT',
        message: 'At least one superadmin account must remain available.',
      },
    });
    expect(updateUserRole).not.toHaveBeenCalled();
  });

  it('prevents superadmins from changing their own role in-place', async () => {
    const result = await updateAdminUserRoleUseCase(
      {
        actorUserId: 'superadmin_1',
        targetUserId: 'superadmin_1',
        nextRole: 'ADMIN',
      },
      Promise.resolve({
        findUserById: async () => ({
          id: 'superadmin_1',
          role: 'SUPERADMIN' as const,
        }),
        countUsersByRole: async () => 2,
        updateUserRole: async () => undefined,
      }),
    );

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'CONFLICT',
        message: 'Superadmins cannot change their own role from this screen.',
      },
    });
  });
});

describe('admin user status management', () => {
  it('allows a superadmin to disable another active user', async () => {
    const disableUser = vi.fn().mockResolvedValue(undefined);

    const result = await updateAdminUserStatusUseCase(
      {
        actorUserId: 'superadmin_1',
        targetUserId: 'user_1',
        action: 'disable',
        reason: 'abuse',
      },
      Promise.resolve({
        findUserById: async (userId) =>
          userId === 'superadmin_1'
            ? {
                id: 'superadmin_1',
                role: 'SUPERADMIN' as const,
                disabledAt: null,
              }
            : { id: 'user_1', role: 'USER' as const, disabledAt: null },
        countActiveUsersByRole: async () => 1,
        disableUser,
        reactivateUser: async () => undefined,
        clearUserLockout: async () => undefined,
      }),
    );

    expect(result).toEqual({
      ok: true,
      data: { action: 'disable' },
    });
    expect(disableUser).toHaveBeenCalledWith('user_1', {
      disabledById: 'superadmin_1',
      disabledReason: 'abuse',
    });
  });

  it('prevents disabling the last active superadmin', async () => {
    const disableUser = vi.fn().mockResolvedValue(undefined);

    const result = await updateAdminUserStatusUseCase(
      {
        actorUserId: 'superadmin_2',
        targetUserId: 'superadmin_1',
        action: 'disable',
      },
      Promise.resolve({
        findUserById: async (userId) => ({
          id: userId,
          role: 'SUPERADMIN' as const,
          disabledAt: null,
        }),
        countActiveUsersByRole: async () => 1,
        disableUser,
        reactivateUser: async () => undefined,
        clearUserLockout: async () => undefined,
      }),
    );

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'CONFLICT',
        message: 'At least one active superadmin account must remain.',
      },
    });
    expect(disableUser).not.toHaveBeenCalled();
  });

  it('clears credential lockout state', async () => {
    const clearUserLockout = vi.fn().mockResolvedValue(undefined);

    const result = await updateAdminUserStatusUseCase(
      {
        actorUserId: 'superadmin_1',
        targetUserId: 'user_1',
        action: 'clearLockout',
      },
      Promise.resolve({
        findUserById: async (userId) =>
          userId === 'superadmin_1'
            ? {
                id: 'superadmin_1',
                role: 'SUPERADMIN' as const,
                disabledAt: null,
              }
            : { id: 'user_1', role: 'USER' as const, disabledAt: null },
        countActiveUsersByRole: async () => 1,
        disableUser: async () => undefined,
        reactivateUser: async () => undefined,
        clearUserLockout,
      }),
    );

    expect(result).toEqual({
      ok: true,
      data: { action: 'clearLockout' },
    });
    expect(clearUserLockout).toHaveBeenCalledWith('user_1');
  });
});
