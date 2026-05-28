import {
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
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
