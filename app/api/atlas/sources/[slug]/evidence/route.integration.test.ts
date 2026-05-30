import { describe, expect, it, vi } from 'vitest';

import { evidenceOverlayLayers } from '@/src/atlas/entities/evidence/model/evidenceTypes';

const getAtlasEvidenceReviewFromDb = vi.fn(async (slug: string) => {
  if (slug === 'missing-source') {
    return null;
  }

  if (slug === 'empty-source') {
    return {
      layers: evidenceOverlayLayers,
      sourceSlug: slug,
      title: 'Empty evidence review',
      units: [],
    };
  }

  return {
    layers: evidenceOverlayLayers,
    sourceSlug: slug,
    title: 'Dead Sea Scrolls evidence review',
    units: [
      {
        content: 'The Teacher of Righteousness gathered the community.',
        id: 'unit-1',
        label: '1QS I',
        note: null,
        overlays: [
          {
            certainty: 'high',
            content: 'Sectarian leader.',
            endOffset: 30,
            id: 'overlay-1',
            kind: 'entity',
            label: 'Teacher of Righteousness',
            layerId: 'entities',
            startOffset: 4,
            targetEntityId: 'teacher',
            targetEntityLabel: 'Teacher of Righteousness',
            targetEntityType: 'agent',
            unitId: 'unit-1',
          },
        ],
        sequence: 1,
        unitType: 'line',
      },
    ],
  };
});

vi.mock('@/src/atlas/server/atlasEvidenceRepository', () => ({
  getAtlasEvidenceReviewFromDb,
}));

const route = await import('./route');

describe('atlas source evidence API route', () => {
  it('returns evidence review data for a known source', async () => {
    const response = await route.GET(new Request('http://test.local'), {
      params: Promise.resolve({ slug: 'dead-sea-scrolls' }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      sourceSlug: 'dead-sea-scrolls',
      title: 'Dead Sea Scrolls evidence review',
      units: [
        {
          id: 'unit-1',
          overlays: [
            {
              kind: 'entity',
              targetEntityLabel: 'Teacher of Righteousness',
            },
          ],
        },
      ],
    });
  });

  it('returns empty units for known sources without evidence', async () => {
    const response = await route.GET(new Request('http://test.local'), {
      params: Promise.resolve({ slug: 'empty-source' }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      sourceSlug: 'empty-source',
      units: [],
    });
  });

  it('returns 404 for an unknown source', async () => {
    const response = await route.GET(new Request('http://test.local'), {
      params: Promise.resolve({ slug: 'missing-source' }),
    });
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toEqual({ error: 'Source not found' });
  });
});
