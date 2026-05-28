import { describe, expect, it } from 'vitest';

import { historicalSources } from '@/src/atlas/entities/source/api/staticSourceData';

import { generateStaticParams } from './page';

describe('source detail static params', () => {
  it('generates one static route for every bundled atlas source', () => {
    expect(generateStaticParams()).toEqual(
      historicalSources.map((source) => ({ slug: source.id })),
    );
  });
});
