import type { AtlasEntityDetail } from '../../../domain/entityPageModel';
import type { Entity, EntityType } from '../../../domain/dataModel';
import type { EntitySummary } from '../../../domain/entityModel';
import { staticAtlasSourceCards } from '../../../domain/atlasReadModel';
import { historicalSources } from '../../source/api/staticSourceData';
import type { HistoricalSource } from '../../source/model/sourceTypes';

const staticTimestamp = '2026-01-01T00:00:00.000Z';

function baseEntity(input: {
  description?: string | null;
  label: string;
  slug: string;
  summary?: string | null;
  type: EntityType;
}): Entity {
  return {
    createdAt: staticTimestamp,
    description: input.description ?? null,
    editorialStatus: 'published',
    id: input.slug,
    preferredLabel: input.label,
    slug: input.slug,
    summary: input.summary ?? null,
    type: input.type,
    updatedAt: staticTimestamp,
  };
}

function entitySummary(input: {
  agentKind?: string | null;
  displayCategory?: string;
  entity: Entity;
}): EntitySummary {
  return {
    displayCategory:
      input.displayCategory ??
      input.agentKind ??
      input.entity.type.replaceAll('_', ' '),
    id: input.entity.id,
    preferredLabel: input.entity.preferredLabel,
    slug: input.entity.slug,
    summary: input.entity.summary,
    type: input.entity.type,
  };
}

function sourceCard(slug: string) {
  return staticAtlasSourceCards.find((source) => source.slug === slug) ?? null;
}

