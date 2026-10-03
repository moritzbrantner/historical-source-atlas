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
});

function entity(id: string, slug: string) {
  return {
    id,
    type: 'source',
    slug,
    preferredLabel: slug,
    summary: null,
    description: null,
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
