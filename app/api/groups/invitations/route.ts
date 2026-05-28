import * as z from 'zod';

import {
  inviteUserToGroupUseCase,
  type GroupError,
} from '@/src/domain/groups/use-cases';
import { problem, ProblemError } from '@/src/http/errors';
import { createApiRoute } from '@/src/http/route';

const createInvitationBodySchema = z.object({
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
      '/problems/groups/invitations',
      'Unable to update group invitations',
      status,
      error.message,
    ),
  );
}

export const POST = createApiRoute({
  action: 'groups.invite',
  featureKey: 'groups',
  auth: true,
  bodySchema: createInvitationBodySchema,
  async handler({ actorId, body }) {
    const result = await inviteUserToGroupUseCase(
      actorId!,
      body.groupId,
      body.userId,
    );

    if (!result.ok) {
      throw mapGroupProblem(result.error);
    }

    return {
      ok: true,
      invitation: result.data.invitation,
    };
  },
});