function sourceCompanionDetails(source: HistoricalSource): AtlasEntityDetail[] {
  const sourceSummary = source.properties.summary;
  const catalogRecord = baseEntity({
    label: source.label,
    slug: source.id,
    summary: sourceSummary,
    type: 'catalog_record',
  });
  const place = baseEntity({
    label: source.properties.location,
    slug: `${source.id}-place`,
    summary: source.properties.region,
    type: 'place',
  });
  const discovery = baseEntity({
    description: source.properties.discoveryContext,
    label: `${source.label} discovery`,
    slug: `${source.id}-discovery`,
    summary: source.properties.discoveryContext,
    type: 'event',
  });
  const repository = baseEntity({
    label: source.properties.currentRepository,
    slug: `${source.id}-repository`,
    summary: 'Repository or repositories from the original atlas record.',
    type: 'agent',
  });
  const object = baseEntity({
    label: source.label,
    slug: `${source.id}-object`,
    summary: sourceSummary,
    type: 'physical_object',
  });
  const linkedSource = sourceCard(source.id);
  const placeTyped = {
    ...place,
    aliases: [],
    ancientRegion: source.properties.region,
    certainty: 'derived from current static atlas coordinates',
    externalIds: {},
    geometry: {
      coordinates: [source.longitude, source.latitude],
      type: 'Point' as const,
    },
    historicalGeometries: [],
    modernCountry: null,
    name: source.properties.location,
    placeKind: 'site' as const,
    type: 'place' as const,
  };

  const placeDetail: AtlasEntityDetail = {
    aliases: [],
    entity: place,
    facts: [
      { label: 'Kind', value: 'findspot' },
      { label: 'Region', value: source.properties.region },
      {
        label: 'Coordinates',
        value: `${source.latitude.toFixed(3)}, ${source.longitude.toFixed(3)}`,
      },
    ],
    incomingRelations: [],
    linkedSources: linkedSource ? [linkedSource] : [],
    mentions: [],
    outgoingRelations: [
      {
        certainty: 'static atlas',
        direction: 'outgoing',
        id: `${place.slug}-discovery`,
        note: source.properties.discoveryContext,
        objectLabel: null,
        objectUrl: null,
        predicate: 'place of discovery',
        target: entitySummary({ entity: discovery }),
      },
    ],
    typed: placeTyped,
  };

  const discoveryDetail: AtlasEntityDetail = {
    aliases: [],
    entity: discovery,
    facts: [
      { label: 'Kind', value: 'discovery' },
      { label: 'Date', value: source.properties.discovered },
      { label: 'Location', value: source.properties.location },
    ],
    incomingRelations: [],
    linkedSources: linkedSource ? [linkedSource] : [],
    mentions: [],
    outgoingRelations: [
      {
        certainty: 'static atlas',
        direction: 'outgoing',
        id: `${discovery.slug}-place`,
        note: null,
        objectLabel: null,
        objectUrl: null,
        predicate: 'occurred at',
        target: entitySummary({ entity: place, displayCategory: 'site' }),
      },
    ],
    typed: {
      ...discovery,
      agents: [],
      dateRange: {
        endYear: null,
        label: source.properties.discovered,
        precision: source.properties.discovered.includes('-')
          ? 'range'
          : 'year',
        startYear: source.properties.discoveredYear || null,
      },
      description: source.properties.discoveryContext,
      eventKind: 'discovery',
      places: [
        {
          certainty: 'static atlas',
          note: null,
          place: placeTyped,
          role: 'location',
        },
      ],
      primaryPlace: placeTyped,
      type: 'event',
    },
  };

  const repositoryDetail: AtlasEntityDetail = {
    aliases: [],
    entity: repository,
    facts: [{ label: 'Kind', value: 'repository' }],
    incomingRelations: [],
    linkedSources: linkedSource ? [linkedSource] : [],
    mentions: [],
    outgoingRelations: [],
    typed: {
      ...repository,
      agentKind: 'repository',
      aliases: [],
      dateRange: {
        endYear: null,
        label: null,
        precision: 'unknown',
        startYear: null,
      },
      externalIds: {},
      name: source.properties.currentRepository,
      type: 'agent',
    },
  };

  const objectDetail: AtlasEntityDetail = {
    aliases: [],
    entity: object,
    facts: [
      { label: 'Object type', value: source.properties.kind },
      {
        label: 'Current repository',
        value: source.properties.currentRepository,
      },
    ],
    incomingRelations: [],
    linkedSources: linkedSource ? [linkedSource] : [],
    mentions: [],
    outgoingRelations: [
      {
        certainty: 'static atlas',
        direction: 'outgoing',
        id: `${object.slug}-repository`,
        note: null,
        objectLabel: null,
        objectUrl: null,
        predicate: 'held by',
        target: entitySummary({
          displayCategory: 'repository',
          entity: repository,
        }),
      },
    ],
    typed: {
      ...object,
      conditionNote: null,
      dimensions: null,
      isComposite: ['manuscript', 'text', 'collection', 'archive'].includes(
        source.properties.kind,
      ),
      material: null,
      objectType: source.properties.kind,
      technique: null,
      type: 'physical_object',
    },
  };

  const details = [
    {
      aliases: [],
      entity: catalogRecord,
      facts: [
        { label: 'Kind', value: source.properties.kind },
        { label: 'Date', value: source.properties.period },
        { label: 'Discovery', value: source.properties.discovered },
      ],
      incomingRelations: [],
      linkedSources: linkedSource ? [linkedSource] : [],
      mentions: [],
      outgoingRelations: [
        {
          certainty: 'static atlas',
          direction: 'outgoing' as const,
          id: `${catalogRecord.slug}-place`,
          note: null,
          objectLabel: null,
          objectUrl: null,
          predicate: 'primary place',
          target: entitySummary({ entity: place, displayCategory: 'site' }),
        },
        {
          certainty: 'static atlas',
          direction: 'outgoing' as const,
          id: `${catalogRecord.slug}-object`,
          note: null,
          objectLabel: null,
          objectUrl: null,
          predicate: 'primary object',
          target: entitySummary({ entity: object }),
        },
      ],
      typed: null,
    },
    placeDetail,
    discoveryDetail,
    repositoryDetail,
    objectDetail,
  ];

  if (source.properties.kind === 'manuscript') {
    const manuscript = baseEntity({
      label: `${source.label} manuscript unit`,
      slug: `${source.id}-manuscript`,
      summary: sourceSummary,
      type: 'manuscript_unit',
    });

    details.push({
      aliases: [],
      entity: manuscript,
      facts: [
        { label: 'Carrier', value: source.label },
        { label: 'Date', value: source.properties.period },
      ],
      incomingRelations: [],
      linkedSources: linkedSource ? [linkedSource] : [],
      mentions: [],
      outgoingRelations: [
        {
          certainty: 'static atlas',
          direction: 'outgoing',
          id: `${manuscript.slug}-object`,
          note: null,
          objectLabel: null,
          objectUrl: null,
          predicate: 'part of',
          target: entitySummary({ entity: object }),
        },
      ],
      typed: {
        ...manuscript,
        folioCount: null,
        format: null,
        languageSummary: null,
        layoutNote: null,
        physicalObject: entitySummary({ entity: object }),
        quireStructure: null,
        scribalNote: null,
        scriptSummary: null,
        support: null,
        type: 'manuscript_unit',
      },
    });
  }

  if (source.properties.kind === 'text') {
    const textWork = baseEntity({
      label: source.label,
      slug: `${source.id}-text-work`,
      summary: sourceSummary,
      type: 'text_work',
    });

    details.push({
      aliases: [],
      entity: textWork,
      facts: [
        { label: 'Work type', value: 'source corpus' },
        { label: 'Date', value: source.properties.period },
      ],
      incomingRelations: [],
      linkedSources: linkedSource ? [linkedSource] : [],
      mentions: [],
      outgoingRelations: [],
      typed: {
        ...textWork,
        abstract: sourceSummary,
        canonicalTitle: source.label,
        dateRange: {
          endYear: null,
          label: source.properties.period,
          precision: 'unknown',
          startYear: source.properties.sourceYear || null,
        },
        languageOriginal: null,
        type: 'text_work',
        workType: 'source corpus',
      },
    });
  }

  if (source.properties.kind === 'inscription') {
    const inscription = baseEntity({
      label: `${source.label} inscription`,
      slug: `${source.id}-inscription`,
      summary: sourceSummary,
      type: 'inscription',
    });

    details.push({
      aliases: [],
      entity: inscription,
      facts: [{ label: 'Inscription type', value: 'inscription' }],
      incomingRelations: [],
      linkedSources: linkedSource ? [linkedSource] : [],
      mentions: [],
      outgoingRelations: [
        {
          certainty: 'static atlas',
          direction: 'outgoing',
          id: `${inscription.slug}-object`,
          note: null,
          objectLabel: null,
          objectUrl: null,
          predicate: 'inscribed on',
          target: entitySummary({ entity: object }),
        },
      ],
      typed: {
        ...inscription,
        conditionNote: null,
        inscriptionType: 'inscription',
        language: null,
        layoutNote: null,
        objectPart: null,
        physicalObject: entitySummary({ entity: object }),
        script: null,
        technique: null,
        type: 'inscription',
      },
    });
  }

  return details;
}

