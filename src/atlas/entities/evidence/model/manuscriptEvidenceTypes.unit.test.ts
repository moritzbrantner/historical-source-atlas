import { describe, expect, it } from 'vitest';

import type {
  EvidenceImageAsset,
  EvidenceImageRegion,
} from './manuscriptEvidenceTypes';
import { isValidEvidenceImageRegion } from './manuscriptEvidenceTypes';

const imageAsset: EvidenceImageAsset = {
  attribution: 'The British Library',
  canvasId: 'canvas-1',
  height: 800,
  id: 'image-1',
  label: 'f. 1r',
  localImageUrl: '/atlas-manuscripts/codex-sinaiticus/f-1r.jpg',
  manifestId: 'manifest-1',
  provider: 'The British Library',
  rights: 'Public Domain in most countries other than the UK.',
  sourceImageUrl: 'https://example.test/iiif/image/full/1600,/0/default.jpg',
  width: 1000,
};

describe('isValidEvidenceImageRegion', () => {
  it('accepts valid pixel regions within image bounds', () => {
    expect(
      isValidEvidenceImageRegion(
        region({ height: 120, width: 160 }),
        imageAsset,
      ),
    ).toBe(true);
  });

  it('rejects negative coordinates', () => {
    expect(isValidEvidenceImageRegion(region({ x: -1 }), imageAsset)).toBe(
      false,
    );
    expect(isValidEvidenceImageRegion(region({ y: -1 }), imageAsset)).toBe(
      false,
    );
  });

  it('rejects zero-size regions', () => {
    expect(isValidEvidenceImageRegion(region({ width: 0 }), imageAsset)).toBe(
      false,
    );
    expect(isValidEvidenceImageRegion(region({ height: 0 }), imageAsset)).toBe(
      false,
    );
  });

  it('rejects regions exceeding image bounds', () => {
    expect(
      isValidEvidenceImageRegion(region({ width: 901, x: 100 }), imageAsset),
    ).toBe(false);
    expect(
      isValidEvidenceImageRegion(region({ height: 701, y: 100 }), imageAsset),
    ).toBe(false);
  });
});

function region(
  overrides: Partial<EvidenceImageRegion> = {},
): EvidenceImageRegion {
  return {
    coordinateSpace: 'pixel',
    height: 100,
    id: 'region-1',
    imageAssetId: 'image-1',
    width: 100,
    x: 100,
    y: 100,
    ...overrides,
  };
}
