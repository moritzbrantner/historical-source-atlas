import type {
  EvidenceImageAsset,
  EvidenceImageRegion,
  EvidenceLayerId,
  EvidenceOverlay,
} from '../../entities/evidence/model/evidenceTypes';
import { isValidEvidenceImageRegion } from '../../entities/evidence/model/manuscriptEvidenceTypes';

export type VisibleManuscriptRegion = {
  imageAsset: EvidenceImageAsset;
  overlay: EvidenceOverlay;
  region: EvidenceImageRegion;
};

export function getVisibleManuscriptRegions({
  imageAssetId,
  imageAssets,
  overlays,
  visibleLayerIds,
}: {
  imageAssetId?: string;
  imageAssets: EvidenceImageAsset[];
  overlays: EvidenceOverlay[];
  visibleLayerIds: Set<EvidenceLayerId>;
}) {
  const imageAssetsById = new Map(
    imageAssets.map((imageAsset) => [imageAsset.id, imageAsset]),
  );
  const visibleRegions: VisibleManuscriptRegion[] = [];

  for (const overlay of overlays) {
    if (!visibleLayerIds.has(overlay.layerId)) {
      continue;
    }

    for (const region of overlay.imageRegions ?? []) {
      const imageAsset = imageAssetsById.get(region.imageAssetId);

      if (
        !imageAsset ||
        (imageAssetId && imageAsset.id !== imageAssetId) ||
        !isValidEvidenceImageRegion(region, imageAsset)
      ) {
        continue;
      }

      visibleRegions.push({
        imageAsset,
        overlay,
        region,
      });
    }
  }

  return visibleRegions;
}

export function groupManuscriptRegionsByImageAsset({
  imageAssets,
  overlays,
  visibleLayerIds,
}: {
  imageAssets: EvidenceImageAsset[];
  overlays: EvidenceOverlay[];
  visibleLayerIds: Set<EvidenceLayerId>;
}) {
  const regionsByImageAsset = new Map<string, VisibleManuscriptRegion[]>();

  for (const visibleRegion of getVisibleManuscriptRegions({
    imageAssets,
    overlays,
    visibleLayerIds,
  })) {
    const regions = regionsByImageAsset.get(visibleRegion.imageAsset.id) ?? [];
    regions.push(visibleRegion);
    regionsByImageAsset.set(visibleRegion.imageAsset.id, regions);
  }

  return regionsByImageAsset;
}