const deadSeaScrollsSource = sourceCard('dead-sea-scrolls');
const deadSeaScrollsManuscript = baseEntity({
  label: 'Dead Sea Scrolls manuscript unit',
  slug: 'dead-sea-scrolls-manuscript',
  summary:
    'Static manuscript unit companion for the Dead Sea Scrolls atlas source.',
  type: 'manuscript_unit',
});
const teacherEntity = baseEntity({
  label: 'Teacher of Righteousness',
  slug: 'teacher-of-righteousness',
  summary: 'A sectarian leader named in several Qumran texts.',
  type: 'agent',
});
const evidenceWorkEntity = baseEntity({
  label: 'Community Rule excerpts',
  slug: 'dead-sea-scrolls-evidence-work',
  summary:
    'Representative evidence text for reviewing Dead Sea Scrolls passages.',
  type: 'text_work',
});
const evidenceWitnessEntity = baseEntity({
  label: 'Community Rule witness',
  slug: 'dead-sea-scrolls-evidence-witness',
  summary:
    'Illustrative witness attached to the Dead Sea Scrolls atlas record.',
  type: 'text_witness',
});
const evidenceEditionEntity = baseEntity({
  label: 'Community Rule review text',
  slug: 'dead-sea-scrolls-evidence-edition',
  summary: 'Public text edition used by the evidence review panel.',
  type: 'text_edition',
});
const assetEntity = baseEntity({
  label: 'Dead Sea Scrolls public image placeholder',
  slug: 'dead-sea-scrolls-public-image',
  summary: 'Static asset metadata placeholder for GitHub Pages entity routing.',
  type: 'asset',
});

