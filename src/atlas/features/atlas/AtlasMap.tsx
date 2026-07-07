'use client';

import dynamic from 'next/dynamic';

import type {
  EntityOverlayBounds,
  EntityOverlayLayerState,
  EntityOverlayResult,
} from '../../domain/entityOverlayModel';
import type { HistoricalSource } from '../../entities/source/model/sourceTypes';
import type {
  SourceReferenceDirection,
  SourceReferenceFlow,
} from '../../entities/source/lib/sourceReferences';

export { SourcePopup } from './SourcePopup';

export type AtlasMapProps = {
  entityOverlayLayers: EntityOverlayLayerState;
  entityOverlays: EntityOverlayResult | null;
  entityOverlaysError: string | null;
  entityOverlaysLoading: boolean;
  flows: SourceReferenceFlow[];
  onEntityOverlayLayersChange: (layers: EntityOverlayLayerState) => void;
  onViewportBoundsChange: (bounds: EntityOverlayBounds) => void;
  onSelectSource: (sourceId: string) => void;
  referenceDirectionFilters: SourceReferenceDirection[];
  selectedSourceId: string | null;
  sourceTagsBySourceId: ReadonlyMap<string, readonly string[]>;
  sources: HistoricalSource[];
};

const DynamicAtlasMapClient = dynamic(
  () => import('./AtlasMapClient').then((module) => module.AtlasMapClient),
  {
    ssr: false,
    loading: () => (
      <div
        className="source-map-panel min-h-[620px] min-w-0 overflow-hidden rounded-lg border border-slate-300 bg-slate-200 shadow-xl shadow-slate-900/10"
        aria-label="Map of historical source discovery locations"
      />
    ),
  },
);

export function AtlasMap(props: AtlasMapProps) {
  return <DynamicAtlasMapClient {...props} />;
}
