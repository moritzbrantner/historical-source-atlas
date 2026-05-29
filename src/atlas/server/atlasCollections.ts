import { and, asc, eq, inArray, not, sql } from 'drizzle-orm';

import {
  createAtlasCollectionShareSlug,
  type AtlasCollection,
  type AtlasCollectionItem,
  normalizeAtlasCollection,
  normalizeAtlasCollectionItemNote,
  normalizeAtlasCollectionItems,
} from '@/src/atlas/entities/collections/model/collections';
import {
  isValidAtlasSourceId,
  normalizeAtlasSourceTags,
} from '@/src/atlas/entities/source-tags/model/sourceTags';
import { getDb } from '@/src/db/client';
import {
  atlasCollectionItems,
  atlasCollections,
  atlasSourceTags,
  users,
} from '@/src/db/schema';

import { getAtlasSourceFromDb } from './atlasSourceRepository';

export type AtlasCollectionErrorCode =
  | 'CONFLICT'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR';

export type AtlasCollectionResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: {
        code: AtlasCollectionErrorCode;
        message: string;
      };
    };

type AtlasCollectionRow = {
  id: string;
  isPublic: boolean;
  name: string;
  notes: string | null;
  shareSlug: string;
  tag: string;
};

type AtlasCollectionItemRow = {
  collectionId: string;
  note: string | null;
  sortOrder: number;
  sourceId: string;
};

export type PublicAtlasCollection = AtlasCollection & {
  owner: {
    name: string | null;
    tag: string;
  };
};

function mapCollections(
  rows: readonly AtlasCollectionRow[],
  itemRows: readonly AtlasCollectionItemRow[],
): AtlasCollection[] {
  const itemsByCollectionId = new Map<string, AtlasCollectionItem[]>();

  for (const item of itemRows) {
    const items = itemsByCollectionId.get(item.collectionId) ?? [];
    items.push({
      note: item.note,
      sortOrder: item.sortOrder,
      sourceId: item.sourceId,
    });
    itemsByCollectionId.set(item.collectionId, items);
  }

  return rows.map((row) => ({
    id: row.id,
    isPublic: row.isPublic,
    items: itemsByCollectionId.get(row.id) ?? [],
    name: row.name,
    notes: row.notes,
    shareSlug: row.shareSlug,
    tag: row.tag,
  }));
}

async function readCollectionsForUser(userId: string) {
  return getDb()
    .select({
      id: atlasCollections.id,
      isPublic: atlasCollections.isPublic,
      name: atlasCollections.name,
      notes: atlasCollections.notes,
      shareSlug: atlasCollections.shareSlug,
      tag: atlasCollections.tag,
    })
    .from(atlasCollections)
    .where(eq(atlasCollections.userId, userId))
    .orderBy(asc(atlasCollections.name));
}

async function readItemsForCollectionIds(collectionIds: readonly string[]) {
  if (collectionIds.length === 0) {
    return [];
  }

  return getDb()
    .select({
      collectionId: atlasCollectionItems.collectionId,
      note: atlasCollectionItems.note,
      sortOrder: atlasCollectionItems.sortOrder,
      sourceId: atlasCollectionItems.sourceId,
    })
    .from(atlasCollectionItems)
    .where(inArray(atlasCollectionItems.collectionId, [...collectionIds]))
    .orderBy(
      asc(atlasCollectionItems.collectionId),
      asc(atlasCollectionItems.sortOrder),
      asc(atlasCollectionItems.sourceId),
    );
}

async function readCollectionForUser(collectionId: string, userId: string) {
  const [collection] = await getDb()
    .select({
      id: atlasCollections.id,
      isPublic: atlasCollections.isPublic,
      name: atlasCollections.name,
      notes: atlasCollections.notes,
      shareSlug: atlasCollections.shareSlug,
      tag: atlasCollections.tag,
    })
    .from(atlasCollections)
    .where(
      and(
        eq(atlasCollections.id, collectionId),
        eq(atlasCollections.userId, userId),
      ),
    )
    .limit(1);

  return collection ?? null;
}

async function getNextSortOrder(collectionId: string) {
  const [row] = await getDb()
    .select({
      nextSortOrder: sql<number>`coalesce(max(${atlasCollectionItems.sortOrder}), -1) + 1`,
    })
    .from(atlasCollectionItems)
    .where(eq(atlasCollectionItems.collectionId, collectionId));

  return row?.nextSortOrder ?? 0;
}

