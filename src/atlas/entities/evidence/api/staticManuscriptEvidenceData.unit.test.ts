import { describe, expect, it } from 'vitest';

import { isValidEvidenceImageRegion } from '../model/manuscriptEvidenceTypes';
import { staticManuscriptEvidenceReviews } from './staticManuscriptEvidenceData';

describe('staticManuscriptEvidenceReviews', () => {
  it('includes a codex-sinaiticus review with local IIIF image assets', () => {
    const review = staticManuscriptEvidenceReviews.find(
      (candidate) => candidate.sourceSlug === 'codex-sinaiticus',
    );

    expect(review).toBeDefined();
    expect(review?.imageAssets).toHaveLength(2);
    expect(review?.imageAssets?.[0]?.localImageUrl).toBe(
      '/atlas-manuscripts/codex-sinaiticus/f-1r.jpg',
    );
  });

  it('keeps all curated regions inside their image canvas bounds', () => {
    const review = staticManuscriptEvidenceReviews[0]!;
    const imageAssetsById = new Map(
      review.imageAssets?.map((imageAsset) => [imageAsset.id, imageAsset]),
    );

    for (const unit of review.units) {
      for (const overlay of unit.overlays) {
        for (const region of overlay.imageRegions ?? []) {
          const imageAsset = imageAssetsById.get(region.imageAssetId);

          expect(imageAsset).toBeDefined();
          expect(
            imageAsset ? isValidEvidenceImageRegion(region, imageAsset) : false,
          ).toBe(true);
        }
      }
    }
  });
});
