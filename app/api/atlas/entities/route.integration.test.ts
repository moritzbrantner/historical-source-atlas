import { describe, expect, it, vi } from 'vitest';

vi.mock('@/src/atlas/server/atlasEntityRepository', async () => {
  const { staticEntityRepository } =
    await import('@/src/atlas/entities/entity/api/staticEntityRepository');

  return {
    getAtlasEntityDetailFromDb: vi.fn((slug: string) =>
      staticEntityRepository.getEntityBySlug(slug),
    ),
    getAtlasEntityLinkedSourcesBySlug: vi.fn((slug: string) =>
      staticEntityRepository.getEntityLinkedSources(slug),
    ),
    getAtlasEntityMentionsBySlug: vi.fn((slug: string) =>
      staticEntityRepository.getEntityMentions(slug),
    ),
    getAtlasEntityRelationsBySlug: vi.fn((slug: string) =>
      staticEntityRepository.getEntityRelations(slug),
    ),
    listAtlasEntitiesFromDb: vi.fn((filters) =>
      staticEntityRepository.listEntities(filters),
    ),
  };
});

const listRoute = await import('./route');
const detailRoute = await import('./[slug]/route');
const relationsRoute = await import('./[slug]/relations/route');
const mentionsRoute = await import('./[slug]/mentions/route');
const sourcesRoute = await import('./[slug]/sources/route');

describe('atlas entity API routes', () => {
  it('lists entities with filters', async () => {
    const response = await listRoute.GET(
      new Request('http://test.local/api/atlas/entities?query=teacher'),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual([
      expect.objectContaining({
        preferredLabel: 'Teacher of Righteousness',
      }),
    ]);
  });

  it('returns entity details by slug', async () => {
    const response = await detailRoute.GET(new Request('http://test.local'), {
      params: Promise.resolve({ slug: 'teacher-of-righteousness' }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      entity: {
        preferredLabel: 'Teacher of Righteousness',
        type: 'agent',
      },
      mentions: [{ mentionText: 'Teacher of Righteousness' }],
    });
  });

  it('returns relation, mention, and linked source subresources', async () => {
    const params = Promise.resolve({ slug: 'teacher-of-righteousness' });
    const [relations, mentions, sources] = await Promise.all([
      relationsRoute.GET(new Request('http://test.local'), { params }),
      mentionsRoute.GET(new Request('http://test.local'), {
        params: Promise.resolve({ slug: 'teacher-of-righteousness' }),
      }),
      sourcesRoute.GET(new Request('http://test.local'), {
        params: Promise.resolve({ slug: 'teacher-of-righteousness' }),
      }),
    ]);

    await expect(relations.json()).resolves.toMatchObject({
      outgoingRelations: [{ predicate: 'mentioned in' }],
    });
    await expect(mentions.json()).resolves.toEqual([
      expect.objectContaining({ mentionText: 'Teacher of Righteousness' }),
    ]);
    await expect(sources.json()).resolves.toEqual([
      expect.objectContaining({ slug: 'dead-sea-scrolls' }),
    ]);
  });

  it('returns 404 for missing entity details', async () => {
    const response = await detailRoute.GET(new Request('http://test.local'), {
      params: Promise.resolve({ slug: 'missing-entity' }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: 'Entity not found',
    });
  });
});