async function validateSourceIds(sourceIds: readonly string[]) {
  for (const sourceId of sourceIds) {
    if (!isValidAtlasSourceId(sourceId)) {
      return {
        ok: false as const,
        message: 'Source id is invalid.',
      };
    }

    const source = await getAtlasSourceFromDb(sourceId);

    if (!source) {
      return {
        ok: false as const,
        message: 'Source was not found.',
      };
    }
  }

  return { ok: true as const };
}

async function createUniqueShareSlug(name: string) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const shareSlug = createAtlasCollectionShareSlug(
      name,
      crypto.randomUUID().slice(0, 8),
    );
    const [existing] = await getDb()
      .select({ id: atlasCollections.id })
      .from(atlasCollections)
      .where(eq(atlasCollections.shareSlug, shareSlug))
      .limit(1);

    if (!existing) {
      return shareSlug;
    }
  }

  return createAtlasCollectionShareSlug(name, crypto.randomUUID());
}

export async function listAtlasCollectionsForUser(userId: string) {
  const rows = await readCollectionsForUser(userId);
  const itemRows = await readItemsForCollectionIds(rows.map((row) => row.id));

  return mapCollections(rows, itemRows);
}

export async function createAtlasCollectionForUser(input: {
  isPublic?: boolean;
  name: string;
  notes?: string | null;
  userId: string;
}): Promise<AtlasCollectionResult<AtlasCollection>> {
  const normalized = normalizeAtlasCollection(input);

  if (!normalized.ok) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: normalized.message,
      },
    };
  }

  const [existing] = await getDb()
    .select({ id: atlasCollections.id })
    .from(atlasCollections)
    .where(
      and(
        eq(atlasCollections.userId, input.userId),
        eq(atlasCollections.tag, normalized.tag),
      ),
    )
    .limit(1);

  if (existing) {
    return {
      ok: false,
      error: {
        code: 'CONFLICT',
        message: 'A collection with this name already exists.',
      },
    };
  }

  const id = crypto.randomUUID();
  const now = new Date();
  const shareSlug = await createUniqueShareSlug(normalized.name);
  const taggedSourceRows = await getDb()
    .select({ sourceId: atlasSourceTags.sourceId })
    .from(atlasSourceTags)
    .where(
      and(
        eq(atlasSourceTags.userId, input.userId),
        eq(atlasSourceTags.tag, normalized.tag),
      ),
    )
    .orderBy(asc(atlasSourceTags.sourceId));

  await getDb().transaction(async (tx) => {
    await tx.insert(atlasCollections).values({
      createdAt: now,
      id,
      isPublic: input.isPublic ?? false,
      name: normalized.name,
      notes: normalized.notes,
      shareSlug,
      tag: normalized.tag,
      updatedAt: now,
      userId: input.userId,
    });

    if (taggedSourceRows.length > 0) {
      await tx.insert(atlasCollectionItems).values(
        taggedSourceRows.map((row, index) => ({
          collectionId: id,
          createdAt: now,
          note: null,
          sortOrder: index,
          sourceId: row.sourceId,
          updatedAt: now,
        })),
      );
    }
  });

  const collections = await listAtlasCollectionsForUser(input.userId);
  const collection = collections.find((item) => item.id === id);

  if (!collection) {
    return {
      ok: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Collection was not found after creation.',
      },
    };
  }

  return { ok: true, data: collection };
}

