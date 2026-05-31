import type {
  EvidenceImageAsset,
  EvidenceOverlay,
  EvidenceReview,
  EvidenceTextUnit,
} from '../model/evidenceTypes';
import { evidenceOverlayLayers } from '../model/evidenceTypes';

const codexSinaiticusImages: EvidenceImageAsset[] = [
  {
    attribution: null,
    canvasId:
      'https://bl.digirati.io/images/ark:/81055/81055/man_10000000.0x000002/canvas/c/1',
    height: 4969,
    id: 'codex-sinaiticus-f-1r',
    label: 'f. 1r',
    localImageUrl: '/atlas-manuscripts/codex-sinaiticus/f-1r.jpg',
    manifestId: 'https://bl.digirati.io/iiif/ark:/81055/man_10000000.0x000001',
    provider: 'British Library',
    rights:
      'https://www.bl.uk/help/how-to-reuse-images-of-unpublished-manuscripts',
    sourceImageUrl:
      'https://bl.digirati.io/images/v3/ark:/81055/81055/man_10000000.0x000002/full/1600,/0/default.jpg',
    width: 5008,
  },
  {
    attribution: null,
    canvasId:
      'https://bl.digirati.io/images/ark:/81055/81055/man_10000000.0x000003/canvas/c/2',
    height: 4969,
    id: 'codex-sinaiticus-f-1v',
    label: 'f. 1v',
    localImageUrl: '/atlas-manuscripts/codex-sinaiticus/f-1v.jpg',
    manifestId: 'https://bl.digirati.io/iiif/ark:/81055/man_10000000.0x000001',
    provider: 'British Library',
    rights:
      'https://www.bl.uk/help/how-to-reuse-images-of-unpublished-manuscripts',
    sourceImageUrl:
      'https://bl.digirati.io/images/v3/ark:/81055/81055/man_10000000.0x000003/full/1600,/0/default.jpg',
    width: 4928,
  },
];

const folioOneRectoContent =
  'ΤΟΙΣ ΦΥΛΑΣΣΕΙΝ ΤΑΣ ΦΥΛΑΚΑΣ ΚΑΙ ΕΝ ΤΗ ΗΜΕΡΑ ΕΚΕΙΝΗ';
const folioOneVersoContent = 'ΚΑΙ ΕΙΠΕΝ ΚΥΡΙΟΣ ΠΡΟΣ ΜΩΥΣΗΝ ΕΝ ΤΗ ΕΡΗΜΩ';

export const staticManuscriptEvidenceReviews: EvidenceReview[] = [
  {
    imageAssets: codexSinaiticusImages,
    layers: evidenceOverlayLayers,
    sourceSlug: 'codex-sinaiticus',
    title: 'Codex Sinaiticus manuscript image evidence',
    units: [
      textUnit({
        content: folioOneRectoContent,
        id: 'codex-sinaiticus-f-1r-unit',
        label: 'Add MS 43725, f. 1r excerpt',
        note: 'Curated short Greek snippet for demonstrating image-linked manuscript evidence.',
        overlays: [
          overlay({
            content:
              'A visible line group in the first column, aligned to the local IIIF image region.',
            id: 'codex-sinaiticus-f-1r-line',
            imageRegions: [
              {
                coordinateSpace: 'pixel',
                height: 130,
                id: 'codex-sinaiticus-f-1r-line-region',
                imageAssetId: 'codex-sinaiticus-f-1r',
                width: 720,
                x: 470,
                y: 940,
              },
            ],
            kind: 'highlight',
            label: 'First column line group',
            layerId: 'important',
            unitContent: folioOneRectoContent,
            unitId: 'codex-sinaiticus-f-1r-unit',
            value: 'ΤΟΙΣ ΦΥΛΑΣΣΕΙΝ ΤΑΣ ΦΥΛΑΚΑΣ',
          }),
          overlay({
            content:
              'Manual demo translation: "to keep the watches / guard posts."',
            id: 'codex-sinaiticus-f-1r-translation',
            imageRegions: [
              {
                coordinateSpace: 'pixel',
                height: 120,
                id: 'codex-sinaiticus-f-1r-translation-region',
                imageAssetId: 'codex-sinaiticus-f-1r',
                width: 620,
                x: 485,
                y: 1005,
              },
            ],
            kind: 'translation',
            label: 'φυλάσσειν',
            layerId: 'translation',
            unitContent: folioOneRectoContent,
            unitId: 'codex-sinaiticus-f-1r-unit',
            value: 'ΦΥΛΑΣΣΕΙΝ',
          }),
        ],
        sequence: 1,
        unitType: 'folio excerpt',
      }),
      textUnit({
        content: folioOneVersoContent,
        id: 'codex-sinaiticus-f-1v-unit',
        label: 'Add MS 43725, f. 1v excerpt',
        note: 'Short normalized transcription and translation note for the first viewer pass.',
        overlays: [
          overlay({
            content:
              'The selected region illustrates the four-column page layout on the verso.',
            id: 'codex-sinaiticus-f-1v-layout',
            imageRegions: [
              {
                coordinateSpace: 'pixel',
                height: 1320,
                id: 'codex-sinaiticus-f-1v-layout-region',
                imageAssetId: 'codex-sinaiticus-f-1v',
                width: 640,
                x: 1320,
                y: 980,
              },
            ],
            kind: 'note',
            label: 'Verso column layout',
            layerId: 'notes',
            unitContent: folioOneVersoContent,
            unitId: 'codex-sinaiticus-f-1v-unit',
            value: 'ΚΑΙ ΕΙΠΕΝ ΚΥΡΙΟΣ',
          }),
          overlay({
            content:
              'Manual demo translation: "in the wilderness," a location phrase linked to the image.',
            id: 'codex-sinaiticus-f-1v-translation',
            imageRegions: [
              {
                coordinateSpace: 'pixel',
                height: 135,
                id: 'codex-sinaiticus-f-1v-translation-region',
                imageAssetId: 'codex-sinaiticus-f-1v',
                width: 660,
                x: 2940,
                y: 1530,
              },
            ],
            kind: 'translation',
            label: 'εν τη ερημω',
            layerId: 'translation',
            unitContent: folioOneVersoContent,
            unitId: 'codex-sinaiticus-f-1v-unit',
            value: 'ΕΝ ΤΗ ΕΡΗΜΩ',
          }),
        ],
        sequence: 2,
        unitType: 'folio excerpt',
      }),
    ],
  },
];

function textUnit({
  content,
  id,
  label,
  note,
  overlays,
  sequence,
  unitType,
}: {
  content: string;
  id: string;
  label: string;
  note: string;
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
  certainty = 'curated demo fixture',
  content,
  id,
  imageRegions,
  kind,
  label,
  layerId,
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
    throw new Error(`Static manuscript overlay text not found: ${value}`);
  }

  return {
    certainty,
    content,
    endOffset: startOffset + value.length,
    id,
    imageRegions,
    kind,
    label,
    layerId,
    startOffset,
    unitId,
  };
}
