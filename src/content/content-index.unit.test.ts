import { describe, expect, it } from 'vitest';

import {
  getAdjacentEntries,
  listBlogPosts,
  listChangelogEntries,
} from '@/src/content/index';

describe('content index', () => {
  it('loads localized MDX entries', async () => {
    const posts = await listBlogPosts('en');

    expect(posts.map((post) => post.slug)).toEqual([
      'hybrid-sites',
      'template-launch',
    ]);
  });

  it.each(['fr', 'es'] as const)('loads %s blog entries', async (locale) => {
    const posts = await listBlogPosts(locale);

    expect(posts.map((post) => post.slug)).toEqual([
      'hybrid-sites',
      'template-launch',
    ]);
  });

  it.each(['fr', 'es'] as const)(
    'loads %s changelog entries',
    async (locale) => {
      const entries = await listChangelogEntries(locale);

      expect(entries.map((entry) => entry.slug)).toEqual([
        'foundation-hardening',
      ]);
    },
  );

  it('resolves adjacent entries in reverse chronological order', async () => {
    const adjacent = await getAdjacentEntries('blog', 'en', 'template-launch');

    expect(adjacent.previous).toBeNull();
    expect(adjacent.next?.slug).toBe('hybrid-sites');
  });
});
