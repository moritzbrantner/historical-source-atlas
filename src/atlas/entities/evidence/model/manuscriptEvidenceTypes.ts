export type EvidenceImageAsset = {
  id: string;
  label: string;
  localImageUrl: string;
  sourceImageUrl: string;
  manifestId: string;
  canvasId: string;
  width: number;
  height: number;
  provider: string | null;
  rights: string | null;
  attribution: string | null;
};

export type EvidenceImageRegion = {
  id: string;
  imageAssetId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  coordinateSpace: 'pixel';
};

export function isValidEvidenceImageRegion(
  region: EvidenceImageRegion,
  imageAsset: Pick<EvidenceImageAsset, 'height' | 'width'>,
) {
  return (
    region.coordinateSpace === 'pixel' &&
    isFinitePositiveNumber(imageAsset.width) &&
    isFinitePositiveNumber(imageAsset.height) &&
    Number.isFinite(region.x) &&
    Number.isFinite(region.y) &&
    Number.isFinite(region.width) &&
    Number.isFinite(region.height) &&
    region.x >= 0 &&
    region.y >= 0 &&
    region.width > 0 &&
    region.height > 0 &&
    region.x + region.width <= imageAsset.width &&
    region.y + region.height <= imageAsset.height
  );
}

function isFinitePositiveNumber(value: number) {
  return Number.isFinite(value) && value > 0;
}
