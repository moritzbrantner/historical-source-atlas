import * as z from 'zod';

import {
  deleteAtlasCollectionForUser,
  updateAtlasCollectionForUser,
} from '@/src/atlas/server/atlasCollections';
import { problem, ProblemError } from '@/src/http/errors';
import { createApiRoute } from '@/src/http/route';

type CollectionErrorCode = 'CONFLICT' | 'NOT_FOUND' | 'VALIDATION_ERROR';

function statusForCollectionError(code: CollectionErrorCode) {
  if (code === 'NOT_FOUND') {
    return 404;
  }

  if (code === 'CONFLICT') {
    return 409;
  }

  return 400;
}

export const PATCH = createApiRoute({
  action: 'atlas.collections.update',
  auth: true,
  bodySchema: z.object({
    isPublic: z.boolean(),
    name: z.string(),
    notes: z.string().nullable().optional(),
  }),
  async handler({ actorId, body, routeContext }) {
    const { collectionId } = await (
      routeContext as { params: Promise<{ collectionId: string }> }
    ).params;

    const result = await updateAtlasCollectionForUser({
      collectionId,
      isPublic: body.isPublic,
      name: body.name,
      notes: body.notes,
      userId: actorId!,
    });

    if (!result.ok) {
      throw new ProblemError(
        problem(
          '/problems/atlas-collections',
          'Unable to update atlas collection',
          statusForCollectionError(result.error.code),
          result.error.message,
        ),
      );
    }

    return {
      collection: result.data,
      ok: true,
    };
  },
});

export const DELETE = createApiRoute({
  action: 'atlas.collections.delete',
  auth: true,
  async handler({ actorId, routeContext }) {
    const { collectionId } = await (
      routeContext as { params: Promise<{ collectionId: string }> }
    ).params;

    const result = await deleteAtlasCollectionForUser({
      collectionId,
      userId: actorId!,
    });

    if (!result.ok) {
      throw new ProblemError(
        problem(
          '/problems/atlas-collections',
          'Unable to delete atlas collection',
          statusForCollectionError(result.error.code),
          result.error.message,
        ),
      );
    }

    return {
      id: result.data.id,
      ok: true,
    };
  },
});