export async function updateAtlasCollectionForUser(input: {
  collectionId: string;
  isPublic: boolean;
  name: string;
  notes?: string | null;
  userId: string;
}): Promise<AtlasCollectionResult<AtlasCollection>> {
  const collection = await readCollectionForUser(
    input.collectionId,
    input.userId,
  );

  if (!collection) {
    return {
      ok: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Collection was not found.',
      },
    };
  }

  const normalized = normalizeAtlasCollection(input);

  if (!normalized.ok) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: normalized.message,
      },
    };
  }

  const [conflictingCollection] = await getDb()
    .select({ id: atlasCollections.id })
    .from(atlasCollections)
    .where(
      and(
        eq(atlasCollections.userId, input.userId),
        eq(atlasCollections.tag, normalized.tag),
        not(eq(atlasCollections.id, input.collectionId)),
      ),
    )
    .limit(1);

  if (conflictingCollection) {
    return {
      ok: false,
      error: {
        code: 'CONFLICT',
        message: 'A collection with this name already exists.',
      },
    };
  }

  const itemRows = await readItemsForCollectionIds([input.collectionId]);
  const itemSourceIds = itemRows.map((item) => item.sourceId);
  const now = new Date();

  await getDb().transaction(async (tx) => {
    await tx
      .update(atlasCollections)
      .set({
        isPublic: input.isPublic,
        name: normalized.name,
        notes: normalized.notes,
        tag: normalized.tag,
        updatedAt: now,
      })
      .where(
        and(
          eq(atlasCollections.id, input.collectionId),
          eq(atlasCollections.userId, input.userId),
        ),
      );

    if (collection.tag !== normalized.tag && itemSourceIds.length > 0) {
      await tx
        .delete(atlasSourceTags)
        .where(
          and(
            eq(atlasSourceTags.userId, input.userId),
            eq(atlasSourceTags.tag, collection.tag),
            inArray(atlasSourceTags.sourceId, itemSourceIds),
          ),
        );

      await tx
        .insert(atlasSourceTags)
        .values(
          itemSourceIds.map((sourceId) => ({
            createdAt: now,
            sourceId,
            tag: normalized.tag,
            updatedAt: now,
            userId: input.userId,
          })),
        )
        .onConflictDoNothing();
    }
  });

  const collections = await listAtlasCollectionsForUser(input.userId);
  const updated = collections.find((item) => item.id === input.collectionId);

  return updated
    ? { ok: true, data: updated }
    : {
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Collection was not found.',
        },
      };
}

export async function deleteAtlasCollectionForUser(input: {
  collectionId: string;
  userId: string;
}): Promise<AtlasCollectionResult<{ id: string }>> {
  const collection = await readCollectionForUser(
    input.collectionId,
    input.userId,
  );

  if (!collection) {
    return {
      ok: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Collection was not found.',
      },
    };
  }

  await getDb()
    .delete(atlasCollections)
    .where(
      and(
        eq(atlasCollections.id, input.collectionId),
        eq(atlasCollections.userId, input.userId),
      ),
    );

  return { ok: true, data: { id: input.collectionId } };
}

export async function addAtlasCollectionItemForUser(input: {
  collectionId: string;
  note?: string | null;
  sourceId: string;
  userId: string;
}): Promise<AtlasCollectionResult<AtlasCollection>> {
  const collection = await readCollectionForUser(
    input.collectionId,
    input.userId,
  );

  if (!collection) {
    return {
      ok: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Collection was not found.',
      },
    };
  }

  const sourceValidation = await validateSourceIds([input.sourceId]);

  if (!sourceValidation.ok) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: sourceValidation.message,
      },
    };
  }

  const note = normalizeAtlasCollectionItemNote(input.note);

  if (!note.ok) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: note.message,
      },
    };
  }

  const sortOrder = await getNextSortOrder(input.collectionId);
  const now = new Date();

  await getDb().transaction(async (tx) => {
    await tx
      .insert(atlasCollectionItems)
      .values({
        collectionId: input.collectionId,
        createdAt: now,
        note: note.note,
        sortOrder,
        sourceId: input.sourceId,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          atlasCollectionItems.collectionId,
          atlasCollectionItems.sourceId,
        ],
        set: {
          note: note.note,
          updatedAt: now,
        },
      });

    await tx
      .insert(atlasSourceTags)
      .values({
        createdAt: now,
        sourceId: input.sourceId,
        tag: collection.tag,
        updatedAt: now,
        userId: input.userId,
      })
      .onConflictDoNothing();
  });

  const collections = await listAtlasCollectionsForUser(input.userId);
  const updated = collections.find((item) => item.id === input.collectionId);

  return updated
    ? { ok: true, data: updated }
    : {
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Collection was not found.',
        },
      };
}

