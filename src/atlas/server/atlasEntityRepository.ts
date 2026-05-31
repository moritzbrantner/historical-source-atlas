import { getPool } from '@/src/db/client';

import type {
  Asset,
  AtlasSourceCard,
  DatePrecision,
  DateRange,
  EditionType,
  Entity,
  EntityType,
  RecordKind,
} from '../domain/dataModel';
import type {
  AgentKind,
  EntityAlias,
  EntitySummary,
  EventKind,
  ExternalIds,
  Geometry,
  PlaceKind,
} from '../domain/entityModel';
import type {
  AtlasEntityDetail,
  AtlasEntityFact,
  AssetEntity,
  EntityMentionContext,
  EntityRelationView,
  InscriptionEntity,
  ManuscriptUnitEntity,
  ObjectPartEntity,
  PhysicalObjectEntity,
  TextEditionEntity,
  TextWitnessEntity,
  TextWorkEntity,
} from '../domain/entityPageModel';
import type { AtlasEntityFilters } from '../entities/entity/api/entityRepository';

type EntityRow = {
  created_at: string | Date;
  description: string | null;
  editorial_status: string;
  id: string;
  preferred_label: string;
  slug: string;
  summary: string | null;
  type: EntityType;
  updated_at: string | Date;
};

type EntitySummaryRow = EntityRow & {
  agent_kind: string | null;
  display_category: string;
  event_kind: string | null;
  place_kind: string | null;
};

type AliasRow = {
  id: string;
  is_primary: boolean;
  language: string | null;
  name: string;
  name_type: string;
  script: string | null;
  source_note: string | null;
};

type RelationRow = {
  certainty: string | null;
  direction: 'incoming' | 'outgoing';
  id: string;
  note: string | null;
  object_label: string | null;
  object_url: string | null;
  predicate: string;
  target_agent_kind: string | null;
  target_display_category: string | null;
  target_id: string | null;
  target_preferred_label: string | null;
  target_slug: string | null;
  target_summary: string | null;
  target_type: EntityType | null;
};

type MentionRow = {
  certainty: string | null;
  edition_id: string | null;
  edition_label: string | null;
  edition_slug: string | null;
  edition_summary: string | null;
  edition_type: EntityType | null;
  end_offset: number | null;
  id: string;
  mention_text: string;
  note: string | null;
  source_current_repository: string | null;
  source_discovery_date_label: string | null;
  source_discovery_year: number | null;
  source_hero_asset_url: string | null;
  source_id: string | null;
  source_importance: number | null;
  source_kind: RecordKind | null;
  source_label: string | null;
  source_latitude: number | string | null;
  source_location_label: string | null;
  source_longitude: number | string | null;
  source_region: string | null;
  source_slug: string | null;
  source_source_date_label: string | null;
  source_source_year: number | null;
  source_summary: string | null;
  start_offset: number | null;
  text_unit_content: string | null;
  text_unit_id: string;
  text_unit_label: string | null;
  text_unit_sequence: number;
  witness_id: string | null;
  witness_label: string | null;
  witness_slug: string | null;
  witness_summary: string | null;
  witness_type: EntityType | null;
  work_id: string | null;
  work_label: string | null;
  work_slug: string | null;
  work_summary: string | null;
  work_type: EntityType | null;
};

type SourceCardRow = {
  current_repository: string | null;
  discovery_date_label: string | null;
  discovery_year: number | null;
  hero_asset_url: string | null;
  id: string;
  importance: number;
  kind: RecordKind;
  label: string;
  latitude: number | string | null;
  location_label: string | null;
  longitude: number | string | null;
  region: string | null;
  slug: string;
  source_date_label: string | null;
  source_year: number | null;
  summary: string | null;
};

const validEntityTypes: EntityType[] = [
  'catalog_record',
  'physical_object',
  'object_part',
  'text_work',
  'text_witness',
  'text_edition',
  'inscription',
  'manuscript_unit',
  'place',
  'agent',
  'event',
  'asset',
];

export async function listAtlasEntitiesFromDb(
  filters: AtlasEntityFilters = {},
) {
  const pool = getPool();
  const values: unknown[] = [];
  const clauses = ["e.editorial_status = 'published'"];

  if (filters.type && validEntityTypes.includes(filters.type)) {
    values.push(filters.type);
    clauses.push(`e.type = $${values.length}::entity_type`);
  }

  if (filters.kind?.trim()) {
    values.push(filters.kind.trim());
    clauses.push(
      `lower(coalesce(a.agent_type, p.place_type, ev.event_type, e.type::text)) = lower($${values.length})`,
    );
  }

  if (filters.query?.trim()) {
    values.push(`%${filters.query.trim()}%`);
    clauses.push(`(
      e.preferred_label ilike $${values.length}
      or e.summary ilike $${values.length}
      or e.description ilike $${values.length}
      or e.slug ilike $${values.length}
    )`);
  }

  const { rows } = await pool.query<EntitySummaryRow>(
    `
      select
        e.id::text,
        e.type::text as type,
        e.slug,
        e.preferred_label,
        e.summary,
        e.description,
        e.editorial_status,
        e.created_at,
        e.updated_at,
        a.agent_type as agent_kind,
        p.place_type as place_kind,
        ev.event_type as event_kind,
        coalesce(a.agent_type, p.place_type, ev.event_type, e.type::text) as display_category
      from entities e
      left join agents a on a.entity_id = e.id
      left join places p on p.entity_id = e.id
      left join events ev on ev.entity_id = e.id
      where ${clauses.join(' and ')}
      order by e.preferred_label, e.slug
      limit 100
    `,
    values,
  );

  return rows.map(mapEntitySummaryRow);
}

