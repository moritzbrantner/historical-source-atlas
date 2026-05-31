import { describe, expect, it } from 'vitest';

import { generateStaticParams } from './page';

describe('atlas person route', () => {
  it('includes static person pages for GitHub Pages export', () => {
    expect(generateStaticParams()).toContainEqual({
      locale: 'en',
      slug: 'teacher-of-righteousness',
    });
  });
});
