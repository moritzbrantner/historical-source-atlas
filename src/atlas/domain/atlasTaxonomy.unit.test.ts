import { describe, expect, it } from 'vitest';

import type { RecordKind } from './dataModel';
import {
  atlasEvidenceLayerEntries,
  atlasSourceKindEntries,
  formatAtlasCategory,
  getEntityDisplayCategory,
  getEntityRouteType,
  getSourceKindEntry,
} from './atlasTaxonomy';

describe('atlasTaxonomy', () => {
  it('includes all current source kind entries', () => {
    const sourceKinds: RecordKind[] = [
      'archive',
      'artifact',
      'collection',
      'inscription',
      'manuscript',
      'text',
    ];

    expect(Object.keys(atlasSourceKindEntries).sort()).toEqual(
      [...sourceKinds].sort(),
    );
  });

  it('preserves existing source labels and colors', () => {
    expect(atlasSourceKindEntries).toMatchObject({
      archive: { color: '#6d28d9', label: 'Archive' },
      artifact: { color: '#b45309', label: 'Artifact' },
      collection: { color: '#be123c', label: 'Collection' },
      inscription: { color: '#475569', label: 'Inscription' },
      manuscript: { color: '#0f766e', label: 'Manuscript' },
      text: { color: '#1d4ed8', label: 'Text' },
    });
  });

  it('falls back for unknown source kinds', () => {
    expect(getSourceKindEntry('ritual-tablet')).toMatchObject({
      color: '#64748b',
      id: 'ritual-tablet',
      label: 'Ritual Tablet',
      order: 999,
    });
  });

  it.each([
    [{ type: 'agent' as const, agentKind: 'person' }, 'persons'],
    [{ type: 'agent' as const, agentKind: 'repository' }, 'agents'],
    [{ type: 'place' as const }, 'locations'],
    [{ type: 'event' as const }, 'events'],
    [{ type: 'text_work' as const }, 'texts'],
    [{ type: 'text_witness' as const }, 'texts'],
    [{ type: 'text_edition' as const }, 'texts'],
    [{ type: 'manuscript_unit' as const }, 'manuscripts'],
    [{ type: 'inscription' as const }, 'inscriptions'],
    [{ type: 'physical_object' as const }, 'objects'],
    [{ type: 'object_part' as const }, 'objects'],
    [{ type: 'asset' as const }, 'assets'],
    [{ type: 'catalog_record' as const }, 'entities'],
    [{ type: 'unknown_entity' }, 'entities'],
  ])('maps %o to route category %s', (entity, routeType) => {
    expect(getEntityRouteType(entity)).toBe(routeType);
  });

  it('derives entity display categories', () => {
    expect(
      getEntityDisplayCategory({ agentKind: 'person', type: 'agent' }).label,
    ).toBe('Person');
    expect(
      getEntityDisplayCategory({ placeKind: 'ancient_site', type: 'place' })
        .label,
    ).toBe('Ancient Site');
    expect(
      getEntityDisplayCategory({ eventKind: 'foundation', type: 'event' })
        .label,
    ).toBe('Foundation');
  });

  it('gracefully formats unknown display categories', () => {
    expect(getEntityDisplayCategory({ type: 'ritual-tablet' })).toMatchObject({
      id: 'ritual-tablet',
      label: 'Ritual Tablet',
      order: 999,
    });
    expect(formatAtlasCategory('text_witness')).toBe('Text Witness');
  });

  it('preserves evidence layer metadata', () => {
    expect(atlasEvidenceLayerEntries).toEqual([
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
    ]);
  });
});
