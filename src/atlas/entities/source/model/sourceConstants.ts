import type { SourceKind } from './sourceTypes';

export const allSourceKinds: readonly SourceKind[] = [
  'archive',
  'artifact',
  'collection',
  'inscription',
  'manuscript',
  'text',
];

export const sourceKindLabels: Record<SourceKind, string> = {
  archive: 'Archive',
  artifact: 'Artifact',
  collection: 'Collection',
  inscription: 'Inscription',
  manuscript: 'Manuscript',
  text: 'Text',
};

export const sourceKindColors: Record<SourceKind, string> = {
  archive: '#6d28d9',
  artifact: '#b45309',
  collection: '#be123c',
  inscription: '#475569',
  manuscript: '#0f766e',
  text: '#1d4ed8',
};
