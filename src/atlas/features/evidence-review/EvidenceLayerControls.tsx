import { Button } from '@moritzbrantner/ui';

import type {
  EvidenceLayerId,
  EvidenceOverlayLayer,
} from '../../entities/evidence/model/evidenceTypes';

export function EvidenceLayerControls({
  layers,
  onToggleLayer,
  visibleLayerIds,
}: {
  layers: readonly EvidenceOverlayLayer[];
  onToggleLayer: (layerId: EvidenceLayerId) => void;
  visibleLayerIds: Set<EvidenceLayerId>;
}) {
  return (
    <div
      aria-label="Evidence overlay layers"
      className="flex flex-wrap gap-2"
      role="group"
    >
      {layers.map((layer) => {
        const isVisible = visibleLayerIds.has(layer.id);

        return (
          <Button
            aria-pressed={isVisible}
            key={layer.id}
            onClick={() => {
              onToggleLayer(layer.id);
            }}
            size="sm"
            type="button"
            variant={isVisible ? 'secondary' : 'outline'}
          >
            {layer.label}
          </Button>
        );
      })}
    </div>
  );
}