export async function getAtlasEntityDetailFromDb(slug: string) {
  const entity = await getPublishedEntityBySlug(slug);

  if (!entity) {
    return null;
  }

  const [aliases, typed, relations, linkedSources, mentions] =
    await Promise.all([
      readAliases(entity.id),
      readTypedEntity(entity),
      getAtlasEntityRelationsFromDb(entity.id),
      getAtlasEntityLinkedSourcesFromDb(entity.id),
      getAtlasEntityMentionsFromDb(entity.id),
    ]);

  return {
    aliases,
    entity,
    facts: buildFacts(entity, typed),
    incomingRelations: relations.incomingRelations,
    linkedSources,
    mentions,
    outgoingRelations: relations.outgoingRelations,
    typed,
  } satisfies AtlasEntityDetail;
}

export async function getAtlasEntityRelationsBySlug(slug: string) {
  const entity = await getPublishedEntityBySlug(slug);

  if (!entity) {
    return null;
  }

  return getAtlasEntityRelationsFromDb(entity.id);
}

export async function getAtlasEntityMentionsBySlug(slug: string) {
  const entity = await getPublishedEntityBySlug(slug);

  if (!entity) {
    return null;
  }

  return getAtlasEntityMentionsFromDb(entity.id);
}

export async function getAtlasEntityLinkedSourcesBySlug(slug: string) {
  const entity = await getPublishedEntityBySlug(slug);

  if (!entity) {
    return null;
  }

  return getAtlasEntityLinkedSourcesFromDb(entity.id);
}

export async function getAtlasEntityRelationsFromDb(entityId: string) {
  const pool = getPool();
  const { rows } = await pool.query<RelationRow>(
    `
      select
        er.id::text,
        'outgoing' as direction,
        er.predicate,
        er.object_label,
        er.object_url,
        er.certainty,
        er.note,
        target.id::text as target_id,
        target.type::text as target_type,
        target.slug as target_slug,
        target.preferred_label as target_preferred_label,
        target.summary as target_summary,
        coalesce(target_agent.agent_type, target_place.place_type, target_event.event_type, target.type::text) as target_display_category,
        target_agent.agent_type as target_agent_kind
      from entity_relations er
      left join entities target on target.id = er.object_entity_id
        and target.editorial_status = 'published'
      left join agents target_agent on target_agent.entity_id = target.id
      left join places target_place on target_place.entity_id = target.id
      left join events target_event on target_event.entity_id = target.id
      where er.subject_entity_id = $1::uuid

      union all

      select
        er.id::text,
        'incoming' as direction,
        er.predicate,
        er.object_label,
        er.object_url,
        er.certainty,
        er.note,
        source.id::text as target_id,
        source.type::text as target_type,
        source.slug as target_slug,
        source.preferred_label as target_preferred_label,
        source.summary as target_summary,
        coalesce(source_agent.agent_type, source_place.place_type, source_event.event_type, source.type::text) as target_display_category,
        source_agent.agent_type as target_agent_kind
      from entity_relations er
      join entities source on source.id = er.subject_entity_id
        and source.editorial_status = 'published'
      left join agents source_agent on source_agent.entity_id = source.id
      left join places source_place on source_place.entity_id = source.id
      left join events source_event on source_event.entity_id = source.id
      where er.object_entity_id = $1::uuid
      order by predicate, id
    `,
    [entityId],
  );

  const mappedRows = rows.map(mapRelationRow);

  return {
    incomingRelations: mappedRows.filter(
      (relation) => relation.direction === 'incoming',
    ),
    outgoingRelations: mappedRows.filter(
      (relation) => relation.direction === 'outgoing',
    ),
  };
}

