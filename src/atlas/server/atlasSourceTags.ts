import { and, asc, eq } from 'drizzle-orm';

import { getDb } from '@/src/db/client';
import { atlasSourceTags } from '@/src/db/schema';

import {
  groupAtlasSourceTags,
  isValidAtlasSourceId,
  normalizeAtlasSourceTags,
} from '../entities/source-tags/model/sourceTags';
import { syncAtlasCollectionsForSourceTags } from './atlasCollections';
import { getAtlasSourceFromDb } from './atlasSourceRepository';

export type AtlasSourceTagErrorCode = 'NOT_FOUND' | 'VALIDATION_ERROR';

export type AtlasSourceTagResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: {
        code: AtlasSourceTagErrorCode;
        message: string;
      };
    };

export async function listAtlasSourceTagsForUser(userId: string) {
  const rows = await getDb()
    .select({
      sourceId: atlasSourceTags.sourceId,
      tag: atlasSourceTags.tag,
    })
    .from(atlasSourceTags)
    .where(eq(atlasSourceTags.userId, userId))
    .orderBy(asc(atlasSourceTags.sourceId), asc(atlasSourceTags.tag));

  return groupAtlasSourceTags(rows);
}

export async function replaceAtlasSourceTagsForUser(input: {
  userId: string;
  sourceId: string;
  tags: readonly string[];
}): Promise<AtlasSourceTagResult<{ sourceId: string; tags: string[] }>> {
  if (!isValidAtlasSourceId(input.sourceId)) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Source id is invalid.',
      },
    };
  }

  const source = await getAtlasSourceFromDb(input.sourceId);

  if (!source) {
    return {
      ok: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Source was not found.',
      },
    };
  }

  const normalizedTags = normalizeAtlasSourceTags(input.tags);

  if (!normalizedTags.ok) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: normalizedTags.message,
      },
    };
  }

  const now = new Date();
  await getDb().transaction(async (tx) => {
    await tx
      .delete(atlasSourceTags)
      .where(
        and(
          eq(atlasSourceTags.userId, input.userId),
          eq(atlasSourceTags.sourceId, input.sourceId),
        ),
      );

    if (normalizedTags.tags.length === 0) {
      return;
    }

    await tx.insert(atlasSourceTags).values(
      normalizedTags.tags.map((tag) => ({
        userId: input.userId,
        sourceId: input.sourceId,
        tag,
        createdAt: now,
        updatedAt: now,
      })),
    );
  });

  await syncAtlasCollectionsForSourceTags({
    sourceId: input.sourceId,
    tags: normalizedTags.tags,
    userId: input.userId,
  });

  return {
    ok: true,
    data: {
      sourceId: input.sourceId,
      tags: normalizedTags.tags,
    },
  };
}
