import { describe, expect, it } from 'vitest';

import type { AtlasV1MigrationSnapshot } from '../server/atlasV1MigrationSnapshot';
import { collectPreservedUnmappedDiagnostics } from './strictV1ToV2Adapter';

describe('preserved v1 migration diagnostics', () => {
  it('reports geometry and text content that remain only in the raw snapshot', () => {
    const snapshot = emptySnapshot({
      places: [
        {
          id: 'place-1',
          entityId: 'place-entity',
          name: 'Rome',
          placeType: 'city',
          geometryGeoJson: { type: 'Point', coordinates: [12.5, 41.9] },
          modernCountry: 'Italy',
          ancientRegion: 'Latium',
          certainty: 'legacy estimate',
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
          content: 'Raw text',
          normalizedContent: 'raw text',
          note: 'Legacy note',
        },
      ],
    });

    expect(collectPreservedUnmappedDiagnostics(snapshot)).toEqual([
      expect.objectContaining({
        code: 'place-geometry-unmapped',
        legacyRef: 'place:place-1',
      }),
      expect.objectContaining({
        code: 'text-unit-content-unmapped',
        legacyRef: 'text-unit:unit-1',
      }),
    ]);
  });
});

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
