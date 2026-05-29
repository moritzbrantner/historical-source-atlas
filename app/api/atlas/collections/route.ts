import * as z from 'zod';

import {
  createAtlasCollectionForUser,
  listAtlasCollectionsForUser,
} from '@/src/atlas/server/atlasCollections';
import { problem, ProblemError } from '@/src/http/errors';
import { createApiRoute } from '@/src/http/route';

export const GET = createApiRoute({
  action: 'atlas.collections.list',
  async handler({ actorId }) {
    if (!actorId) {
      return {
        authenticated: false,
        collections: [],
      };
    }

    return {
      authenticated: true,
      collections: await listAtlasCollectionsForUser(actorId),
    };
  },
});

export const POST = createApiRoute({
  action: 'atlas.collections.create',
  auth: true,
  bodySchema: z.object({
    isPublic: z.boolean().optional(),
    name: z.string(),
    notes: z.string().nullable().optional(),
  }),
  async handler({ actorId, body }) {
    const result = await createAtlasCollectionForUser({
      isPublic: body.isPublic,
      name: body.name,
      notes: body.notes,
      userId: actorId!,
    });

    if (!result.ok) {
      throw new ProblemError(
        problem(
          '/problems/atlas-collections',
          'Unable to create atlas collection',
          result.error.code === 'CONFLICT' ? 409 : 400,
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