export async function getAtlasEntityMentionsFromDb(entityId: string) {
  const pool = getPool();
  const { rows } = await pool.query<MentionRow>(
    `
      select
        em.id::text,
        em.mention_text,
        em.start_offset,
        em.end_offset,
        em.certainty,
        em.note,
        tu.id::text as text_unit_id,
        tu.label as text_unit_label,
        tu.sequence as text_unit_sequence,
        tu.content as text_unit_content,
        edition_entity.id::text as edition_id,
        edition_entity.type::text as edition_type,
        edition_entity.slug as edition_slug,
        edition_entity.preferred_label as edition_label,
        edition_entity.summary as edition_summary,
        witness_entity.id::text as witness_id,
        witness_entity.type::text as witness_type,
        witness_entity.slug as witness_slug,
        witness_entity.preferred_label as witness_label,
        witness_entity.summary as witness_summary,
        work_entity.id::text as work_id,
        work_entity.type::text as work_type,
        work_entity.slug as work_slug,
        work_entity.preferred_label as work_label,
        work_entity.summary as work_summary,
        cards.id::text as source_id,
        cards.slug as source_slug,
        cards.label as source_label,
        cards.kind as source_kind,
        cards.summary as source_summary,
        cards.region as source_region,
        cards.location_label as source_location_label,
        cards.latitude as source_latitude,
        cards.longitude as source_longitude,
        cards.source_date_label as source_source_date_label,
        cards.source_year as source_source_year,
        cards.discovery_date_label as source_discovery_date_label,
        cards.discovery_year as source_discovery_year,
        cards.current_repository as source_current_repository,
        cards.importance as source_importance,
        cards.hero_asset_url as source_hero_asset_url
      from entity_mentions em
      join text_units tu on tu.id = em.text_unit_id
      join text_editions te on te.id = tu.text_edition_id
      join entities edition_entity on edition_entity.id = te.entity_id
      left join text_witnesses tw on tw.id = te.text_witness_id
      left join entities witness_entity on witness_entity.id = tw.entity_id
      left join text_works work on work.id = tw.text_work_id
      left join entities work_entity on work_entity.id = work.entity_id
      left join catalog_record_links source_link
        on source_link.entity_id = edition_entity.id
        and source_link.role = 'evidence_text_edition'
      left join atlas_source_cards cards on cards.id = source_link.catalog_record_id
      where em.entity_id = $1::uuid
      order by cards.label nulls last, tu.sequence, em.created_at, em.id::text
    `,
    [entityId],
  );

  return rows.map(mapMentionRow);
}

export async function getAtlasEntityLinkedSourcesFromDb(entityId: string) {
  const pool = getPool();
  const { rows } = await pool.query<SourceCardRow>(
    `
      with linked_source_ids as (
        select cr.id
        from catalog_records cr
        where cr.entity_id = $1::uuid

        union

        select crl.catalog_record_id
        from catalog_record_links crl
        where crl.entity_id = $1::uuid

        union

        select source_link.catalog_record_id
        from entity_mentions em
        join text_units tu on tu.id = em.text_unit_id
        join text_editions te on te.id = tu.text_edition_id
        join catalog_record_links source_link
          on source_link.entity_id = te.entity_id
          and source_link.role = 'evidence_text_edition'
        where em.entity_id = $1::uuid

        union

        select subject_record.id
        from entity_relations er
        join catalog_records subject_record on subject_record.entity_id = er.subject_entity_id
        where er.object_entity_id = $1::uuid

        union

        select object_record.id
        from entity_relations er
        join catalog_records object_record on object_record.entity_id = er.object_entity_id
        where er.subject_entity_id = $1::uuid
      )
      select
        cards.id::text,
        cards.slug,
        cards.label,
        cards.kind,
        cards.summary,
        cards.region,
        cards.location_label,
        cards.latitude,
        cards.longitude,
        cards.source_date_label,
        cards.source_year,
        cards.discovery_date_label,
        cards.discovery_year,
        cards.current_repository,
        cards.importance,
        cards.hero_asset_url
      from atlas_source_cards cards
      join linked_source_ids linked on linked.id = cards.id
      order by cards.label, cards.slug
    `,
    [entityId],
  );

  return rows.map(mapSourceCardRow);
}

async function getPublishedEntityBySlug(slug: string) {
  const pool = getPool();
  const { rows } = await pool.query<EntityRow>(
    `
      select
        id::text,
        type::text as type,
        slug,
        preferred_label,
        summary,
        description,
        editorial_status,
        created_at,
        updated_at
      from entities
      where slug = $1
        and editorial_status = 'published'
      limit 1
    `,
    [slug],
  );

  return rows[0] ? mapEntityRow(rows[0]) : null;
}

async function readAliases(entityId: string) {
  const pool = getPool();
  const { rows } = await pool.query<AliasRow>(
    `
      select
        id::text,
        name,
        name_type,
        language,
        script,
        is_primary,
        source_note
      from entity_names
      where entity_id = $1::uuid
      order by is_primary desc, name
    `,
    [entityId],
  );

  return rows.map(
    (row): EntityAlias => ({
      id: row.id,
      isPrimary: row.is_primary,
      language: row.language,
      name: row.name,
      nameType: row.name_type,
      script: row.script,
      sourceNote: row.source_note,
    }),
  );
}

