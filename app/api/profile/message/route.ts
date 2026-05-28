import * as z from 'zod';

import {
  sendProfileMediaMessageUseCase,
  sendProfileMessageUseCase,
  updateProfileChatMessageUseCase,
} from '@/src/domain/profile/use-cases';
import { problem, ProblemError } from '@/src/http/errors';
import { createApiRoute } from '@/src/http/route';

const messageBodySchema = z.object({
  userId: z.string().min(1),
  message: z.string().max(500).optional().default(''),
  kind: z.enum(['text', 'poll', 'todo', 'media']).optional(),
  options: z.array(z.string()).optional(),
  items: z.array(z.string()).optional(),
  attachment: z.instanceof(File).optional(),
});

const messageUpdateBodySchema = z.object({
  messageId: z.string().min(1),
  action: z.enum(['pin', 'unpin', 'vote-poll', 'toggle-todo']),
  optionId: z.string().optional(),
  itemId: z.string().optional(),
  completed: z.boolean().optional(),
});

function mapMessageProblem(
  code: 'NOT_FOUND' | 'VALIDATION_ERROR' | 'FORBIDDEN' | 'CONFLICT',
  detail: string,
) {
  const status =
    code === 'NOT_FOUND'
      ? 404
      : code === 'FORBIDDEN'
        ? 403
        : code === 'CONFLICT'
          ? 409
          : 400;
  return new ProblemError(
    problem(
      '/problems/profile-message',
      'Unable to send profile message',
      status,
      detail,
    ),
  );
}

export const POST = createApiRoute({
  action: 'profile.message',
  featureKey: 'profiles.follow',
  auth: true,
  permission: 'profile.follow',
  bodySchema: messageBodySchema,
  async handler({ actorId, body }) {
    if (body.attachment) {
      const result = await sendProfileMediaMessageUseCase(
        actorId!,
        body.userId,
        {
          body: body.message,
          file: body.attachment,
        },
      );

      if (!result.ok) {
        throw mapMessageProblem(result.error.code, result.error.message);
      }

      return {
        ok: true,
        message: result.data.message,
      };
    }

    const result = await sendProfileMessageUseCase(actorId!, body.userId, {
      body: body.message,
      kind: body.kind,
      options: body.options,
      items: body.items,
    });

    if (!result.ok) {
      throw mapMessageProblem(result.error.code, result.error.message);
    }

    return {
      ok: true,
      message: result.data.message,
    };
  },
});

export const PATCH = createApiRoute({
  action: 'profile.messageUpdate',
  featureKey: 'profiles.follow',
  auth: true,
  permission: 'profile.follow',
  bodySchema: messageUpdateBodySchema,
  async handler({ actorId, body }) {
    const result = await updateProfileChatMessageUseCase(actorId!, body);

    if (!result.ok) {
      throw mapMessageProblem(result.error.code, result.error.message);
    }

    return {
      ok: true,
      message: result.data.message,
    };
  },
});
