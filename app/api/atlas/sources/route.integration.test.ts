import { describe, expect, it, vi } from 'vitest';

vi.mock('@/src/atlas/server/atlasSourceRepository', async () => {
  const { historicalSources } =
    await import('@/src/atlas/entities/source/api/staticSourceData');

  return {
    getAtlasSourceFromDb: vi.fn(async (slug: string) =>
      historicalSources.find((source) => source.id === slug),
    ),
    listAtlasSourcesFromDb: vi.fn(async () => historicalSources),
  };
});

const listRoute = await import('./route');
const detailRoute = await import('./[slug]/route');

describe('atlas source API routes', () => {
  it('returns the seeded atlas source DTOs', async () => {
    const response = await listRoute.GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toHaveLength(12);
    expect(payload[0]).toMatchObject({
      id: 'dead-sea-scrolls',
      label: 'Dead Sea Scrolls',
    });
  });

  it('returns Dead Sea Scrolls source details by slug', async () => {
    const response = await detailRoute.GET(new Request('http://test.local'), {
      params: Promise.resolve({ slug: 'dead-sea-scrolls' }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      id: 'dead-sea-scrolls',
      label: 'Dead Sea Scrolls',
      latitude: 31.741,
      longitude: 35.458,
      properties: {
        currentRepository:
          'Israel Museum, Shrine of the Book and other collections',
        discovered: '1947-1956',
        location: 'Qumran Caves, near the Dead Sea',
      },
    });
    expect(payload.properties.references).toHaveLength(2);
    expect(payload.properties.referencedIn).toHaveLength(2);
  });

  it('returns 404 for an unknown source slug', async () => {
    const response = await detailRoute.GET(new Request('http://test.local'), {
      params: Promise.resolve({ slug: 'missing-source' }),
    });
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toEqual({ error: 'Source not found' });
  });
});
