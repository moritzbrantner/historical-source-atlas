import { describe, expect, it } from 'vitest';

import {
  buildNavigationSearchText,
  normalizeNavigationSearchText,
} from '@/src/navigation/search-index';

describe('navigation search index', () => {
  it('normalizes labels, paths, and diacritics into searchable text', () => {
    const indexedText = buildNavigationSearchText([
      'Entdecken',
      'Über uns',
      '/about',
      'ALT+A',
    ]);

    expect(indexedText).toContain('entdecken');
    expect(indexedText).toContain('uber uns');
    expect(indexedText).toContain('/about');
    expect(indexedText).toContain('alt+a');
    expect(normalizeNavigationSearchText(' über ')).toBe(' uber ');
  });
});
