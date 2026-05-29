import {
  boolean,
  integer,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

import { users } from './legacy';

export const atlasSourceTags = pgTable(
  'AtlasSourceTag',
  {
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    sourceId: text('sourceId').notNull(),
    tag: text('tag').notNull(),
    createdAt: timestamp('createdAt', { withTimezone: false, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updatedAt', { withTimezone: false, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      columns: [table.userId, table.sourceId, table.tag],
      name: 'AtlasSourceTag_pkey',
    }),
    index('AtlasSourceTag_userId_idx').on(table.userId),
    index('AtlasSourceTag_sourceId_idx').on(table.sourceId),
    index('AtlasSourceTag_userId_sourceId_idx').on(
      table.userId,
      table.sourceId,
    ),
  ],
);

export const atlasCollections = pgTable(
  'AtlasCollection',
  {
    id: text('id').primaryKey(),
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    name: text('name').notNull(),
    tag: text('tag').notNull(),
    notes: text('notes'),
    isPublic: boolean('isPublic').notNull().default(false),
    shareSlug: text('shareSlug').notNull(),
    createdAt: timestamp('createdAt', { withTimezone: false, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updatedAt', { withTimezone: false, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('AtlasCollection_userId_tag_key').on(table.userId, table.tag),
    uniqueIndex('AtlasCollection_shareSlug_key').on(table.shareSlug),
    index('AtlasCollection_userId_idx').on(table.userId),
    index('AtlasCollection_shareSlug_idx').on(table.shareSlug),
    index('AtlasCollection_isPublic_idx').on(table.isPublic),
  ],
);

export const atlasCollectionItems = pgTable(
  'AtlasCollectionItem',
  {
    collectionId: text('collectionId')
      .notNull()
      .references(() => atlasCollections.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    sourceId: text('sourceId').notNull(),
    note: text('note'),
    sortOrder: integer('sortOrder').notNull().default(0),
    createdAt: timestamp('createdAt', { withTimezone: false, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updatedAt', { withTimezone: false, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      columns: [table.collectionId, table.sourceId],
      name: 'AtlasCollectionItem_pkey',
    }),
    index('AtlasCollectionItem_collectionId_idx').on(table.collectionId),
    index('AtlasCollectionItem_sourceId_idx').on(table.sourceId),
    index('AtlasCollectionItem_collectionId_sortOrder_idx').on(
      table.collectionId,
      table.sortOrder,
    ),
  ],
);
