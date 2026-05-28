import * as z from 'zod';

import { updateAdminUserStatusUseCase } from '@/src/domain/admin-users/use-cases';
import { createApiRoute } from '@/src/http/route';
import { problem, ProblemError } from '@/src/http/errors';

const statusBodySchema = z.object({
  action: z.enum(['disable', 'reactivate', 'clearLockout']),
  reason: z.string().max(500).optional(),
});

function mapStatusManagementProblem(
  code: 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT' | 'VALIDATION_ERROR',
  detail: string,
) {
  const status =
    code === 'FORBIDDEN'
      ? 403
      : code === 'NOT_FOUND'
        ? 404
        : code === 'VALIDATION_ERROR'
          ? 400
          : 409;

  return new ProblemError(
    problem(
      '/problems/admin-user-status',
      'Unable to update user status',
      status,
      detail,
    ),
  );
}

const patchRoute = createApiRoute({
  action: 'admin.users.updateStatus',
  featureKey: 'admin.users',
  auth: true,
  permission: 'admin.users.manageStatus',
  bodySchema: statusBodySchema,
  async handler({ actorId, body, request }) {
    const pathnameParts = new URL(request.url).pathname.split('/');
    const userId = pathnameParts[pathnameParts.length - 2] ?? '';
    const result = await updateAdminUserStatusUseCase({
      actorUserId: actorId!,
      targetUserId: userId,
      action: body.action,
      reason: body.reason,
    });

    if (!result.ok) {
      throw mapStatusManagementProblem(result.error.code, result.error.message);
    }

    return {
      ok: true,
      action: result.data.action,
    };
  },
});

export const PATCH = patchRoute;
