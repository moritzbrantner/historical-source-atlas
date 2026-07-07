import { describe, expect, it, vi } from 'vitest';

import { createEmptyEntityOverlayResult } from '@/src/atlas/domain/entityOverlayModel';

vi.mock('@/src/atlas/server/atlasEntityOverlayRepository', () => ({
  listAtlasEntityOverlayFeaturesFromDb: vi.fn(async (filters) => ({
    ...createEmptyEntityOverlayResult(),
    points: filters.categories.includes('city')
      ? [
          {
            id: 'jerusalem',
            label: 'Jerusalem',
            latitude: 31.778,
            longitude: 35.235,
            metrics: { sourceCount: 2 },
            properties: {
              category: 'city',
              dateLabel: null,
              evidenceKind: 'undated_fallback',
              linkedSourceCount: 2,
              routePath: '/atlas/locations/jerusalem',
              slug: 'jerusalem',
              summary: null,
            },
          },
        ]
      : [],
    summary: {
      city: filters.categories.includes('city') ? 1 : 0,
      country: 0,
      person: 0,
    },
  })),
}));

const route = await import('./route');

describe('atlas entity overlay API route', () => {
  it('returns 400 for invalid params', async () => {
    const response = await route.GET(
      new Request(
        'http://test.local/api/atlas/entity-overlays?west=40&south=30&east=20&north=40&minYear=1&maxYear=2&categories=city',
      ),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Invalid entity overlay query bounds',
    });
  });

  it('returns an empty result when no categories are selected', async () => {
    const response = await route.GET(
      new Request(
        'http://test.local/api/atlas/entity-overlays?west=20&south=30&east=40&north=40&minYear=1&maxYear=2&categories=',
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      createEmptyEntityOverlayResult(),
    );
  });

  it('passes validated category and viewport filters to the repository', async () => {
    const response = await route.GET(
      new Request(
        'http://test.local/api/atlas/entity-overlays?west=20&south=30&east=40&north=40&minYear=-100&maxYear=100&categories=city',
      ),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.points).toEqual([
      expect.objectContaining({
        label: 'Jerusalem',
        properties: expect.objectContaining({
          evidenceKind: 'undated_fallback',
        }),
      }),
    ]);
  });
});