export async function replaceAtlasCollectionItemsForUser(input: {
  collectionId: string;
  items: readonly { note?: string | null; sourceId: string }[];
  userId: string;
}): Promise<AtlasCollectionResult<AtlasCollection>> {
  const collection = await readCollectionForUser(
    input.collectionId,
    input.userId,
  );

  if (!collection) {
    return {
      ok: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Collection was not found.',
      },
    };
  }

  const normalizedItems = normalizeAtlasCollectionItems(input.items);

  if (!normalizedItems.ok) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: normalizedItems.message,
      },
    };
  }

  const sourceValidation = await validateSourceIds(
    normalizedItems.items.map((item) => item.sourceId),
  );

  if (!sourceValidation.ok) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: sourceValidation.message,
      },
    };
  }

  const previousItems = await readItemsForCollectionIds([input.collectionId]);
  const nextSourceIds = normalizedItems.items.map((item) => item.sourceId);
  const removedSourceIds = previousItems
    .map((item) => item.sourceId)
    .filter((sourceId) => !nextSourceIds.includes(sourceId));
  const now = new Date();

  await getDb().transaction(async (tx) => {
    await tx
      .delete(atlasCollectionItems)
      .where(eq(atlasCollectionItems.collectionId, input.collectionId));

    if (normalizedItems.items.length > 0) {
      await tx.insert(atlasCollectionItems).values(
        normalizedItems.items.map((item) => ({
          collectionId: input.collectionId,
          createdAt: now,
          note: item.note,
          sortOrder: item.sortOrder,
          sourceId: item.sourceId,
          updatedAt: now,
        })),
      );

      await tx
        .insert(atlasSourceTags)
        .values(
          normalizedItems.items.map((item) => ({
            createdAt: now,
            sourceId: item.sourceId,
            tag: collection.tag,
            updatedAt: now,
            userId: input.userId,
          })),
        )
        .onConflictDoNothing();
    }

    if (removedSourceIds.length > 0) {
      await tx
        .delete(atlasSourceTags)
        .where(
          and(
            eq(atlasSourceTags.userId, input.userId),
            eq(atlasSourceTags.tag, collection.tag),
            inArray(atlasSourceTags.sourceId, removedSourceIds),
          ),
        );
    }
  });

  const collections = await listAtlasCollectionsForUser(input.userId);
  const updated = collections.find((item) => item.id === input.collectionId);

  return updated
    ? { ok: true, data: updated }
    : {
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Collection was not found.',
        },
      };
}

export async function syncAtlasCollectionsForSourceTags(input: {
  sourceId: string;
  tags: readonly string[];
  userId: string;
}) {
  const normalizedTags = normalizeAtlasSourceTags(input.tags);

  if (!normalizedTags.ok) {
    return;
  }

  const collections = await readCollectionsForUser(input.userId);
  const matchingCollections = collections.filter((collection) =>
    normalizedTags.tags.includes(collection.tag),
  );
  const removedCollections = collections.filter(
    (collection) => !normalizedTags.tags.includes(collection.tag),
  );

  const now = new Date();
  await getDb().transaction(async (tx) => {
    for (const collection of matchingCollections) {
      const [row] = await tx
        .select({
          nextSortOrder: sql<number>`coalesce(max(${atlasCollectionItems.sortOrder}), -1) + 1`,
        })
        .from(atlasCollectionItems)
        .where(eq(atlasCollectionItems.collectionId, collection.id));

      await tx
        .insert(atlasCollectionItems)
        .values({
          collectionId: collection.id,
          createdAt: now,
          note: null,
          sortOrder: row?.nextSortOrder ?? 0,
          sourceId: input.sourceId,
          updatedAt: now,
        })
        .onConflictDoNothing();
    }

    if (removedCollections.length > 0) {
      await tx.delete(atlasCollectionItems).where(
        and(
          eq(atlasCollectionItems.sourceId, input.sourceId),
          inArray(
            atlasCollectionItems.collectionId,
            removedCollections.map((collection) => collection.id),
          ),
        ),
      );
    }
  });
}

export async function getPublicAtlasCollectionByShareSlug(
  shareSlug: string,
): Promise<PublicAtlasCollection | null> {
  const [row] = await getDb()
    .select({
      id: atlasCollections.id,
      isPublic: atlasCollections.isPublic,
      name: atlasCollections.name,
      notes: atlasCollections.notes,
      ownerName: users.name,
      ownerTag: users.tag,
      shareSlug: atlasCollections.shareSlug,
      tag: atlasCollections.tag,
    })
    .from(atlasCollections)
    .innerJoin(users, eq(users.id, atlasCollections.userId))
    .where(
      and(
        eq(atlasCollections.shareSlug, shareSlug),
        eq(atlasCollections.isPublic, true),
      ),
    )
    .limit(1);

  if (!row) {
    return null;
  }

  const itemRows = await readItemsForCollectionIds([row.id]);

  return {
    id: row.id,
    isPublic: row.isPublic,
    items: itemRows.map((item) => ({
      note: item.note,
      sortOrder: item.sortOrder,
      sourceId: item.sourceId,
    })),
    name: row.name,
    notes: row.notes,
    owner: {
      name: row.ownerName,
      tag: row.ownerTag,
    },
    shareSlug: row.shareSlug,
    tag: row.tag,
  };
}