async function readTypedEntity(
  entity: Entity,
): Promise<AtlasEntityDetail['typed']> {
  switch (entity.type) {
    case 'agent':
      return readAgent(entity);
    case 'place':
      return readPlace(entity);
    case 'event':
      return readEvent(entity);
    case 'text_work':
      return readTextWork(entity);
    case 'text_witness':
      return readTextWitness(entity);
    case 'text_edition':
      return readTextEdition(entity);
    case 'manuscript_unit':
      return readManuscriptUnit(entity);
    case 'inscription':
      return readInscription(entity);
    case 'physical_object':
      return readPhysicalObject(entity);
    case 'object_part':
      return readObjectPart(entity);
    case 'asset':
      return readAsset(entity);
    default:
      return null;
  }
}

async function readAgent(entity: Entity) {
  const pool = getPool();
  const { rows } = await pool.query<{
    agent_type: AgentKind;
    date_end_year: number | null;
    date_label: string | null;
    date_precision: DatePrecision;
    date_start_year: number | null;
    external_ids: ExternalIds;
    name: string;
  }>(
    `
      select
        agent_type,
        name,
        external_ids,
        date_start_year,
        date_end_year,
        date_label,
        date_precision::text as date_precision
      from agents
      where entity_id = $1::uuid
    `,
    [entity.id],
  );
  const row = rows[0];

  if (!row) {
    return null;
  }

  return {
    ...entity,
    agentKind: row.agent_type,
    aliases: await readAliases(entity.id),
    dateRange: mapDateRange(row, 'date'),
    externalIds: row.external_ids ?? {},
    name: row.name,
    type: 'agent' as const,
  };
}

async function readPlace(entity: Entity) {
  const pool = getPool();
  const { rows } = await pool.query<{
    ancient_region: string | null;
    certainty: string | null;
    external_ids: ExternalIds;
    geometry: string | null;
    modern_country: string | null;
    name: string;
    place_type: PlaceKind | null;
  }>(
    `
      select
        name,
        coalesce(place_type, 'unknown') as place_type,
        case when geom is null then null else st_asgeojson(geom) end as geometry,
        modern_country,
        ancient_region,
        external_ids,
        certainty
      from places
      where entity_id = $1::uuid
    `,
    [entity.id],
  );
  const row = rows[0];

  if (!row) {
    return null;
  }

  return {
    ...entity,
    aliases: await readAliases(entity.id),
    ancientRegion: row.ancient_region,
    certainty: row.certainty,
    externalIds: row.external_ids ?? {},
    geometry: parseGeometry(row.geometry),
    historicalGeometries: [],
    modernCountry: row.modern_country,
    name: row.name,
    placeKind: row.place_type ?? 'unknown',
    type: 'place' as const,
  };
}

async function readEvent(entity: Entity) {
  const pool = getPool();
  const { rows } = await pool.query<{
    date_end_year: number | null;
    date_label: string | null;
    date_precision: DatePrecision;
    date_start_year: number | null;
    description: string | null;
    event_type: EventKind;
  }>(
    `
      select
        event_type,
        date_start_year,
        date_end_year,
        date_label,
        date_precision::text as date_precision,
        description
      from events
      where entity_id = $1::uuid
    `,
    [entity.id],
  );
  const row = rows[0];

  if (!row) {
    return null;
  }

  return {
    ...entity,
    agents: [],
    dateRange: mapDateRange(row, 'date'),
    description: row.description,
    eventKind: row.event_type,
    places: [],
    primaryPlace: null,
    type: 'event' as const,
  };
}

async function readTextWork(entity: Entity) {
  const pool = getPool();
  const { rows } = await pool.query<{
    abstract: string | null;
    canonical_title: string;
    date_end_year: number | null;
    date_label: string | null;
    date_start_year: number | null;
    language_original: string | null;
    work_type: string | null;
  }>(
    `
      select
        canonical_title,
        work_type,
        language_original,
        date_start_year,
        date_end_year,
        date_label,
        abstract
      from text_works
      where entity_id = $1::uuid
    `,
    [entity.id],
  );
  const row = rows[0];

  if (!row) {
    return null;
  }

  return {
    ...entity,
    abstract: row.abstract,
    canonicalTitle: row.canonical_title,
    dateRange: {
      endYear: row.date_end_year,
      label: row.date_label,
      precision: 'unknown',
      startYear: row.date_start_year,
    },
    languageOriginal: row.language_original,
    type: 'text_work' as const,
    workType: row.work_type,
  } satisfies TextWorkEntity;
}

