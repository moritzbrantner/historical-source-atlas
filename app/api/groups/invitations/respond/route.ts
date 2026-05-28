import * as z from 'zod';

import {
  respondToGroupInvitationUseCase,
  type GroupError,
} from '@/src/domain/groups/use-cases';
import { problem, ProblemError } from '@/src/http/errors';
import { createApiRoute } from '@/src/http/route';

const respondInvitationBodySchema = z.object({
  invitationId: z.string().min(1),
  decision: z.enum(['accept', 'decline']),
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
      '/problems/groups/invitations/respond',
      'Unable to answer group invitation',
      status,
      error.message,
    ),
  );
}

export const POST = createApiRoute({
  action: 'groups.invitationRespond',
  featureKey: 'groups',
  auth: true,
  bodySchema: respondInvitationBodySchema,
  async handler({ actorId, body }) {
    const result = await respondToGroupInvitationUseCase(
      actorId!,
      body.invitationId,
      body.decision,
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
