import type {
  EvidenceLayerId,
  EvidenceOverlay,
} from '../../entities/evidence/model/evidenceTypes';

export type EvidenceTextSegment = {
  endOffset: number;
  id: string;
  overlays: EvidenceOverlay[];
  primaryOverlay: EvidenceOverlay | null;
  startOffset: number;
  text: string;
};

const overlayPriority: Record<EvidenceLayerId, number> = {
  translation: 4,
  important: 3,
  entities: 2,
  notes: 1,
};

export function buildEvidenceTextSegments({
  activeLayerIds,
  content,
  overlays,
}: {
  activeLayerIds: Set<EvidenceLayerId>;
  content: string;
  overlays: EvidenceOverlay[];
}): EvidenceTextSegment[] {
  const activeOverlays = overlays.filter(
    (overlay) =>
      activeLayerIds.has(overlay.layerId) &&
      isValidOverlay(overlay, content.length),
  );
  const boundaries = new Set([0, content.length]);

  activeOverlays.forEach((overlay) => {
    boundaries.add(overlay.startOffset);
    boundaries.add(overlay.endOffset);
  });

  const sortedBoundaries = Array.from(boundaries).sort((a, b) => a - b);

  return sortedBoundaries
    .flatMap((startOffset, index): EvidenceTextSegment[] => {
      const endOffset = sortedBoundaries[index + 1];

      if (endOffset === undefined || startOffset >= endOffset) {
        return [];
      }

      const segmentOverlays = activeOverlays.filter(
        (overlay) =>
          overlay.startOffset < endOffset && overlay.endOffset > startOffset,
      );

      return [
        {
          endOffset,
          id: `${startOffset}-${endOffset}`,
          overlays: segmentOverlays,
          primaryOverlay: selectPrimaryOverlay(segmentOverlays),
          startOffset,
          text: content.slice(startOffset, endOffset),
        },
      ];
    })
    .filter((segment) => segment.text.length > 0);
}

function isValidOverlay(overlay: EvidenceOverlay, contentLength: number) {
  return (
    overlay.startOffset >= 0 &&
    overlay.endOffset >= 0 &&
    overlay.startOffset < overlay.endOffset &&
    overlay.endOffset <= contentLength
  );
}

function selectPrimaryOverlay(overlays: EvidenceOverlay[]) {
  return (
    [...overlays].sort(
      (first, second) =>
        overlayPriority[second.layerId] - overlayPriority[first.layerId],
    )[0] ?? null
  );
}