async function readTextWitness(entity: Entity) {
  const pool = getPool();
  const { rows } = await pool.query<{
    completeness: string | null;
    date_end_year: number | null;
    date_label: string | null;
    date_start_year: number | null;
    language: string | null;
    script: string | null;
    siglum: string | null;
    text_work_id: string | null;
    text_work_label: string | null;
    text_work_slug: string | null;
    text_work_summary: string | null;
    witness_type: string | null;
  }>(
    `
      select
        tw.siglum,
        tw.witness_type,
        tw.completeness,
        tw.language,
        tw.script,
        tw.date_start_year,
        tw.date_end_year,
        tw.date_label,
        work_entity.id::text as text_work_id,
        work_entity.slug as text_work_slug,
        work_entity.preferred_label as text_work_label,
        work_entity.summary as text_work_summary
      from text_witnesses tw
      left join text_works work on work.id = tw.text_work_id
      left join entities work_entity on work_entity.id = work.entity_id
      where tw.entity_id = $1::uuid
    `,
    [entity.id],
  );
  const row = rows[0];

  if (!row) {
    return null;
  }

  return {
    ...entity,
    completeness: row.completeness,
    dateRange: {
      endYear: row.date_end_year,
      label: row.date_label,
      precision: 'unknown',
      startYear: row.date_start_year,
    },
    language: row.language,
    script: row.script,
    siglum: row.siglum,
    textWork: summaryFromParts({
      displayCategory: 'text work',
      id: row.text_work_id,
      label: row.text_work_label,
      slug: row.text_work_slug,
      summary: row.text_work_summary,
      type: 'text_work',
    }),
    type: 'text_witness' as const,
    witnessType: row.witness_type,
  } satisfies TextWitnessEntity;
}

async function readTextEdition(entity: Entity) {
  const pool = getPool();
  const { rows } = await pool.query<{
    edition_type: EditionType;
    editorial_policy: string | null;
    is_public: boolean;
    language: string | null;
    script: string | null;
    text_witness_id: string | null;
    text_witness_label: string | null;
    text_witness_slug: string | null;
    text_witness_summary: string | null;
    version_label: string | null;
  }>(
    `
      select
        te.edition_type::text as edition_type,
        te.language,
        te.script,
        te.editorial_policy,
        te.version_label,
        te.is_public,
        witness_entity.id::text as text_witness_id,
        witness_entity.slug as text_witness_slug,
        witness_entity.preferred_label as text_witness_label,
        witness_entity.summary as text_witness_summary
      from text_editions te
      left join text_witnesses tw on tw.id = te.text_witness_id
      left join entities witness_entity on witness_entity.id = tw.entity_id
      where te.entity_id = $1::uuid
    `,
    [entity.id],
  );
  const row = rows[0];

  if (!row) {
    return null;
  }

  return {
    ...entity,
    editionType: row.edition_type,
    editorialPolicy: row.editorial_policy,
    isPublic: row.is_public,
    language: row.language,
    script: row.script,
    textWitness: summaryFromParts({
      displayCategory: 'text witness',
      id: row.text_witness_id,
      label: row.text_witness_label,
      slug: row.text_witness_slug,
      summary: row.text_witness_summary,
      type: 'text_witness',
    }),
    type: 'text_edition' as const,
    versionLabel: row.version_label,
  } satisfies TextEditionEntity;
}

async function readManuscriptUnit(entity: Entity) {
  const pool = getPool();
  const { rows } = await pool.query<{
    folio_count: number | null;
    format: string | null;
    language_summary: string | null;
    layout_note: string | null;
    physical_object_id: string | null;
    physical_object_label: string | null;
    physical_object_slug: string | null;
    physical_object_summary: string | null;
    quire_structure: string | null;
    scribal_note: string | null;
    script_summary: string | null;
    support: string | null;
  }>(
    `
      select
        mu.support,
        mu.format,
        mu.script_summary,
        mu.language_summary,
        mu.folio_count,
        mu.quire_structure,
        mu.layout_note,
        mu.scribal_note,
        object_entity.id::text as physical_object_id,
        object_entity.slug as physical_object_slug,
        object_entity.preferred_label as physical_object_label,
        object_entity.summary as physical_object_summary
      from manuscript_units mu
      left join physical_objects po on po.id = mu.physical_object_id
      left join entities object_entity on object_entity.id = po.entity_id
      where mu.entity_id = $1::uuid
    `,
    [entity.id],
  );
  const row = rows[0];

  if (!row) {
    return null;
  }

  return {
    ...entity,
    folioCount: row.folio_count,
    format: row.format,
    languageSummary: row.language_summary,
    layoutNote: row.layout_note,
    physicalObject: summaryFromParts({
      displayCategory: 'physical object',
      id: row.physical_object_id,
      label: row.physical_object_label,
      slug: row.physical_object_slug,
      summary: row.physical_object_summary,
      type: 'physical_object',
    }),
    quireStructure: row.quire_structure,
    scribalNote: row.scribal_note,
    scriptSummary: row.script_summary,
    support: row.support,
    type: 'manuscript_unit' as const,
  } satisfies ManuscriptUnitEntity;
}

