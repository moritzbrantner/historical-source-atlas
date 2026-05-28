import * as z from 'zod';

import {
  createGroupUseCase,
  getGroupsPageDataUseCase,
  type GroupError,
} from '@/src/domain/groups/use-cases';
import { problem, ProblemError } from '@/src/http/errors';
import { createApiRoute } from '@/src/http/route';

const createGroupBodySchema = z.object({
  name: z.string().min(1),
  description: z.string().max(500).optional().nullable(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).optional().nullable(),
});

function mapGroupProblem(error: GroupError, type = '/problems/groups') {
  const status =
    error.code === 'NOT_FOUND'
      ? 404
      : error.code === 'FORBIDDEN'
        ? 403
        : error.code === 'CONFLICT'
          ? 409
          : 400;
  return new ProblemError(
    problem(type, 'Unable to update groups', status, error.message),
  );
}

export const GET = createApiRoute({
  action: 'groups.list',
  featureKey: 'groups',
  auth: true,
  async handler({ actorId, session }) {
    const result = await getGroupsPageDataUseCase(actorId!, session!.user.role);

    if (!result.ok) {
      throw mapGroupProblem(result.error);
    }

    return {
      ok: true,
      ...result.data,
    };
  },
});

export const POST = createApiRoute({
  action: 'groups.create',
  featureKey: 'groups',
  auth: true,
  bodySchema: createGroupBodySchema,
  async handler({ actorId, body }) {
    const result = await createGroupUseCase(actorId!, body);

    if (!result.ok) {
      throw mapGroupProblem(result.error);
    }

    return {
      ok: true,
      group: result.data,
    };
  },
});
