import * as z from 'zod';

import {
  sendGroupMediaMessageUseCase,
  sendGroupMessageUseCase,
  updateGroupChatMessageUseCase,
  type GroupError,
} from '@/src/domain/groups/use-cases';
import { problem, ProblemError } from '@/src/http/errors';
import { createApiRoute } from '@/src/http/route';

const groupMessageBodySchema = z.object({
  groupId: z.string().min(1),
  message: z.string().max(500).optional().default(''),
  kind: z.enum(['text', 'poll', 'todo', 'media']).optional(),
  options: z.array(z.string()).optional(),
  items: z.array(z.string()).optional(),
  attachment: z.instanceof(File).optional(),
});

const groupMessageUpdateBodySchema = z.object({
  groupId: z.string().min(1),
  messageId: z.string().min(1),
  action: z.enum(['pin', 'unpin', 'vote-poll', 'toggle-todo']),
  optionId: z.string().optional(),
  itemId: z.string().optional(),
  completed: z.boolean().optional(),
});

function mapGroupMessageProblem(error: GroupError) {
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
      '/problems/groups/messages',
      'Unable to send group message',
      status,
      error.message,
    ),
  );
}

export const POST = createApiRoute({
  action: 'groups.message',
  featureKey: 'groups',
  auth: true,
  bodySchema: groupMessageBodySchema,
  async handler({ actorId, body }) {
    if (body.attachment) {
      const result = await sendGroupMediaMessageUseCase(
        actorId!,
        body.groupId,
        {
          body: body.message,
          file: body.attachment,
        },
      );

      if (!result.ok) {
        throw mapGroupMessageProblem(result.error);
      }

      return {
        ok: true,
        message: result.data.message,
      };
    }

    const result = await sendGroupMessageUseCase(actorId!, body.groupId, {
      body: body.message,
      kind: body.kind,
      options: body.options,
      items: body.items,
    });

    if (!result.ok) {
      throw mapGroupMessageProblem(result.error);
    }

    return {
      ok: true,
      message: result.data.message,
    };
  },
});

export const PATCH = createApiRoute({
  action: 'groups.messageUpdate',
  featureKey: 'groups',
  auth: true,
  bodySchema: groupMessageUpdateBodySchema,
  async handler({ actorId, body }) {
    const result = await updateGroupChatMessageUseCase(actorId!, body);

    if (!result.ok) {
      throw mapGroupMessageProblem(result.error);
    }

    return {
      ok: true,
      message: result.data.message,
    };
  },
});
