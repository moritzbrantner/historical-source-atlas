import { describe, expect, it } from 'vitest';

import {
  createAtlasCollectionShareSlug,
  normalizeAtlasCollection,
  normalizeAtlasCollectionItemNote,
  normalizeAtlasCollectionItems,
} from './collections';

describe('collections', () => {
  it('normalizes collection metadata and derives the backing tag', () => {
    expect(
      normalizeAtlasCollection({
        name: '  Dead   Sea material ',
        notes: '  scrolls   and cave finds ',
      }),
    ).toEqual({
      ok: true,
      name: 'Dead Sea material',
      notes: 'scrolls and cave finds',
      tag: 'dead sea material',
    });
  });

  it('rejects invalid collection names and long item notes', () => {
    expect(normalizeAtlasCollection({ name: '<script>' })).toEqual({
      ok: false,
      message:
        'Collection names can use letters, numbers, spaces, hyphens, and underscores.',
    });

    expect(normalizeAtlasCollectionItemNote('x'.repeat(601))).toEqual({
      ok: false,
      message: 'Source notes must be 600 characters or fewer.',
    });
  });

  it('deduplicates items and assigns stable sort order', () => {
    expect(
      normalizeAtlasCollectionItems([
        { sourceId: 'dead-sea-scrolls', note: '  cave material ' },
        { sourceId: 'dead-sea-scrolls', note: 'duplicate' },
        { sourceId: 'oxyrhynchus-papyri' },
      ]),
    ).toEqual({
      ok: true,
      items: [
        {
          note: 'cave material',
          sortOrder: 0,
          sourceId: 'dead-sea-scrolls',
        },
        {
          note: null,
          sortOrder: 1,
          sourceId: 'oxyrhynchus-papyri',
        },
      ],
    });
  });

  it('creates URL-safe share slugs', () => {
    expect(createAtlasCollectionShareSlug('Greek papyri', 'abc123')).toBe(
      'greek-papyri-abc123',
    );
  });
});
