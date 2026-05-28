import * as z from 'zod';

import {
  removeGroupMemberUseCase,
  updateGroupMemberRoleUseCase,
  type GroupError,
} from '@/src/domain/groups/use-cases';
import { problem, ProblemError } from '@/src/http/errors';
import { createApiRoute } from '@/src/http/route';

const memberRoleBodySchema = z.object({
  groupId: z.string().min(1),
  userId: z.string().min(1),
  role: z.enum(['ADMIN', 'MEMBER']),
});

const removeMemberBodySchema = z.object({
  groupId: z.string().min(1),
  userId: z.string().min(1),
});

function mapGroupProblem(error: GroupError) {
  const status =
    error.code === 'NOT_FOUND'
      ? 404
      : error.code === 'FORBIDDEN'
        ? 403
        : error.code === 'CONFLICT'
          ? 409
          : 400;
  return new ProblemError(
    problem(
      '/problems/groups/members',
      'Unable to update group members',
      status,
      error.message,
    ),
  );
}

export const PATCH = createApiRoute({
  action: 'groups.memberRole',
  featureKey: 'groups',
  auth: true,
  bodySchema: memberRoleBodySchema,
  async handler({ actorId, body }) {
    const result = await updateGroupMemberRoleUseCase(
      actorId!,
      body.groupId,
      body.userId,
      body.role,
    );

    if (!result.ok) {
      throw mapGroupProblem(result.error);
    }

    return {
      ok: true,
      ...result.data,
    };
  },
});

export const DELETE = createApiRoute({
  action: 'groups.memberRemove',
  featureKey: 'groups',
  auth: true,
  bodySchema: removeMemberBodySchema,
  async handler({ actorId, body }) {
    const result = await removeGroupMemberUseCase(
      actorId!,
      body.groupId,
      body.userId,
    );

    if (!result.ok) {
      throw mapGroupProblem(result.error);
    }

    return {
      ok: true,
      ...result.data,
    };
  },
});