const evidenceWorkSummary = entitySummary({ entity: evidenceWorkEntity });
const evidenceWitnessSummary = entitySummary({ entity: evidenceWitnessEntity });
const evidenceEditionSummary = entitySummary({ entity: evidenceEditionEntity });

const evidenceMentions = [
  {
    certainty: 'illustrative fixture',
    edition: evidenceEditionSummary,
    endOffset: 28,
    id: 'teacher-of-righteousness-mention-static',
    mentionText: 'Teacher of Righteousness',
    note: 'A sectarian leader named in several Qumran texts.',
    source: deadSeaScrollsSource,
    startOffset: 4,
    textUnitContent:
      'The Teacher of Righteousness gathered the community in the wilderness and taught them to seek the law.',
    textUnitId: 'dead-sea-scrolls-static-unit-1',
    textUnitLabel: '1QS I, excerpt',
    textUnitSequence: 1,
    witness: evidenceWitnessSummary,
    work: evidenceWorkSummary,
  },
];

const extraStaticDetails: AtlasEntityDetail[] = [
  {
    aliases: [],
    entity: teacherEntity,
    facts: [
      { label: 'Kind', value: 'person' },
      { label: 'Date', value: '2nd-1st century BCE' },
    ],
    incomingRelations: [],
    linkedSources: deadSeaScrollsSource ? [deadSeaScrollsSource] : [],
    mentions: evidenceMentions,
    outgoingRelations: [
      {
        certainty: 'static fixture',
        direction: 'outgoing',
        id: 'teacher-community-rule',
        note: 'Named in representative Community Rule evidence text.',
        objectLabel: null,
        objectUrl: null,
        predicate: 'mentioned in',
        target: evidenceWorkSummary,
      },
    ],
    typed: {
      ...teacherEntity,
      agentKind: 'person',
      aliases: [],
      dateRange: {
        endYear: null,
        label: '2nd-1st century BCE',
        precision: 'range',
        startYear: null,
      },
      externalIds: {},
      name: 'Teacher of Righteousness',
      type: 'agent',
    },
  },
  {
    aliases: [],
    entity: evidenceWorkEntity,
    facts: [
      { label: 'Work type', value: 'rule text' },
      { label: 'Original language', value: 'Hebrew' },
      { label: 'Date', value: '1st century BCE copies' },
    ],
    incomingRelations: [
      {
        certainty: 'static fixture',
        direction: 'incoming',
        id: 'community-rule-teacher',
        note: 'Named in representative Community Rule evidence text.',
        objectLabel: null,
        objectUrl: null,
        predicate: 'mentioned in',
        target: entitySummary({
          agentKind: 'person',
          displayCategory: 'person',
          entity: teacherEntity,
        }),
      },
    ],
    linkedSources: deadSeaScrollsSource ? [deadSeaScrollsSource] : [],
    mentions: evidenceMentions,
    outgoingRelations: [],
    typed: {
      ...evidenceWorkEntity,
      abstract:
        'Short excerpts used to demonstrate read-only evidence overlays.',
      canonicalTitle: 'Community Rule excerpts',
      dateRange: {
        endYear: null,
        label: '1st century BCE copies',
        precision: 'unknown',
        startYear: null,
      },
      languageOriginal: 'Hebrew',
      type: 'text_work',
      workType: 'rule text',
    },
  },
  {
    aliases: [],
    entity: evidenceWitnessEntity,
    facts: [
      { label: 'Siglum', value: '1QS' },
      { label: 'Witness type', value: 'manuscript excerpt' },
      { label: 'Language', value: 'Hebrew' },
      { label: 'Script', value: 'Herodian' },
    ],
    incomingRelations: [],
    linkedSources: deadSeaScrollsSource ? [deadSeaScrollsSource] : [],
    mentions: evidenceMentions,
    outgoingRelations: [
      {
        certainty: 'static fixture',
        direction: 'outgoing',
        id: 'witness-work',
        note: null,
        objectLabel: null,
        objectUrl: null,
        predicate: 'witness of',
        target: evidenceWorkSummary,
      },
    ],
    typed: {
      ...evidenceWitnessEntity,
      completeness: null,
      dateRange: {
        endYear: null,
        label: '1st century BCE',
        precision: 'unknown',
        startYear: null,
      },
      language: 'Hebrew',
      script: 'Herodian',
      siglum: '1QS',
      textWork: evidenceWorkSummary,
      type: 'text_witness',
      witnessType: 'manuscript excerpt',
    },
  },
  {
    aliases: [],
    entity: evidenceEditionEntity,
    facts: [
      { label: 'Edition type', value: 'translation' },
      { label: 'Language', value: 'en' },
      { label: 'Version', value: 'Evidence fixture v1' },
    ],
    incomingRelations: [],
    linkedSources: deadSeaScrollsSource ? [deadSeaScrollsSource] : [],
    mentions: evidenceMentions,
    outgoingRelations: [
      {
        certainty: 'static fixture',
        direction: 'outgoing',
        id: 'edition-witness',
        note: null,
        objectLabel: null,
        objectUrl: null,
        predicate: 'edition of',
        target: evidenceWitnessSummary,
      },
    ],
    typed: {
      ...evidenceEditionEntity,
      editionType: 'translation',
      editorialPolicy: 'Representative English text for UI review only.',
      isPublic: true,
      language: 'en',
      script: 'Latin',
      textWitness: evidenceWitnessSummary,
      type: 'text_edition',
      versionLabel: 'Evidence fixture v1',
    },
  },
  {
    aliases: [],
    entity: assetEntity,
    facts: [
      { label: 'Asset kind', value: 'image' },
      { label: 'Visibility', value: 'public metadata placeholder' },
    ],
    incomingRelations: [],
    linkedSources: deadSeaScrollsSource ? [deadSeaScrollsSource] : [],
    mentions: [],
    outgoingRelations: [],
    typed: {
      ...assetEntity,
      assetKind: 'image',
      attribution: null,
      bucket: 'source-public',
      byteSize: null,
      contentType: 'image/jpeg',
      createdAt: staticTimestamp,
      entityId: assetEntity.id,
      externalIds: {},
      height: null,
      id: 'dead-sea-scrolls-public-image-asset',
      isPublic: true,
      license: null,
      objectKey: 'dead-sea-scrolls/public-image-placeholder.jpg',
      originalFilename: null,
      pageCount: null,
      rightsStatement: null,
      sha256: null,
      sourceUrl: null,
      type: 'asset',
      width: null,
    },
  },
];

export const staticAtlasEntityDetails: AtlasEntityDetail[] = [
  ...historicalSources.flatMap(sourceCompanionDetails),
  ...extraStaticDetails,
].map((detail) =>
  detail.entity.slug === 'dead-sea-scrolls-manuscript'
    ? {
        ...detail,
        entity: deadSeaScrollsManuscript,
      }
    : detail,
);

export const staticAtlasEntitySummaries: EntitySummary[] =
  staticAtlasEntityDetails.map((detail) =>
    entitySummary({
      agentKind:
        detail.typed?.type === 'agent' ? detail.typed.agentKind : undefined,
      displayCategory:
        detail.typed?.type === 'agent' && detail.typed.agentKind === 'person'
          ? 'person'
          : undefined,
      entity: detail.entity,
    }),
  );

export const staticAtlasEntitySlugs = staticAtlasEntityDetails.map(
  (detail) => detail.entity.slug,
);
