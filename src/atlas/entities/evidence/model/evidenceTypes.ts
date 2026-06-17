import type {
  EvidenceImageAsset,
  EvidenceImageRegion,
} from './manuscriptEvidenceTypes';

export type EvidenceOverlayKind =
  | 'highlight'
  | 'translation'
  | 'note'
  | 'entity';

export type EvidenceLayerId =
  | 'important'
  | 'translation'
  | 'notes'
  | 'entities';

export type EvidenceOverlayLayer = {
  id: EvidenceLayerId;
  label: string;
  kind: EvidenceOverlayKind;
  defaultVisible: boolean;
};

export type EvidenceOverlay = {
  id: string;
  unitId: string;
  layerId: EvidenceLayerId;
  kind: EvidenceOverlayKind;
  label: string;
  content: string | null;
  startOffset: number;
  endOffset: number;
  certainty: string | null;
  imageRegions?: EvidenceImageRegion[];
  targetEntityId?: string | null;
  targetEntityLabel?: string | null;
  targetEntitySlug?: string | null;
  targetEntityType?: string | null;
};

export type EvidenceTextUnit = {
  id: string;
  label: string | null;
  sequence: number;
  unitType: string;
  content: string;
  note: string | null;
  overlays: EvidenceOverlay[];
};

export type EvidenceReview = {
  sourceSlug: string;
  title: string;
  layers: readonly EvidenceOverlayLayer[];
  units: EvidenceTextUnit[];
  imageAssets?: EvidenceImageAsset[];
};

export type { EvidenceImageAsset, EvidenceImageRegion };

export { atlasEvidenceLayerEntries as evidenceOverlayLayers } from '../../../domain/atlasTaxonomy';
