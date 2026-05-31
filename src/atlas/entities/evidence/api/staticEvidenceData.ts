import type {
  EvidenceOverlay,
  EvidenceReview,
  EvidenceTextUnit,
} from '../model/evidenceTypes';
import { evidenceOverlayLayers } from '../model/evidenceTypes';
import { staticManuscriptEvidenceReviews } from './staticManuscriptEvidenceData';

const deadSeaUnitOneContent =
  'The Teacher of Righteousness gathered the community in the wilderness and taught them to seek the law.';
const deadSeaUnitTwoContent =
  'They shall separate from the habitation of unjust men and prepare the way in the desert.';

const textEvidenceReviews: EvidenceReview[] = [
  {
    layers: evidenceOverlayLayers,
    sourceSlug: 'dead-sea-scrolls',
    title: 'Community Rule evidence review',
    units: [
      textUnit({
        content: deadSeaUnitOneContent,
        id: 'dead-sea-scrolls-unit-1',
        label: '1QS I, excerpt',
        overlays: [
          overlay({
            content: 'A sectarian leader named in several Qumran texts.',
            id: 'dead-sea-scrolls-overlay-teacher',
            kind: 'entity',
            label: 'Teacher of Righteousness',
            layerId: 'entities',
            targetEntityId: 'teacher-of-righteousness',
            targetEntityLabel: 'Teacher of Righteousness',
            targetEntitySlug: 'teacher-of-righteousness',
            targetEntityType: 'agent',
            unitContent: deadSeaUnitOneContent,
            unitId: 'dead-sea-scrolls-unit-1',
            value: 'Teacher of Righteousness',
          }),
          overlay({
            content:
              'The wilderness setting connects the passage to withdrawal and communal discipline.',
            id: 'dead-sea-scrolls-overlay-wilderness',
            kind: 'highlight',
            label: 'Wilderness community',
            layerId: 'important',
            unitContent: deadSeaUnitOneContent,
            unitId: 'dead-sea-scrolls-unit-1',
            value: 'community in the wilderness',
          }),
          overlay({
            content: 'Interpretive rendering: study and obey the law.',
            id: 'dead-sea-scrolls-overlay-law-translation',
            kind: 'translation',
            label: 'seek the law',
            layerId: 'translation',
            unitContent: deadSeaUnitOneContent,
            unitId: 'dead-sea-scrolls-unit-1',
            value: 'seek the law',
          }),
        ],
        sequence: 1,
        unitType: 'line',
      }),
      textUnit({
        content: deadSeaUnitTwoContent,
        id: 'dead-sea-scrolls-unit-2',
        label: '1QS VIII, excerpt',
        overlays: [
          overlay({
            content:
              'This phrase marks social and ritual separation as a communal boundary.',
            id: 'dead-sea-scrolls-overlay-separate',
            kind: 'note',
            label: 'Separation formula',
            layerId: 'notes',
            unitContent: deadSeaUnitTwoContent,
            unitId: 'dead-sea-scrolls-unit-2',
            value: 'separate from the habitation',
          }),
          overlay({
            content:
              'Echoes the biblical preparation motif used in Qumran self-description.',
            id: 'dead-sea-scrolls-overlay-way',
            kind: 'highlight',
            label: 'Prepare the way',
            layerId: 'important',
            unitContent: deadSeaUnitTwoContent,
            unitId: 'dead-sea-scrolls-unit-2',
            value: 'prepare the way in the desert',
          }),
        ],
        note: 'Representative English text for demonstrating source review overlays.',
        sequence: 2,
        unitType: 'line',
      }),
    ],
  },
];

export const staticEvidenceReviews: EvidenceReview[] = [
  ...textEvidenceReviews,
  ...staticManuscriptEvidenceReviews,
];

function textUnit({
  content,
  id,
  label,
  note = null,
  overlays,
  sequence,
  unitType,
}: {
  content: string;
  id: string;
  label: string;
  note?: string | null;
  overlays: EvidenceOverlay[];
  sequence: number;
  unitType: string;
}): EvidenceTextUnit {
  return {
    content,
    id,
    label,
    note,
    overlays,
    sequence,
    unitType,
  };
}

function overlay({
  certainty = 'illustrative fixture',
  content,
  id,
  kind,
  label,
  layerId,
  targetEntityId,
  targetEntityLabel,
  targetEntitySlug,
  targetEntityType,
  unitContent,
  unitId,
  value,
}: Omit<EvidenceOverlay, 'certainty' | 'endOffset' | 'startOffset'> & {
  certainty?: string | null;
  unitContent: string;
  value: string;
}): EvidenceOverlay {
  const startOffset = unitContent.indexOf(value);

  if (startOffset < 0) {
    throw new Error(`Static evidence overlay text not found: ${value}`);
  }

  return {
    certainty,
    content,
    endOffset: startOffset + value.length,
    id,
    kind,
    label,
    layerId,
    startOffset,
    targetEntityId,
    targetEntityLabel,
    targetEntitySlug,
    targetEntityType,
    unitId,
  };
}