async function readInscription(entity: Entity) {
  const pool = getPool();
  const { rows } = await pool.query<{
    condition_note: string | null;
    inscription_type: string | null;
    language: string | null;
    layout_note: string | null;
    object_part_id: string | null;
    object_part_label: string | null;
    object_part_slug: string | null;
    object_part_summary: string | null;
    physical_object_id: string | null;
    physical_object_label: string | null;
    physical_object_slug: string | null;
    physical_object_summary: string | null;
    script: string | null;
    technique: string | null;
  }>(
    `
      select
        ins.inscription_type,
        ins.technique,
        ins.script,
        ins.language,
        ins.layout_note,
        ins.condition_note,
        object_entity.id::text as physical_object_id,
        object_entity.slug as physical_object_slug,
        object_entity.preferred_label as physical_object_label,
        object_entity.summary as physical_object_summary,
        part_entity.id::text as object_part_id,
        part_entity.slug as object_part_slug,
        part_entity.preferred_label as object_part_label,
        part_entity.summary as object_part_summary
      from inscriptions ins
      left join physical_objects po on po.id = ins.physical_object_id
      left join entities object_entity on object_entity.id = po.entity_id
      left join object_parts op on op.id = ins.object_part_id
      left join entities part_entity on part_entity.id = op.entity_id
      where ins.entity_id = $1::uuid
    `,
    [entity.id],
  );
  const row = rows[0];

  if (!row) {
    return null;
  }

  return {
    ...entity,
    conditionNote: row.condition_note,
    inscriptionType: row.inscription_type,
    language: row.language,
    layoutNote: row.layout_note,
    objectPart: summaryFromParts({
      displayCategory: 'object part',
      id: row.object_part_id,
      label: row.object_part_label,
      slug: row.object_part_slug,
      summary: row.object_part_summary,
      type: 'object_part',
    }),
    physicalObject: summaryFromParts({
      displayCategory: 'physical object',
      id: row.physical_object_id,
      label: row.physical_object_label,
      slug: row.physical_object_slug,
      summary: row.physical_object_summary,
      type: 'physical_object',
    }),
    script: row.script,
    technique: row.technique,
    type: 'inscription' as const,
  } satisfies InscriptionEntity;
}

async function readPhysicalObject(entity: Entity) {
  const pool = getPool();
  const { rows } = await pool.query<{
    condition_note: string | null;
    dimensions: Record<string, unknown> | null;
    is_composite: boolean;
    material: string | null;
    object_type: string | null;
    technique: string | null;
  }>(
    `
      select
        object_type,
        material,
        technique,
        dimensions,
        condition_note,
        is_composite
      from physical_objects
      where entity_id = $1::uuid
    `,
    [entity.id],
  );
  const row = rows[0];

  if (!row) {
    return null;
  }

  return {
    ...entity,
    conditionNote: row.condition_note,
    dimensions: row.dimensions,
    isComposite: row.is_composite,
    material: row.material,
    objectType: row.object_type,
    technique: row.technique,
    type: 'physical_object' as const,
  } satisfies PhysicalObjectEntity;
}

async function readObjectPart(entity: Entity) {
  const pool = getPool();
  const { rows } = await pool.query<{
    condition_note: string | null;
    label: string | null;
    material: string | null;
    parent_part_id: string | null;
    parent_part_label: string | null;
    parent_part_slug: string | null;
    parent_part_summary: string | null;
    part_type: string | null;
    physical_object_id: string | null;
    physical_object_label: string | null;
    physical_object_slug: string | null;
    physical_object_summary: string | null;
    sequence: number | null;
  }>(
    `
      select
        op.part_type,
        op.label,
        op.sequence,
        op.material,
        op.condition_note,
        object_entity.id::text as physical_object_id,
        object_entity.slug as physical_object_slug,
        object_entity.preferred_label as physical_object_label,
        object_entity.summary as physical_object_summary,
        parent_entity.id::text as parent_part_id,
        parent_entity.slug as parent_part_slug,
        parent_entity.preferred_label as parent_part_label,
        parent_entity.summary as parent_part_summary
      from object_parts op
      left join physical_objects po on po.id = op.physical_object_id
      left join entities object_entity on object_entity.id = po.entity_id
      left join object_parts parent_part on parent_part.id = op.parent_part_id
      left join entities parent_entity on parent_entity.id = parent_part.entity_id
      where op.entity_id = $1::uuid
    `,
    [entity.id],
  );
  const row = rows[0];

  if (!row) {
    return null;
  }

  return {
    ...entity,
    conditionNote: row.condition_note,
    label: row.label,
    material: row.material,
    parentPart: summaryFromParts({
      displayCategory: 'object part',
      id: row.parent_part_id,
      label: row.parent_part_label,
      slug: row.parent_part_slug,
      summary: row.parent_part_summary,
      type: 'object_part',
    }),
    partType: row.part_type,
    physicalObject: summaryFromParts({
      displayCategory: 'physical object',
      id: row.physical_object_id,
      label: row.physical_object_label,
      slug: row.physical_object_slug,
      summary: row.physical_object_summary,
      type: 'physical_object',
    }),
    sequence: row.sequence,
    type: 'object_part' as const,
  } satisfies ObjectPartEntity;
}

