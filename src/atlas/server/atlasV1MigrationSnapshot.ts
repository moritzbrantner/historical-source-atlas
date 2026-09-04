import { getPool } from '@/src/db/client';

export type V1EntityRow = {
  id: string;
  type: string;
  slug: string;
  preferredLabel: string;
  summary: string | null;
  description: string | null;
};

export type V1CatalogRecordRow = {
  id: string;
  entityId: string;
  kind: string;
  displayTitle: string;
  displaySubtitle: string | null;
  publicSummary: string | null;
  primaryPlaceId: string | null;
  primaryDateStartYear: number | null;
  primaryDateEndYear: number | null;
  primaryDateLabel: string | null;
  discoveryEventId: string | null;
  heroAssetId: string | null;
  published: boolean;
};

export type V1CatalogRecordLinkRow = {
  catalogRecordId: string;
  entityId: string;
  role: string;
  sequence: number;
};

export type V1PlaceRow = {
  id: string;
  entityId: string;
  name: string;
  placeType: string | null;
  geometryGeoJson: unknown | null;
  modernCountry: string | null;
  ancientRegion: string | null;
  certainty: string | null;
};

export type V1EventRow = {
  id: string;
  entityId: string;
  eventType: string;
  dateStartYear: number | null;
  dateEndYear: number | null;
  dateLabel: string | null;
  datePrecision: string;
  placeId: string | null;
  description: string | null;
};

export type V1AgentRow = {
  id: string;
  entityId: string;
  agentType: string;
  name: string;
  dateStartYear: number | null;
  dateEndYear: number | null;
  dateLabel: string | null;
  datePrecision: string;
};

export type V1PhysicalObjectRow = {
  id: string;
  entityId: string;
  objectType: string | null;
};

export type V1ObjectPartRow = {
  id: string;
  entityId: string;
  physicalObjectId: string;
  parentPartId: string | null;
  partType: string | null;
  label: string | null;
  sequence: number | null;
};

export type V1ManuscriptUnitRow = {
  id: string;
  entityId: string;
  physicalObjectId: string;
};

export type V1InscriptionRow = {
  id: string;
  entityId: string;
  physicalObjectId: string;
  objectPartId: string | null;
};

export type V1TextWorkRow = {
  id: string;
  entityId: string;
  canonicalTitle: string;
  workType: string | null;
  languageOriginal: string | null;
  dateStartYear: number | null;
  dateEndYear: number | null;
  dateLabel: string | null;
  abstract: string | null;
};

export type V1TextWitnessRow = {
  id: string;
  entityId: string;
  textWorkId: string | null;
  physicalObjectId: string | null;
  inscriptionId: string | null;
  manuscriptUnitId: string | null;
  siglum: string | null;
  witnessType: string | null;
  dateStartYear: number | null;
  dateEndYear: number | null;
  dateLabel: string | null;
};

export type V1TextEditionRow = {
  id: string;
  entityId: string;
  textWitnessId: string;
  editionType: string;
  language: string | null;
  versionLabel: string | null;
  isPublic: boolean;
};

export type V1TextUnitRow = {
  id: string;
  textEditionId: string;
  parentUnitId: string | null;
  objectPartId: string | null;
  unitType: string;
  label: string | null;
  sequence: number;
  content: string | null;
  normalizedContent: string | null;
  note: string | null;
};

export type V1TextAnnotationRow = {
  id: string;
  textUnitId: string;
  annotationType: string;
  startOffset: number | null;
  endOffset: number | null;
  content: string | null;
  certainty: string | null;
};

export type V1EntityMentionRow = {
  id: string;
  textUnitId: string;
  entityId: string;
  mentionText: string;
  startOffset: number | null;
  endOffset: number | null;
  certainty: string | null;
  source: string | null;
  note: string | null;
};

export type V1EntityRelationRow = {
  id: string;
  subjectEntityId: string;
  predicate: string;
  objectEntityId: string | null;
  objectLabel: string | null;
  objectUrl: string | null;
  certainty: string | null;
  note: string | null;
  bibliographicItemId: string | null;
};

