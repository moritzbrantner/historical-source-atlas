// Per-type readers that load a published entity's typed details.
import { getPool } from '@/src/db/client';
import type {
  Asset,
  DatePrecision,
  EditionType,
  Entity,
} from '../domain/dataModel';
import type {
  AgentKind,
  EntityAlias,
  EventKind,
  ExternalIds,
  PlaceKind,
} from '../domain/entityModel';
import type {
  AtlasEntityDetail,
  AssetEntity,
  InscriptionEntity,
  ManuscriptUnitEntity,
  ObjectPartEntity,
  PhysicalObjectEntity,
  TextEditionEntity,
  TextWitnessEntity,
  TextWorkEntity,
} from '../domain/entityPageModel';
import {
  type AliasRow,
  type EntityRow,
  mapDateRange,
  mapEntityRow,
  parseGeometry,
  summaryFromParts,
} from './atlasEntityRows';

export async function getPublishedEntityBySlug(slug: string) {
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

export async function readAliases(entityId: string) {
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

export async function readTypedEntity(
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

export async function readAgent(entity: Entity) {
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

export async function readPlace(entity: Entity) {
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

export async function readEvent(entity: Entity) {
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

export async function readTextWork(entity: Entity) {
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

export async function readTextWitness(entity: Entity) {
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

export async function readTextEdition(entity: Entity) {
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

export async function readManuscriptUnit(entity: Entity) {
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

export async function readInscription(entity: Entity) {
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

export async function readPhysicalObject(entity: Entity) {
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

export async function readObjectPart(entity: Entity) {
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

export async function readAsset(entity: Entity) {
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
