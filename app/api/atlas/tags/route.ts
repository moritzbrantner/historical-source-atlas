import * as z from 'zod';

import {
  listAtlasSourceTagsForUser,
  replaceAtlasSourceTagsForUser,
} from '@/src/atlas/server/atlasSourceTags';
import { maxAtlasSourceTagsPerObject } from '@/src/atlas/entities/source-tags/model/sourceTags';
import { problem, ProblemError } from '@/src/http/errors';
import { createApiRoute } from '@/src/http/route';

export const GET = createApiRoute({
  action: 'atlas.tags.list',
  async handler({ actorId }) {
    if (!actorId) {
      return {
        authenticated: false,
        tags: [],
      };
    }

    return {
      authenticated: true,
      tags: await listAtlasSourceTagsForUser(actorId),
    };
  },
});

export const PUT = createApiRoute({
  action: 'atlas.tags.replace',
  auth: true,
  bodySchema: z.object({
    sourceId: z.string(),
    tags: z.array(z.string()).max(maxAtlasSourceTagsPerObject),
  }),
  async handler({ actorId, body }) {
    const result = await replaceAtlasSourceTagsForUser({
      userId: actorId!,
      sourceId: body.sourceId,
      tags: body.tags,
    });

    if (!result.ok) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : 400;

      throw new ProblemError(
        problem(
          '/problems/atlas-tags',
          'Unable to update atlas tags',
          status,
          result.error.message,
        ),
      );
    }

    return {
      ok: true,
      sourceId: result.data.sourceId,
      tags: result.data.tags,
    };
  },
});
