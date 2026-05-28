import { describe, expect, it } from 'vitest';

import { historicalSources } from './staticSourceData';
import { staticSourceRepository } from './staticSourceRepository';

describe('staticSourceRepository', () => {
  it('lists static atlas sources', async () => {
    await expect(staticSourceRepository.listAtlasSources()).resolves.toBe(
      historicalSources,
    );
  });

  it('returns a source by slug', async () => {
    await expect(
      staticSourceRepository.getSourceBySlug('dead-sea-scrolls'),
    ).resolves.toMatchObject({
      id: 'dead-sea-scrolls',
      label: 'Dead Sea Scrolls',
    });
  });

  it('returns null for unknown slugs', async () => {
    await expect(
      staticSourceRepository.getSourceBySlug('unknown-source'),
    ).resolves.toBeNull();
  });

  it('does not mutate or reorder static data', async () => {
    const before = historicalSources.map((source) => source.id);
    await staticSourceRepository.listAtlasSources();
    await staticSourceRepository.getSourceBySlug('rosetta-stone');

    expect(historicalSources.map((source) => source.id)).toEqual(before);
  });
});