async function readAsset(entity: Entity) {
  const pool = getPool();
  const { rows } = await pool.query<Asset>(
    `
      select
        id::text,
        entity_id::text as "entityId",
        asset_kind::text as "assetKind",
        bucket,
        object_key as "objectKey",
        original_filename as "originalFilename",
        content_type as "contentType",
        byte_size as "byteSize",
        sha256,
        width,
        height,
        page_count as "pageCount",
        source_url as "sourceUrl",
        license,
        rights_statement as "rightsStatement",
        attribution,
        is_public as "isPublic",
        created_at as "createdAt"
      from assets
      where entity_id = $1::uuid
    `,
    [entity.id],
  );
  const row = rows[0];

  if (!row) {
    return null;
  }

  return {
    ...entity,
    ...row,
    type: 'asset' as const,
  } satisfies AssetEntity;
}

function mapEntityRow(row: EntityRow): Entity {
  return {
    createdAt: toIsoString(row.created_at),
    description: row.description,
    editorialStatus: row.editorial_status,
    id: row.id,
    preferredLabel: row.preferred_label,
    slug: row.slug,
    summary: row.summary,
    type: row.type,
    updatedAt: toIsoString(row.updated_at),
  };
}

function mapEntitySummaryRow(row: EntitySummaryRow): EntitySummary {
  return {
    displayCategory: row.display_category,
    id: row.id,
    preferredLabel: row.preferred_label,
    slug: row.slug,
    summary: row.summary,
    type: row.type,
  };
}

function mapRelationRow(row: RelationRow): EntityRelationView {
  return {
    certainty: row.certainty,
    direction: row.direction,
    id: row.id,
    note: row.note,
    objectLabel: row.object_label,
    objectUrl: row.object_url,
    predicate: row.predicate,
    target:
      row.target_id &&
      row.target_slug &&
      row.target_preferred_label &&
      row.target_type
        ? {
            displayCategory:
              row.target_display_category ??
              row.target_type.replaceAll('_', ' '),
            id: row.target_id,
            preferredLabel: row.target_preferred_label,
            slug: row.target_slug,
            summary: row.target_summary,
            type: row.target_type,
          }
        : null,
  };
}

function mapMentionRow(row: MentionRow): EntityMentionContext {
  return {
    certainty: row.certainty,
    edition: summaryFromParts({
      displayCategory: 'text edition',
      id: row.edition_id,
      label: row.edition_label,
      slug: row.edition_slug,
      summary: row.edition_summary,
      type: row.edition_type,
    }),
    endOffset: row.end_offset,
    id: row.id,
    mentionText: row.mention_text,
    note: row.note,
    source:
      row.source_id &&
      row.source_slug &&
      row.source_label &&
      row.source_kind &&
      row.source_importance !== null
        ? mapSourceCardRow({
            current_repository: row.source_current_repository,
            discovery_date_label: row.source_discovery_date_label,
            discovery_year: row.source_discovery_year,
            hero_asset_url: row.source_hero_asset_url,
            id: row.source_id,
            importance: row.source_importance,
            kind: row.source_kind,
            label: row.source_label,
            latitude: row.source_latitude,
            location_label: row.source_location_label,
            longitude: row.source_longitude,
            region: row.source_region,
            slug: row.source_slug,
            source_date_label: row.source_source_date_label,
            source_year: row.source_source_year,
            summary: row.source_summary,
          })
        : null,
    startOffset: row.start_offset,
    textUnitContent: row.text_unit_content,
    textUnitId: row.text_unit_id,
    textUnitLabel: row.text_unit_label,
    textUnitSequence: row.text_unit_sequence,
    witness: summaryFromParts({
      displayCategory: 'text witness',
      id: row.witness_id,
      label: row.witness_label,
      slug: row.witness_slug,
      summary: row.witness_summary,
      type: row.witness_type,
    }),
    work: summaryFromParts({
      displayCategory: 'text work',
      id: row.work_id,
      label: row.work_label,
      slug: row.work_slug,
      summary: row.work_summary,
      type: row.work_type,
    }),
  };
}

function mapSourceCardRow(row: SourceCardRow): AtlasSourceCard {
  return {
    currentRepository: row.current_repository,
    discoveryDateLabel: row.discovery_date_label,
    discoveryYear: row.discovery_year,
    heroAssetUrl: row.hero_asset_url,
    id: row.id,
    importance: row.importance,
    kind: row.kind,
    label: row.label,
    latitude: row.latitude === null ? null : Number(row.latitude),
    locationLabel: row.location_label,
    longitude: row.longitude === null ? null : Number(row.longitude),
    region: row.region,
    slug: row.slug,
    sourceDateLabel: row.source_date_label,
    sourceYear: row.source_year,
    summary: row.summary,
  };
}

