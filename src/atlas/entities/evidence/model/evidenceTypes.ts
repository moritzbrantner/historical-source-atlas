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
  targetEntityId?: string | null;
  targetEntityLabel?: string | null;
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
  layers: EvidenceOverlayLayer[];
  units: EvidenceTextUnit[];
};

export const evidenceOverlayLayers: EvidenceOverlayLayer[] = [
  {
    defaultVisible: true,
    id: 'important',
    kind: 'highlight',
    label: 'Important passages',
  },
  {
    defaultVisible: true,
    id: 'translation',
    kind: 'translation',
    label: 'Translations',
  },
  {
    defaultVisible: true,
    id: 'entities',
    kind: 'entity',
    label: 'Entities',
  },
  {
    defaultVisible: false,
    id: 'notes',
    kind: 'note',
    label: 'Notes',
  },
];
