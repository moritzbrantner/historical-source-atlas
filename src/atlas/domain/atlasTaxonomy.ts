import type { EntityType, RecordKind } from './dataModel';
import type { EvidenceOverlayLayer } from '../entities/evidence/model/evidenceTypes';

export type AtlasTaxonomyEntry = {
  id: string;
  label: string;
  description?: string;
  color?: string;
  order: number;
};

export type AtlasEntityRouteType =
  | 'agents'
  | 'assets'
  | 'entities'
  | 'events'
  | 'inscriptions'
  | 'locations'
  | 'manuscripts'
  | 'objects'
  | 'persons'
  | 'texts';

const neutralColor = '#64748b';
const fallbackOrder = 999;

export const atlasSourceKindEntries: Record<RecordKind, AtlasTaxonomyEntry> = {
  archive: {
    color: '#6d28d9',
    id: 'archive',
    label: 'Archive',
    order: 0,
  },
  artifact: {
    color: '#b45309',
    id: 'artifact',
    label: 'Artifact',
    order: 1,
  },
  collection: {
    color: '#be123c',
    id: 'collection',
    label: 'Collection',
    order: 2,
  },
  inscription: {
    color: '#475569',
    id: 'inscription',
    label: 'Inscription',
    order: 3,
  },
  manuscript: {
    color: '#0f766e',
    id: 'manuscript',
    label: 'Manuscript',
    order: 4,
  },
  text: {
    color: '#1d4ed8',
    id: 'text',
    label: 'Text',
    order: 5,
  },
};

const entityTypeEntries: Partial<Record<EntityType, AtlasTaxonomyEntry>> = {
  asset: {
    id: 'asset',
    label: 'Asset',
    order: 8,
  },
  catalog_record: {
    id: 'catalog_record',
    label: 'Catalog Record',
    order: 9,
  },
  inscription: {
    id: 'inscription',
    label: 'Inscription',
    order: 5,
  },
  manuscript_unit: {
    id: 'manuscript_unit',
    label: 'Manuscript Unit',
    order: 4,
  },
  object_part: {
    id: 'object_part',
    label: 'Object Part',
    order: 7,
  },
  physical_object: {
    id: 'physical_object',
    label: 'Physical Object',
    order: 6,
  },
  text_edition: {
    id: 'text_edition',
    label: 'Text Edition',
    order: 3,
  },
  text_witness: {
    id: 'text_witness',
    label: 'Text Witness',
    order: 2,
  },
  text_work: {
    id: 'text_work',
    label: 'Text Work',
    order: 1,
  },
};

export const atlasEvidenceLayerEntries: readonly EvidenceOverlayLayer[] = [
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

export function getSourceKindEntry(
  kind: RecordKind | string,
): AtlasTaxonomyEntry {
  return (
    atlasSourceKindEntries[kind as RecordKind] ??
    fallbackEntry(kind, { color: neutralColor })
  );
}

export function getEntityDisplayCategory(input: {
  type: EntityType | string;
  agentKind?: string | null;
  placeKind?: string | null;
  eventKind?: string | null;
}): AtlasTaxonomyEntry {
  if (input.type === 'agent') {
    return categoryEntry(input.agentKind ?? input.type, {
      label: input.agentKind === 'person' ? 'Person' : undefined,
      order: input.agentKind === 'person' ? 0 : 1,
    });
  }

  if (input.type === 'place') {
    return categoryEntry(input.placeKind ?? input.type, { order: 10 });
  }

  if (input.type === 'event') {
    return categoryEntry(input.eventKind ?? input.type, { order: 20 });
  }

  return (
    entityTypeEntries[input.type as EntityType] ??
    fallbackEntry(input.type, { color: neutralColor })
  );
}

export function getEntityRouteType(input: {
  type: EntityType | string;
  agentKind?: string | null;
}): AtlasEntityRouteType {
  if (input.type === 'agent') {
    return input.agentKind === 'person' ? 'persons' : 'agents';
  }

  if (input.type === 'place') {
    return 'locations';
  }

  if (input.type === 'event') {
    return 'events';
  }

  if (
    input.type === 'text_work' ||
    input.type === 'text_witness' ||
    input.type === 'text_edition'
  ) {
    return 'texts';
  }

  if (input.type === 'manuscript_unit') {
    return 'manuscripts';
  }

  if (input.type === 'inscription') {
    return 'inscriptions';
  }

  if (input.type === 'physical_object' || input.type === 'object_part') {
    return 'objects';
  }

  if (input.type === 'asset') {
    return 'assets';
  }

  return 'entities';
}

export function formatAtlasCategory(value: string): string {
  const normalized = value.trim();

  if (!normalized) {
    return 'Unknown';
  }

  return normalized
    .replaceAll(/[-_]+/g, ' ')
    .replaceAll(/\s+/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function categoryEntry(
  id: string,
  options: { label?: string; order?: number } = {},
): AtlasTaxonomyEntry {
  return {
    color: neutralColor,
    id,
    label: options.label ?? formatAtlasCategory(id),
    order: options.order ?? fallbackOrder,
  };
}

function fallbackEntry(
  id: string,
  options: { color?: string } = {},
): AtlasTaxonomyEntry {
  return {
    color: options.color ?? neutralColor,
    id,
    label: formatAtlasCategory(id),
    order: fallbackOrder,
  };
}
