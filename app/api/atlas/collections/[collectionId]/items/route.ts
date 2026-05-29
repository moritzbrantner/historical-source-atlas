import * as z from 'zod';

import {
  addAtlasCollectionItemForUser,
  replaceAtlasCollectionItemsForUser,
} from '@/src/atlas/server/atlasCollections';
import { problem, ProblemError } from '@/src/http/errors';
import { createApiRoute } from '@/src/http/route';

type CollectionErrorCode = 'CONFLICT' | 'NOT_FOUND' | 'VALIDATION_ERROR';

function statusForCollectionError(code: CollectionErrorCode) {
  return code === 'NOT_FOUND' ? 404 : code === 'CONFLICT' ? 409 : 400;
}

export const POST = createApiRoute({
  action: 'atlas.collections.items.add',
  auth: true,
  bodySchema: z.object({
    note: z.string().nullable().optional(),
    sourceId: z.string(),
  }),
  async handler({ actorId, body, routeContext }) {
    const { collectionId } = await (
      routeContext as { params: Promise<{ collectionId: string }> }
    ).params;

    const result = await addAtlasCollectionItemForUser({
      collectionId,
      note: body.note,
      sourceId: body.sourceId,
      userId: actorId!,
    });

    if (!result.ok) {
      throw new ProblemError(
        problem(
          '/problems/atlas-collection-items',
          'Unable to update atlas collection items',
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

export const PUT = createApiRoute({
  action: 'atlas.collections.items.replace',
  auth: true,
  bodySchema: z.object({
    items: z.array(
      z.object({
        note: z.string().nullable().optional(),
        sourceId: z.string(),
      }),
    ),
  }),
  async handler({ actorId, body, routeContext }) {
    const { collectionId } = await (
      routeContext as { params: Promise<{ collectionId: string }> }
    ).params;

    const result = await replaceAtlasCollectionItemsForUser({
      collectionId,
      items: body.items,
      userId: actorId!,
    });

    if (!result.ok) {
      throw new ProblemError(
        problem(
          '/problems/atlas-collection-items',
          'Unable to update atlas collection items',
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
