import { describe, expect, it } from 'vitest';

import {
  groupAtlasSourceTags,
  isValidAtlasSourceId,
  normalizeAtlasSourceTagInput,
  normalizeAtlasSourceTags,
  parseAtlasSourceTagInput,
} from './sourceTags';

describe('sourceTags', () => {
  it('normalizes and deduplicates source tags', () => {
    expect(
      normalizeAtlasSourceTags([' #Important ', 'important', 'To Read']),
    ).toEqual({
      ok: true,
      tags: ['important', 'to read'],
    });
  });

  it('rejects invalid tag characters and excessive tag counts', () => {
    expect(normalizeAtlasSourceTags(['<script>'])).toEqual({
      ok: false,
      message:
        'Tags can use letters, numbers, spaces, hyphens, and underscores.',
    });

    expect(
      normalizeAtlasSourceTags(
        Array.from({ length: 11 }, (_, index) => `tag-${index}`),
      ),
    ).toEqual({
      ok: false,
      message: 'Use 10 tags or fewer per object.',
    });
  });

  it('parses comma-separated form input', () => {
    expect(parseAtlasSourceTagInput('read, compare later, , greek')).toEqual([
      'read',
      'compare later',
      'greek',
    ]);
  });

  it('groups rows by source id', () => {
    expect(
      groupAtlasSourceTags([
        { sourceId: 'alpha', tag: 'read' },
        { sourceId: 'alpha', tag: 'important' },
        { sourceId: 'beta', tag: 'compare' },
      ]),
    ).toEqual([
      { sourceId: 'alpha', tags: ['read', 'important'] },
      { sourceId: 'beta', tags: ['compare'] },
    ]);
  });

  it('validates atlas source ids', () => {
    expect(isValidAtlasSourceId('dead-sea-scrolls')).toBe(true);
    expect(isValidAtlasSourceId('../dead-sea-scrolls')).toBe(false);
  });

  it('normalizes a single tag input', () => {
    expect(normalizeAtlasSourceTagInput('  #Compare   Later ')).toBe(
      'compare later',
    );
  });
});