function summaryFromParts(input: {
  displayCategory: string;
  id: string | null;
  label: string | null;
  slug: string | null;
  summary: string | null;
  type: EntityType | null;
}) {
  if (!input.id || !input.slug || !input.label || !input.type) {
    return null;
  }

  return {
    displayCategory: input.displayCategory,
    id: input.id,
    preferredLabel: input.label,
    slug: input.slug,
    summary: input.summary,
    type: input.type,
  } satisfies EntitySummary;
}

function buildFacts(
  entity: Entity,
  typed: AtlasEntityDetail['typed'],
): AtlasEntityFact[] {
  const facts: AtlasEntityFact[] = [
    { label: 'Entity type', value: entity.type.replaceAll('_', ' ') },
  ];

  if (!typed) {
    return facts;
  }

  if (typed.type === 'agent') {
    pushFact(facts, 'Kind', typed.agentKind);
    pushFact(facts, 'Name', typed.name);
    pushFact(facts, 'Date', typed.dateRange.label);
  } else if (typed.type === 'place') {
    pushFact(facts, 'Kind', typed.placeKind);
    pushFact(facts, 'Name', typed.name);
    pushFact(facts, 'Ancient region', typed.ancientRegion);
    pushFact(facts, 'Modern country', typed.modernCountry);
    pushFact(facts, 'Certainty', typed.certainty);
  } else if (typed.type === 'event') {
    pushFact(facts, 'Kind', typed.eventKind);
    pushFact(facts, 'Date', typed.dateRange.label);
  } else if (typed.type === 'text_work') {
    pushFact(facts, 'Canonical title', typed.canonicalTitle);
    pushFact(facts, 'Work type', typed.workType);
    pushFact(facts, 'Original language', typed.languageOriginal);
    pushFact(facts, 'Date', typed.dateRange.label);
  } else if (typed.type === 'text_witness') {
    pushFact(facts, 'Siglum', typed.siglum);
    pushFact(facts, 'Witness type', typed.witnessType);
    pushFact(facts, 'Language', typed.language);
    pushFact(facts, 'Script', typed.script);
    pushFact(facts, 'Date', typed.dateRange.label);
  } else if (typed.type === 'text_edition') {
    pushFact(facts, 'Edition type', typed.editionType);
    pushFact(facts, 'Language', typed.language);
    pushFact(facts, 'Script', typed.script);
    pushFact(facts, 'Version', typed.versionLabel);
  } else if (typed.type === 'manuscript_unit') {
    pushFact(facts, 'Support', typed.support);
    pushFact(facts, 'Format', typed.format);
    pushFact(facts, 'Script', typed.scriptSummary);
    pushFact(facts, 'Language', typed.languageSummary);
    pushFact(facts, 'Folios', typed.folioCount);
  } else if (typed.type === 'inscription') {
    pushFact(facts, 'Inscription type', typed.inscriptionType);
    pushFact(facts, 'Technique', typed.technique);
    pushFact(facts, 'Script', typed.script);
    pushFact(facts, 'Language', typed.language);
  } else if (typed.type === 'physical_object') {
    pushFact(facts, 'Object type', typed.objectType);
    pushFact(facts, 'Material', typed.material);
    pushFact(facts, 'Technique', typed.technique);
    pushFact(facts, 'Composite', typed.isComposite ? 'yes' : 'no');
  } else if (typed.type === 'object_part') {
    pushFact(facts, 'Part type', typed.partType);
    pushFact(facts, 'Label', typed.label);
    pushFact(facts, 'Material', typed.material);
  } else if (typed.type === 'asset') {
    pushFact(facts, 'Asset kind', typed.assetKind);
    pushFact(facts, 'Content type', typed.contentType);
    pushFact(facts, 'License', typed.license);
  }

  return facts;
}

function pushFact(
  facts: AtlasEntityFact[],
  label: string,
  value: boolean | number | string | null | undefined,
) {
  if (value === null || value === undefined || value === '') {
    return;
  }

  facts.push({ label, value: String(value) });
}

function mapDateRange(
  row: {
    date_end_year: number | null;
    date_label: string | null;
    date_precision: DatePrecision;
    date_start_year: number | null;
  },
  prefix: 'date',
): DateRange {
  return {
    endYear: row[`${prefix}_end_year`],
    label: row[`${prefix}_label`],
    precision: row[`${prefix}_precision`],
    startYear: row[`${prefix}_start_year`],
  };
}

function parseGeometry(value: string | null): Geometry | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as Geometry;
  } catch {
    return null;
  }
}

function toIsoString(value: string | Date) {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}
