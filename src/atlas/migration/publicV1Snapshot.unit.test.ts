import { describe, expect, it } from 'vitest';

import type { AtlasV1MigrationSnapshot } from '../server/atlasV1MigrationSnapshot';
import { selectPublicAtlasV1Snapshot } from './publicV1Snapshot';
import { adaptAtlasV1SnapshotStrictlyToV2 } from './strictV1ToV2Adapter';
import { projectSourceDetail } from '../domain/v2/projections';
import { documentaryRef } from '../domain/v2/reference';

describe('public v1 snapshot selection', () => {
  it('drops unpublished catalog records and their links', () => {
    const snapshot = emptySnapshot({
      entities: [
        entity('entity-public', 'public-source'),
        entity('entity-draft', 'draft-source'),
      ],
      catalogRecords: [
        catalogRecord('record-public', 'entity-public', true),
        catalogRecord('record-draft', 'entity-draft', false),
      ],
      catalogRecordLinks: [
        {
          catalogRecordId: 'record-public',
          entityId: 'entity-public',
          role: 'subject',
          sequence: 0,
        },
        {
          catalogRecordId: 'record-draft',
          entityId: 'entity-draft',
          role: 'subject',
          sequence: 0,
        },
      ],
    });

    const selected = selectPublicAtlasV1Snapshot(snapshot);

    expect(selected.catalogRecords.map((record) => record.id)).toEqual([
      'record-public',
    ]);
    expect(
      selected.catalogRecordLinks.map((link) => link.catalogRecordId),
    ).toEqual(['record-public']);

    const model = adaptAtlasV1SnapshotStrictlyToV2(selected).model;
    expect(
      projectSourceDetail(model, documentaryRef('source', 'draft-source')),
    ).toBeNull();
    expect(
      projectSourceDetail(model, documentaryRef('source', 'public-source')),
    ).not.toBeNull();
  });

  it('drops non-public editions with their units, annotations, and mentions', () => {
    const snapshot = emptySnapshot({
      entities: [
        entity('entity-public', 'public-source'),
        entity('edition-public-entity', 'edition-public'),
        entity('edition-private-entity', 'edition-private'),
      ],
      textEditions: [
        edition('edition-public', true),
        edition('edition-private', false),
      ],
      textUnits: [
        unit('unit-public', 'edition-public'),
        unit('unit-private', 'edition-private'),
      ],
      textAnnotations: [
        annotation('annotation-public', 'unit-public'),
        annotation('annotation-private', 'unit-private'),
      ],
      entityMentions: [
        mention('mention-public', 'unit-public'),
        mention('mention-private', 'unit-private'),
      ],
    });

    const selected = selectPublicAtlasV1Snapshot(snapshot);

    expect(selected.textEditions.map((row) => row.id)).toEqual([
      'edition-public',
    ]);
    expect(selected.textUnits.map((row) => row.id)).toEqual(['unit-public']);
    expect(selected.textAnnotations.map((row) => row.id)).toEqual([
      'annotation-public',
    ]);
    expect(selected.entityMentions.map((row) => row.id)).toEqual([
      'mention-public',
    ]);
  });
  it('drops draft entities with their owned rows, links, and relations', () => {
    const snapshot = emptySnapshot({
      entities: [
        entity('catalog-entity', 'source-a'),
        entity('object-entity', 'object-a', 'published', 'physical_object'),
        entity('part-entity', 'draft-part', 'draft', 'object_part'),
        entity('place-entity', 'draft-place', 'draft', 'place'),
      ],
      catalogRecords: [catalogRecord('catalog-1', 'catalog-entity', true)],
      catalogRecordLinks: [
        {
          catalogRecordId: 'catalog-1',
          entityId: 'object-entity',
          role: 'primary_physical_object',
          sequence: 0,
        },
        {
          catalogRecordId: 'catalog-1',
          entityId: 'part-entity',
          role: 'object_part',
          sequence: 1,
        },
      ],
      physicalObjects: [
        { id: 'physical-1', entityId: 'object-entity', objectType: 'tablet' },
      ],
      objectParts: [
        {
          id: 'part-1',
          entityId: 'part-entity',
          physicalObjectId: 'physical-1',
          parentPartId: null,
          partType: 'face',
          label: 'Secret draft face',
          sequence: 0,
        },
      ],
      entityRelations: [
        {
          id: 'relation-1',
          subjectEntityId: 'catalog-entity',
          predicate: 'found_at',
          objectEntityId: 'place-entity',
          objectLabel: null,
          objectUrl: null,
          certainty: null,
          note: null,
          bibliographicItemId: null,
        },
      ],
    });

    const selected = selectPublicAtlasV1Snapshot(snapshot);

    expect(selected.entities.map((row) => row.id)).toEqual([
      'catalog-entity',
      'object-entity',
    ]);
    expect(selected.objectParts).toEqual([]);
    expect(selected.entityRelations).toEqual([]);
    expect(selected.catalogRecordLinks.map((link) => link.entityId)).toEqual([
      'object-entity',
    ]);

    const model = adaptAtlasV1SnapshotStrictlyToV2(selected).model;
    const projection = projectSourceDetail(
      model,
      documentaryRef('source', 'source-a'),
    );
    expect(projection).not.toBeNull();
    const serialized = JSON.stringify(projection);
    expect(serialized).not.toContain('draft-part');
    expect(serialized).not.toContain('Secret draft face');
    expect(serialized).not.toContain('draft-place');
  });
});

function entity(
  id: string,
  slug: string,
  editorialStatus = 'published',
  type = 'catalog_record',
) {
  return {
    id,
    type,
    slug,
    preferredLabel: slug,
    summary: null,
    description: null,
    editorialStatus,
  };
}

function catalogRecord(id: string, entityId: string, published: boolean) {
  return {
    id,
    entityId,
    kind: 'object',
    displayTitle: id,
    displaySubtitle: null,
    publicSummary: null,
    primaryPlaceId: null,
    primaryDateStartYear: null,
    primaryDateEndYear: null,
    primaryDateLabel: null,
    discoveryEventId: null,
    heroAssetId: null,
    published,
  };
}

function edition(id: string, isPublic: boolean) {
  return {
    id,
    entityId: `${id}-entity`,
    textWitnessId: 'witness-1',
    editionType: 'translation',
    language: 'en',
    versionLabel: null,
    isPublic,
  };
}

function unit(id: string, textEditionId: string) {
  return {
    id,
    textEditionId,
    parentUnitId: null,
    objectPartId: null,
    unitType: 'paragraph',
    label: null,
    sequence: 0,
    content: 'content',
    normalizedContent: null,
    note: null,
  };
}

function annotation(id: string, textUnitId: string) {
  return {
    id,
    textUnitId,
    annotationType: 'note',
    startOffset: null,
    endOffset: null,
    content: 'annotation',
    certainty: null,
  };
}

function mention(id: string, textUnitId: string) {
  return {
    id,
    textUnitId,
    entityId: 'entity-public',
    mentionText: 'mention',
    startOffset: null,
    endOffset: null,
    certainty: null,
    source: null,
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
