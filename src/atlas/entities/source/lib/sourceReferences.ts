import type {
  FlowMapLayerFeature,
  PointMapLayerFeature,
} from '@moritzbrantner/maps/layers';

import type { HistoricalSource } from '../model/sourceTypes';

export type HistoricalSourceFeature = PointMapLayerFeature<
  HistoricalSource['properties']
>;
export type SourceReferenceDirection = 'incoming' | 'outgoing';
export type SourceReferenceFlowProperties = {
  direction: SourceReferenceDirection;
  label: string;
  note: string;
  relation: string;
};
export type SourceReferenceFlowFeature =
  FlowMapLayerFeature<SourceReferenceFlowProperties>;
export type SourceReferenceFlow = {
  from: [longitude: number, latitude: number];
  id: string;
  label: string;
  metrics: {
    weight: number;
  };
  properties: SourceReferenceFlowProperties;
  to: [longitude: number, latitude: number];
};

const sourceReferenceLocations = new Map<
  string,
  [longitude: number, latitude: number]
>([
  ['Qumran cave inventories', [35.458, 31.741]],
  ['Biblical manuscript studies', [35.214, 31.768]],
  ['Hebrew Bible traditions', [35.214, 31.768]],
  ['Qumran community rules', [35.458, 31.741]],
  ['Decipherment histories', [2.352, 48.857]],
  ['British Museum catalogues', [-0.127, 51.519]],
  ['Ptolemy V Epiphanes', [29.919, 31.2]],
  ['Greek, Demotic, and hieroglyphic scripts', [31.236, 30.044]],
  ['Nag Hammadi codex editions', [31.236, 30.044]],
  ['Early Christian studies', [29.919, 31.2]],
  ['Gnostic revelation dialogues', [32.241, 26.052]],
  ['Platonic and biblical language', [29.919, 31.2]],
  ['Oxyrhynchus Papyri volumes', [-1.258, 51.752]],
  ['Classical and documentary papyrology', [-1.258, 51.752]],
  ['Greek literature', [23.728, 37.984]],
  ['Daily administration', [30.652, 28.535]],
  ['Derveni Papyrus editions', [22.944, 40.64]],
  ['Greek philosophy and religion', [23.728, 37.984]],
  ['Orphic poem', [22.919, 40.682]],
  ['Ritual and cosmology', [22.919, 40.682]],
  ['Tabulae Vindolandenses', [-0.127, 51.519]],
  ['Roman Britain histories', [-0.127, 51.519]],
  ['Roman frontier administration', [-2.36, 54.991]],
  ['Personal correspondence', [-2.36, 54.991]],
  ['Shipwreck excavation records', [23.307, 35.862]],
  ['History of science studies', [23.728, 37.984]],
  ['Astronomical cycles', [28.228, 36.434]],
  ['Greek month and festival calendars', [23.728, 37.984]],
  ['Cuneiform decipherment histories', [-0.127, 51.519]],
  ['Achaemenid royal inscription corpora', [52.892, 29.935]],
  ["Darius I's accession", [47.436, 34.386]],
  ['Old Persian, Elamite, and Babylonian', [48.257, 32.19]],
  ['El-Amarna tablet editions', [13.405, 52.52]],
  ['Late Bronze Age studies', [30.9, 27.65]],
  ['Near Eastern rulers', [30.9, 27.65]],
  ['Tribute, marriage, and military requests', [30.9, 27.65]],
  ['New Testament critical apparatuses', [7.625, 51.96]],
  ['Codex Sinaiticus project records', [-0.127, 51.519]],
  ['Greek Christian Bible', [33.973, 28.539]],
  ['Early Christian book production', [29.919, 31.2]],
  ['Old Babylonian law studies', [44.421, 32.536]],
  ['Louvre Near Eastern collections', [2.336, 48.861]],
  ["Hammurabi's kingship", [44.421, 32.536]],
  ['Legal cases and penalties', [44.421, 32.536]],
  ['Herculaneum papyri catalogues', [14.268, 40.852]],
  ['Epicurean philosophy studies', [23.728, 37.984]],
  ['Philodemus and Epicurean texts', [14.348, 40.806]],
  ['Roman elite library culture', [14.348, 40.806]],
]);

export function createSourceReferenceFlows(
  source: HistoricalSource,
): SourceReferenceFlow[] {
  return [
    ...source.properties.referencedIn.map((relationship, index) =>
      createSourceReferenceFlow(source, relationship, 'incoming', index),
    ),
    ...source.properties.references.map((relationship, index) =>
      createSourceReferenceFlow(source, relationship, 'outgoing', index),
    ),
  ].filter((flow): flow is SourceReferenceFlow => flow !== null);
}

export function getFeatureProperties(feature: HistoricalSourceFeature) {
  return feature.point.properties;
}

function createSourceReferenceFlow(
  source: HistoricalSource,
  relationship: HistoricalSource['properties']['references'][number],
  direction: SourceReferenceDirection,
  index: number,
): SourceReferenceFlow | null {
  const referenceCoordinates = sourceReferenceLocations.get(relationship.label);

  if (!referenceCoordinates) {
    return null;
  }

  const sourceCoordinates: [number, number] = [
    source.longitude,
    source.latitude,
  ];
  const targetCoordinates = offsetCoincidentReferenceCoordinate(
    sourceCoordinates,
    referenceCoordinates,
    direction,
    index,
  );

  return {
    from: direction === 'incoming' ? targetCoordinates : sourceCoordinates,
    id: `${source.id}-${direction}-${slugifyReferenceLabel(relationship.label)}`,
    label: relationship.label,
    metrics: {
      weight: 1,
    },
    properties: {
      direction,
      label: relationship.label,
      note: relationship.note,
      relation: relationship.relation,
    },
    to: direction === 'incoming' ? sourceCoordinates : targetCoordinates,
  };
}

function offsetCoincidentReferenceCoordinate(
  sourceCoordinates: [longitude: number, latitude: number],
  targetCoordinates: [longitude: number, latitude: number],
  direction: SourceReferenceDirection,
  index: number,
): [longitude: number, latitude: number] {
  if (
    Math.abs(sourceCoordinates[0] - targetCoordinates[0]) > 0.001 ||
    Math.abs(sourceCoordinates[1] - targetCoordinates[1]) > 0.001
  ) {
    return targetCoordinates;
  }

  const angle =
    ((index * 64 + (direction === 'incoming' ? 28 : 156)) * Math.PI) / 180;
  const distance = 0.58;

  return [
    targetCoordinates[0] + Math.cos(angle) * distance,
    targetCoordinates[1] + Math.sin(angle) * distance,
  ];
}

function slugifyReferenceLabel(label: string) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