export type V1AssetRow = {
  id: string;
  entityId: string;
  assetKind: string;
  originalFilename: string | null;
  sourceUrl: string | null;
};

export type AtlasV1MigrationSnapshot = {
  entities: readonly V1EntityRow[];
  catalogRecords: readonly V1CatalogRecordRow[];
  catalogRecordLinks: readonly V1CatalogRecordLinkRow[];
  places: readonly V1PlaceRow[];
  events: readonly V1EventRow[];
  agents: readonly V1AgentRow[];
  physicalObjects: readonly V1PhysicalObjectRow[];
  objectParts: readonly V1ObjectPartRow[];
  manuscriptUnits: readonly V1ManuscriptUnitRow[];
  inscriptions: readonly V1InscriptionRow[];
  textWorks: readonly V1TextWorkRow[];
  textWitnesses: readonly V1TextWitnessRow[];
  textEditions: readonly V1TextEditionRow[];
  textUnits: readonly V1TextUnitRow[];
  textAnnotations: readonly V1TextAnnotationRow[];
  entityMentions: readonly V1EntityMentionRow[];
  entityRelations: readonly V1EntityRelationRow[];
  assets: readonly V1AssetRow[];
};

export async function readAtlasV1MigrationSnapshotFromDb(): Promise<AtlasV1MigrationSnapshot> {
  const pool = getPool();
  const [
    entities,
    catalogRecords,
    catalogRecordLinks,
    places,
    events,
    agents,
    physicalObjects,
    objectParts,
    manuscriptUnits,
    inscriptions,
    textWorks,
    textWitnesses,
    textEditions,
    textUnits,
    textAnnotations,
    entityMentions,
    entityRelations,
    assets,
  ] = await Promise.all([
    pool.query<V1EntityRow>(`
      select id::text, type::text, slug, preferred_label as "preferredLabel",
        summary, description
      from entities
      order by id::text
    `),
    pool.query<V1CatalogRecordRow>(`
      select id::text, entity_id::text as "entityId", kind::text,
        display_title as "displayTitle", display_subtitle as "displaySubtitle",
        public_summary as "publicSummary", primary_place_id::text as "primaryPlaceId",
        primary_date_start_year as "primaryDateStartYear",
        primary_date_end_year as "primaryDateEndYear",
        primary_date_label as "primaryDateLabel",
        discovery_event_id::text as "discoveryEventId",
        hero_asset_id::text as "heroAssetId", published
      from catalog_records
      order by id::text
    `),
    pool.query<V1CatalogRecordLinkRow>(`
      select catalog_record_id::text as "catalogRecordId",
        entity_id::text as "entityId", role, sequence
      from catalog_record_links
      order by catalog_record_id::text, sequence, entity_id::text, role
    `),
    pool.query<V1PlaceRow>(`
      select id::text, entity_id::text as "entityId", name,
        place_type as "placeType",
        case when geom is null then null else st_asgeojson(geom)::jsonb end as "geometryGeoJson",
        modern_country as "modernCountry", ancient_region as "ancientRegion", certainty
      from places
      order by id::text
    `),
    pool.query<V1EventRow>(`
      select id::text, entity_id::text as "entityId", event_type as "eventType",
        date_start_year as "dateStartYear", date_end_year as "dateEndYear",
        date_label as "dateLabel", date_precision::text as "datePrecision",
        place_id::text as "placeId", description
      from events
      order by id::text
    `),
    pool.query<V1AgentRow>(`
      select id::text, entity_id::text as "entityId", agent_type as "agentType", name,
        date_start_year as "dateStartYear", date_end_year as "dateEndYear",
        date_label as "dateLabel", date_precision::text as "datePrecision"
      from agents
      order by id::text
    `),
    pool.query<V1PhysicalObjectRow>(`
      select id::text, entity_id::text as "entityId", object_type as "objectType"
      from physical_objects
      order by id::text
    `),
    pool.query<V1ObjectPartRow>(`
      select id::text, entity_id::text as "entityId",
        physical_object_id::text as "physicalObjectId",
        parent_part_id::text as "parentPartId", part_type as "partType", label, sequence
      from object_parts
      order by id::text
    `),
    pool.query<V1ManuscriptUnitRow>(`
      select id::text, entity_id::text as "entityId",
        physical_object_id::text as "physicalObjectId"
      from manuscript_units
      order by id::text
    `),
    pool.query<V1InscriptionRow>(`
      select id::text, entity_id::text as "entityId",
        physical_object_id::text as "physicalObjectId",
        object_part_id::text as "objectPartId"
      from inscriptions
      order by id::text
    `),
    pool.query<V1TextWorkRow>(`
      select id::text, entity_id::text as "entityId",
        canonical_title as "canonicalTitle", work_type as "workType",
        language_original as "languageOriginal", date_start_year as "dateStartYear",
        date_end_year as "dateEndYear", date_label as "dateLabel", abstract
      from text_works
      order by id::text
    `),
    pool.query<V1TextWitnessRow>(`
      select id::text, entity_id::text as "entityId", text_work_id::text as "textWorkId",
        physical_object_id::text as "physicalObjectId",
        inscription_id::text as "inscriptionId",
        manuscript_unit_id::text as "manuscriptUnitId", siglum,
        witness_type as "witnessType", date_start_year as "dateStartYear",
        date_end_year as "dateEndYear", date_label as "dateLabel"
      from text_witnesses
      order by id::text
    `),
    pool.query<V1TextEditionRow>(`
      select id::text, entity_id::text as "entityId",
        text_witness_id::text as "textWitnessId", edition_type::text as "editionType",
        language, version_label as "versionLabel", is_public as "isPublic"
      from text_editions
      order by id::text
    `),
    pool.query<V1TextUnitRow>(`
      select id::text, text_edition_id::text as "textEditionId",
        parent_unit_id::text as "parentUnitId", object_part_id::text as "objectPartId",
        unit_type as "unitType", label, sequence, content,
        normalized_content as "normalizedContent", note
      from text_units
      order by id::text
    `),
    pool.query<V1TextAnnotationRow>(`
      select id::text, text_unit_id::text as "textUnitId",
        annotation_type as "annotationType", start_offset as "startOffset",
        end_offset as "endOffset", content, certainty
      from text_annotations
      order by id::text
    `),
    pool.query<V1EntityMentionRow>(`
      select id::text, text_unit_id::text as "textUnitId", entity_id::text as "entityId",
        mention_text as "mentionText", start_offset as "startOffset",
        end_offset as "endOffset", certainty, source, note
      from entity_mentions
      order by id::text
    `),
    pool.query<V1EntityRelationRow>(`
      select id::text, subject_entity_id::text as "subjectEntityId", predicate,
        object_entity_id::text as "objectEntityId", object_label as "objectLabel",
        object_url as "objectUrl", certainty, note,
        bibliographic_item_id::text as "bibliographicItemId"
      from entity_relations
      order by id::text
    `),
    pool.query<V1AssetRow>(`
      select id::text, entity_id::text as "entityId", asset_kind::text as "assetKind",
        original_filename as "originalFilename", source_url as "sourceUrl"
      from assets
      order by id::text
    `),
  ]);

  return {
    entities: entities.rows,
    catalogRecords: catalogRecords.rows,
    catalogRecordLinks: catalogRecordLinks.rows,
    places: places.rows,
    events: events.rows,
    agents: agents.rows,
    physicalObjects: physicalObjects.rows,
    objectParts: objectParts.rows,
    manuscriptUnits: manuscriptUnits.rows,
    inscriptions: inscriptions.rows,
    textWorks: textWorks.rows,
    textWitnesses: textWitnesses.rows,
    textEditions: textEditions.rows,
    textUnits: textUnits.rows,
    textAnnotations: textAnnotations.rows,
    entityMentions: entityMentions.rows,
    entityRelations: entityRelations.rows,
    assets: assets.rows,
  };
}
