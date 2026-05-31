import { describe, expect, it } from 'vitest';

import type {
  EvidenceImageAsset,
  EvidenceOverlay,
} from '../../entities/evidence/model/evidenceTypes';
import {
  getVisibleManuscriptRegions,
  groupManuscriptRegionsByImageAsset,
} from './manuscriptRegions';

const imageAssets: EvidenceImageAsset[] = [
  imageAsset('page-1'),
  imageAsset('page-2'),
];

describe('manuscript region helpers', () => {
  it('returns valid regions for visible layers', () => {
    expect(
      getVisibleManuscriptRegions({
        imageAssets,
        overlays: [
          overlay('visible', 'important', 'page-1'),
          overlay('hidden', 'notes', 'page-1'),
        ],
        visibleLayerIds: new Set(['important']),
      }).map((visibleRegion) => visibleRegion.overlay.id),
    ).toEqual(['visible']);
  });

  it('ignores invalid regions and missing image assets', () => {
    expect(
      getVisibleManuscriptRegions({
        imageAssets,
        overlays: [
          overlay('valid', 'important', 'page-1'),
          overlay('outside', 'important', 'page-1', { width: 1000 }),
          overlay('missing-image', 'important', 'missing'),
        ],
        visibleLayerIds: new Set(['important']),
      }).map((visibleRegion) => visibleRegion.overlay.id),
    ).toEqual(['valid']);
  });

  it('groups visible overlay regions by image asset', () => {
    const regionsByImage = groupManuscriptRegionsByImageAsset({
      imageAssets,
      overlays: [
        overlay('first', 'important', 'page-1'),
        overlay('second', 'translation', 'page-2'),
        overlay('hidden', 'notes', 'page-2'),
      ],
      visibleLayerIds: new Set(['important', 'translation']),
    });

    expect(
      Array.from(regionsByImage.entries()).map(([imageAssetId, regions]) => [
        imageAssetId,
        regions.map((region) => region.overlay.id),
      ]),
    ).toEqual([
      ['page-1', ['first']],
      ['page-2', ['second']],
    ]);
  });
});

function imageAsset(id: string): EvidenceImageAsset {
  return {
    attribution: null,
    canvasId: `${id}-canvas`,
    height: 800,
    id,
    label: id,
    localImageUrl: `/atlas-manuscripts/source/${id}.jpg`,
    manifestId: 'manifest',
    provider: null,
    rights: null,
    sourceImageUrl: `https://example.test/${id}.jpg`,
    width: 1000,
  };
}

function overlay(
  id: string,
  layerId: EvidenceOverlay['layerId'],
  imageAssetId: string,
  regionOverrides: Partial<
    NonNullable<EvidenceOverlay['imageRegions']>[number]
  > = {},
): EvidenceOverlay {
  return {
    certainty: null,
    content: `${id} content`,
    endOffset: 5,
    id,
    imageRegions: [
      {
        coordinateSpace: 'pixel',
        height: 100,
        id: `${id}-region`,
        imageAssetId,
        width: 100,
        x: 100,
        y: 100,
        ...regionOverrides,
      },
    ],
    kind: layerId === 'translation' ? 'translation' : 'highlight',
    label: id,
    layerId,
    startOffset: 0,
    unitId: 'unit',
  };
}
