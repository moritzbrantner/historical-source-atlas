import * as z from 'zod';

import {
  searchGroupInviteCandidatesUseCase,
  type GroupError,
} from '@/src/domain/groups/use-cases';
import { problem, ProblemError } from '@/src/http/errors';
import { createApiRoute } from '@/src/http/route';

const inviteCandidateQuerySchema = z.object({
  groupId: z.string().min(1),
  query: z.string().max(80).optional(),
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
      '/problems/groups/invite-candidates',
      'Unable to search invite candidates',
      status,
      error.message,
    ),
  );
}

export const GET = createApiRoute({
  action: 'groups.inviteCandidates',
  featureKey: 'groups',
  auth: true,
  querySchema: inviteCandidateQuerySchema,
  async handler({ actorId, query }) {
    const result = await searchGroupInviteCandidatesUseCase(
      actorId!,
      query.groupId,
      query.query ?? '',
    );

    if (!result.ok) {
      throw mapGroupProblem(result.error);
    }

    return {
      ok: true,
      users: result.data.users,
    };
  },
});
