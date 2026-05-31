import { describe, expect, it } from 'vitest';

import { staticEntityRepository } from './staticEntityRepository';

describe('staticEntityRepository', () => {
  it('returns static entity details by slug', async () => {
    await expect(
      staticEntityRepository.getEntityBySlug('teacher-of-righteousness'),
    ).resolves.toMatchObject({
      entity: {
        preferredLabel: 'Teacher of Righteousness',
        slug: 'teacher-of-righteousness',
        type: 'agent',
      },
      linkedSources: [{ slug: 'dead-sea-scrolls' }],
    });
  });

  it('filters static entities by query, type, and kind', async () => {
    await expect(
      staticEntityRepository.listEntities({
        kind: 'person',
        query: 'teacher',
        type: 'agent',
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        preferredLabel: 'Teacher of Righteousness',
        slug: 'teacher-of-righteousness',
      }),
    ]);
  });

  it('returns null collections for missing entity slugs', async () => {
    await expect(
      staticEntityRepository.getEntityRelations('missing-entity'),
    ).resolves.toBeNull();
    await expect(
      staticEntityRepository.getEntityMentions('missing-entity'),
    ).resolves.toBeNull();
    await expect(
      staticEntityRepository.getEntityLinkedSources('missing-entity'),
    ).resolves.toBeNull();
  });
});
