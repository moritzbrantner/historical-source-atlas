import { describe, expect, it } from 'vitest';

import type { AtlasV1MigrationSnapshot } from '../server/atlasV1MigrationSnapshot';
import { prepareAtlasV1SnapshotForV2 } from './strictV1ToV2Adapter';

describe('strict v1 to v2 atlas adapter preparation', () => {
  it('rejects unsupported edition kinds instead of guessing commentary', () => {
    const snapshot = emptySnapshot({
      textEditions: [
        {
          id: 'edition-1',
          entityId: 'edition-entity',
          textWitnessId: 'witness-1',
          editionType: 'machine_paraphrase',
          language: 'en',
          versionLabel: 'Machine paraphrase',
          isPublic: true,
        },
      ],
      textUnits: [
        {
          id: 'unit-1',
          textEditionId: 'edition-1',
          parentUnitId: null,
          objectPartId: null,
          unitType: 'paragraph',
          label: null,
          sequence: 0,
          content: 'Legacy content',
          normalizedContent: null,
          note: null,
        },
      ],
    });

    const prepared = prepareAtlasV1SnapshotForV2(snapshot);

    expect(prepared.snapshot.textEditions).toEqual([]);
    expect(prepared.snapshot.textUnits).toEqual([]);
    expect(prepared.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unsupported-edition-kind',
          legacyRef: 'text-edition:edition-1',
        }),
        expect.objectContaining({
          code: 'text-unit-edition-unmapped',
          legacyRef: 'text-unit:unit-1',
        }),
      ]),
    );
  });

  it('drops structurally invalid units and their evidence without dropping the raw snapshot source', () => {
    const snapshot = emptySnapshot({
      textEditions: [
        edition('edition-a', 'edition-entity-a'),
        edition('edition-b', 'edition-entity-b'),
      ],
      textUnits: [
        unit('parent-b', 'edition-b', null),
        unit('child-a', 'edition-a', 'parent-b'),
      ],
      textAnnotations: [
        {
          id: 'annotation-1',
          textUnitId: 'child-a',
          annotationType: 'note',
          startOffset: null,
          endOffset: null,
          content: 'Important note',
          certainty: null,
        },
      ],
      entityMentions: [
        {
          id: 'mention-1',
          textUnitId: 'child-a',
          entityId: 'person-1',
          mentionText: 'Marcus',
          startOffset: 0,
          endOffset: 6,
          certainty: null,
          source: 'manual',
          note: null,
        },
      ],
    });

    const prepared = prepareAtlasV1SnapshotForV2(snapshot);

    expect(snapshot.textAnnotations).toHaveLength(1);
    expect(snapshot.entityMentions).toHaveLength(1);
    expect(prepared.snapshot.textUnits.map((row) => row.id)).toEqual([
      'parent-b',
    ]);
    expect(prepared.snapshot.textAnnotations).toEqual([]);
    expect(prepared.snapshot.entityMentions).toEqual([]);
    expect(prepared.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-text-unit-ancestry',
          legacyRef: 'text-unit:child-a',
        }),
        expect.objectContaining({
          code: 'annotation-target-unmapped',
          legacyRef: 'text-annotation:annotation-1',
        }),
        expect.objectContaining({
          code: 'mention-target-unmapped',
          legacyRef: 'entity-mention:mention-1',
        }),
      ]),
    );
  });

  it('rejects cyclic text-unit ancestry deterministically', () => {
    const snapshot = emptySnapshot({
      textEditions: [edition('edition-a', 'edition-entity-a')],
      textUnits: [
        unit('unit-a', 'edition-a', 'unit-b'),
        unit('unit-b', 'edition-a', 'unit-a'),
      ],
    });

    const forward = prepareAtlasV1SnapshotForV2(snapshot);
    const reversed = prepareAtlasV1SnapshotForV2({
      ...snapshot,
      textUnits: [...snapshot.textUnits].reverse(),
    });

    expect(forward.snapshot.textUnits).toEqual([]);
    expect(reversed.snapshot.textUnits).toEqual([]);
    expect(reversed.diagnostics).toEqual(forward.diagnostics);
  });
});

function edition(id: string, entityId: string) {
  return {
    id,
    entityId,
    textWitnessId: 'witness-1',
    editionType: 'translation',
    language: 'en',
    versionLabel: null,
    isPublic: true,
  };
}

function unit(id: string, textEditionId: string, parentUnitId: string | null) {
  return {
    id,
    textEditionId,
    parentUnitId,
    objectPartId: null,
    unitType: 'paragraph',
    label: null,
    sequence: 0,
    content: null,
    normalizedContent: null,
    note: null,
  };
}

function emptySnapshot(
  overrides: Partial<AtlasV1MigrationSnapshot> = {},
): AtlasV1MigrationSnapshot {
  return {
    entities: [],
    catalogRecords: [],
    catalogRecordLinks: [],
    places: [],
    events: [],
    agents: [],
    physicalObjects: [],
    objectParts: [],
    manuscriptUnits: [],
    inscriptions: [],
    textWorks: [],
    textWitnesses: [],
    textEditions: [],
    textUnits: [],
    textAnnotations: [],
    entityMentions: [],
    entityRelations: [],
    assets: [],
    ...overrides,
  };
}
