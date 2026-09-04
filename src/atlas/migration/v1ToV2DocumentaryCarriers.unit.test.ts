import { describe, expect, it } from 'vitest';

import type { AtlasV1MigrationSnapshot } from '../server/atlasV1MigrationSnapshot';
import { adaptAtlasV1SnapshotToV2 } from './v1ToV2Adapter';

describe('v1 to v2 documentary carrier adaptation', () => {
  it('keeps an inscription attached to its mapped object part', () => {
    const snapshot: AtlasV1MigrationSnapshot = {
      entities: [
        entity('catalog-entity', 'catalog_record', 'source-a', 'Source A'),
        entity('object-entity', 'physical_object', 'object-a', 'Object A'),
        entity('part-entity', 'object_part', 'part-a', 'Part A'),
        entity(
          'inscription-entity',
          'inscription',
          'inscription-a',
          'Inscription A',
        ),
      ],
      catalogRecords: [
        {
          id: 'catalog-1',
          entityId: 'catalog-entity',
          kind: 'inscription',
          displayTitle: 'Source A',
          displaySubtitle: null,
          publicSummary: null,
          primaryPlaceId: null,
          primaryDateStartYear: null,
          primaryDateEndYear: null,
          primaryDateLabel: null,
          discoveryEventId: null,
          heroAssetId: null,
          published: true,
        },
      ],
      catalogRecordLinks: [
        {
          catalogRecordId: 'catalog-1',
          entityId: 'object-entity',
          role: 'primary_physical_object',
          sequence: 0,
        },
      ],
      places: [],
      events: [],
      agents: [],
      physicalObjects: [
        {
          id: 'physical-1',
          entityId: 'object-entity',
          objectType: 'tablet',
        },
      ],
      objectParts: [
        {
          id: 'part-1',
          entityId: 'part-entity',
          physicalObjectId: 'physical-1',
          parentPartId: null,
          partType: 'face',
          label: 'Front face',
          sequence: 0,
        },
      ],
      manuscriptUnits: [],
      inscriptions: [
        {
          id: 'inscription-1',
          entityId: 'inscription-entity',
          physicalObjectId: 'physical-1',
          objectPartId: 'part-1',
        },
      ],
      textWorks: [],
      textWitnesses: [],
      textEditions: [],
      textUnits: [],
      textAnnotations: [],
      entityMentions: [],
      entityRelations: [],
      assets: [],
    };

    const result = adaptAtlasV1SnapshotToV2(snapshot);
    const inscription = result.model.documentary.find(
      (record) => record.ref.id === 'inscription-a',
    );

    expect(inscription).toMatchObject({
      ref: {
        space: 'documentary',
        kind: 'source-part',
        id: 'inscription-a',
      },
      parent: {
        space: 'documentary',
        kind: 'source-part',
        id: 'part-a',
      },
    });
  });
});

function entity(
  id: string,
  type: string,
  slug: string,
  preferredLabel: string,
) {
  return {
    id,
    type,
    slug,
    preferredLabel,
    summary: null,
    description: null,
  };
}
