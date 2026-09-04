import { describe, expect, it } from 'vitest';

import type { AtlasV1MigrationSnapshot } from '../server/atlasV1MigrationSnapshot';
import { refKey } from '../domain/v2/reference';
import { adaptAtlasV1SnapshotToV2 } from './v1ToV2Adapter';

const snapshot: AtlasV1MigrationSnapshot = {
  entities: [
    entity('catalog-entity', 'catalog_record', 'source-a', 'Source A'),
    entity('place-entity', 'place', 'rome', 'Rome'),
    entity('event-entity', 'event', 'source-a-discovery', 'Discovery'),
    entity(
      'object-entity',
      'physical_object',
      'source-a-object',
      'Source A carrier',
    ),
    entity('work-entity', 'text_work', 'work-a', 'Work A'),
    entity('witness-entity', 'text_witness', 'witness-a', 'Witness A'),
    entity('edition-entity', 'text_edition', 'edition-a', 'Edition A'),
    entity('person-entity', 'agent', 'marcus', 'Marcus'),
  ],
  catalogRecords: [
    {
      id: 'catalog-1',
      entityId: 'catalog-entity',
      kind: 'manuscript',
      displayTitle: 'Source A',
      displaySubtitle: null,
      publicSummary: 'A documentary source.',
      primaryPlaceId: 'place-1',
      primaryDateStartYear: -100,
      primaryDateEndYear: null,
      primaryDateLabel: '100 BCE',
      discoveryEventId: 'event-1',
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
    {
      catalogRecordId: 'catalog-1',
      entityId: 'work-entity',
      role: 'primary_text_work',
      sequence: 0,
    },
  ],
  places: [
    {
      id: 'place-1',
      entityId: 'place-entity',
      name: 'Rome',
      placeType: 'city',
      geometryGeoJson: null,
      modernCountry: 'Italy',
      ancientRegion: 'Latium',
      certainty: null,
    },
  ],
  events: [
    {
      id: 'event-1',
      entityId: 'event-entity',
      eventType: 'discovery',
      dateStartYear: 1947,
      dateEndYear: null,
      dateLabel: '1947',
      datePrecision: 'year',
      placeId: 'place-1',
      description: 'Discovery event.',
    },
  ],
  agents: [
    {
      id: 'agent-1',
      entityId: 'person-entity',
      agentType: 'person',
      name: 'Marcus',
      dateStartYear: null,
      dateEndYear: null,
      dateLabel: null,
      datePrecision: 'unknown',
    },
  ],
  physicalObjects: [
    {
      id: 'physical-1',
      entityId: 'object-entity',
      objectType: 'manuscript carrier',
    },
  ],
  objectParts: [],
  manuscriptUnits: [],
  inscriptions: [],
  textWorks: [
    {
      id: 'work-1',
      entityId: 'work-entity',
      canonicalTitle: 'Work A',
      workType: 'source corpus',
      languageOriginal: 'la',
      dateStartYear: null,
      dateEndYear: null,
      dateLabel: null,
      abstract: 'A textual work.',
    },
  ],
  textWitnesses: [
    {
      id: 'witness-1',
      entityId: 'witness-entity',
      textWorkId: 'work-1',
      physicalObjectId: 'physical-1',
      inscriptionId: null,
      manuscriptUnitId: null,
      siglum: 'A',
      witnessType: 'manuscript',
      dateStartYear: null,
      dateEndYear: null,
      dateLabel: null,
    },
  ],
  textEditions: [
    {
      id: 'edition-1',
      entityId: 'edition-entity',
      textWitnessId: 'witness-1',
      editionType: 'translation',
      language: 'en',
      versionLabel: 'English translation',
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
      label: 'Paragraph 1',
      sequence: 0,
      content: 'Marcus was present.',
      normalizedContent: null,
      note: null,
    },
  ],
  textAnnotations: [
    {
      id: 'annotation-1',
      textUnitId: 'unit-1',
      annotationType: 'legacy_custom_kind',
      startOffset: 0,
      endOffset: 6,
      content: 'Custom legacy annotation',
      certainty: null,
    },
  ],
  entityMentions: [
    {
      id: 'mention-1',
      textUnitId: 'unit-1',
      entityId: 'person-entity',
      mentionText: 'Marcus',
      startOffset: 0,
      endOffset: 6,
      certainty: 'probable',
      source: 'manual',
      note: null,
    },
  ],
  entityRelations: [
    {
      id: 'relation-1',
      subjectEntityId: 'person-entity',
      predicate: 'associated-with',
      objectEntityId: 'place-entity',
      objectLabel: 'Rome',
      objectUrl: null,
      certainty: 'possible',
      note: null,
      bibliographicItemId: null,
    },
  ],
  assets: [],
};

describe('v1 to v2 atlas adapter', () => {
  it('preserves source, text, historical identity, raw annotations, mentions, and qualified claims', () => {
    const result = adaptAtlasV1SnapshotToV2(snapshot);

    expect(
      result.model.documentary.map((record) => refKey(record.ref)),
    ).toEqual([
      'documentary:source:source-a',
      'documentary:source-part:source-a-object',
    ]);
    expect(result.model.historical.map((record) => refKey(record.ref))).toEqual(
      [
        'historical:person:marcus',
        'historical:place:rome',
        'historical:event:source-a-discovery',
      ],
    );
    expect(result.model.textual.map((record) => refKey(record.ref))).toEqual([
      'textual:work:work-a',
      'textual:witness:witness-a',
      'textual:edition:edition-a',
      'textual:text-unit:unit-1',
    ]);

    expect(result.model.annotations).toContainEqual(
      expect.objectContaining({
        annotationKind: 'other',
        content: 'Custom legacy annotation',
      }),
    );
    expect(result.model.observations).toContainEqual(
      expect.objectContaining({
        ref: expect.objectContaining({ id: 'mention:mention-1' }),
      }),
    );

    const mentionClaim = result.model.assertions.find(
      (assertion) => assertion.ref.id === 'mention:mention-1',
    );
    expect(mentionClaim).toMatchObject({
      predicate: 'mentions',
      provenance: { status: 'known' },
      certainty: { level: 'probable' },
    });

    const placeClaim = result.model.assertions.find(
      (assertion) => assertion.ref.id === 'catalog:catalog-1:primary-place',
    );
    expect(placeClaim).toMatchObject({
      predicate: 'associated-place',
      object: {
        kind: 'reference',
        ref: { space: 'historical', kind: 'place', id: 'rome' },
      },
      provenance: { status: 'unavailable' },
    });

    const dateClaim = result.model.assertions.find(
      (assertion) => assertion.ref.id === 'catalog:catalog-1:primary-date',
    );
    expect(dateClaim).toMatchObject({
      predicate: 'dated-to',
      validDuring: { startYear: -100, label: '100 BCE' },
    });
  });

  it('is deterministic when every legacy row collection is reversed', () => {
    const forward = adaptAtlasV1SnapshotToV2(snapshot);
    const reversed = adaptAtlasV1SnapshotToV2(reverseSnapshot(snapshot));

    expect(reversed).toEqual(forward);
  });

  it('keeps unknown dates absent and reports zero-year sentinels instead of treating them as facts', () => {
    const withZeroYear: AtlasV1MigrationSnapshot = {
      ...snapshot,
      catalogRecords: snapshot.catalogRecords.map((record) => ({
        ...record,
        primaryDateStartYear: 0,
        primaryDateEndYear: null,
        primaryDateLabel: null,
      })),
    };

    const result = adaptAtlasV1SnapshotToV2(withZeroYear);

    expect(
      result.model.assertions.some(
        (assertion) => assertion.ref.id === 'catalog:catalog-1:primary-date',
      ),
    ).toBe(false);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'legacy-zero-year',
        legacyRef: 'catalog:catalog-1:primary-date',
      }),
    );
  });

  it('diagnoses ambiguous documentary ownership instead of choosing a parent', () => {
    const secondCatalog = entity(
      'catalog-entity-2',
      'catalog_record',
      'source-b',
      'Source B',
    );
    const ambiguous: AtlasV1MigrationSnapshot = {
      ...snapshot,
      entities: [...snapshot.entities, secondCatalog],
      catalogRecords: [
        ...snapshot.catalogRecords,
        {
          ...snapshot.catalogRecords[0],
          id: 'catalog-2',
          entityId: secondCatalog.id,
          displayTitle: 'Source B',
          primaryPlaceId: null,
          primaryDateStartYear: null,
          primaryDateLabel: null,
          discoveryEventId: null,
        },
      ],
      catalogRecordLinks: [
        ...snapshot.catalogRecordLinks,
        {
          catalogRecordId: 'catalog-2',
          entityId: 'object-entity',
          role: 'primary_physical_object',
          sequence: 0,
        },
      ],
    };

    const result = adaptAtlasV1SnapshotToV2(ambiguous);

    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'ambiguous-documentary-parent',
        legacyRef: 'physical-object:physical-1',
      }),
    );
    expect(
      result.model.documentary.some(
        (record) => record.ref.id === 'source-a-object',
      ),
    ).toBe(false);
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

function reverseSnapshot(
  value: AtlasV1MigrationSnapshot,
): AtlasV1MigrationSnapshot {
  return Object.fromEntries(
    Object.entries(value).map(([key, rows]) => [key, [...rows].reverse()]),
  ) as unknown as AtlasV1MigrationSnapshot;
}
