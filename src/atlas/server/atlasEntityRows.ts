// Database row shapes and their mapping onto atlas entity models, shared by the atlas entity
// repository modules. The public surface is ./atlasEntityRepository.
import type {
  AtlasSourceCard,
  DatePrecision,
  DateRange,
  Entity,
  EntityType,
  RecordKind,
} from '../domain/dataModel';
import type { EntitySummary, Geometry } from '../domain/entityModel';
import type {
  AtlasEntityDetail,
  AtlasEntityFact,
  EntityMentionContext,
  EntityRelationView,
} from '../domain/entityPageModel';

export type EntityRow = {
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

export type EntitySummaryRow = EntityRow & {
  agent_kind: string | null;
  display_category: string;
  event_kind: string | null;
  place_kind: string | null;
};

export type AliasRow = {
  id: string;
  is_primary: boolean;
  language: string | null;
  name: string;
  name_type: string;
  script: string | null;
  source_note: string | null;
};

export type RelationRow = {
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

export type MentionRow = {
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

export type SourceCardRow = {
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

export const validEntityTypes: EntityType[] = [
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

export function mapEntityRow(row: EntityRow): Entity {
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

export function mapEntitySummaryRow(row: EntitySummaryRow): EntitySummary {
  return {
    displayCategory: row.display_category,
    id: row.id,
    preferredLabel: row.preferred_label,
    slug: row.slug,
    summary: row.summary,
    type: row.type,
  };
}

export function mapRelationRow(row: RelationRow): EntityRelationView {
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

export function mapMentionRow(row: MentionRow): EntityMentionContext {
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

export function mapSourceCardRow(row: SourceCardRow): AtlasSourceCard {
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

export function summaryFromParts(input: {
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

export function buildFacts(
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

export function pushFact(
  facts: AtlasEntityFact[],
  label: string,
  value: boolean | number | string | null | undefined,
) {
  if (value === null || value === undefined || value === '') {
    return;
  }

  facts.push({ label, value: String(value) });
}

export function mapDateRange(
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

export function parseGeometry(value: string | null): Geometry | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as Geometry;
  } catch {
    return null;
  }
}

export function toIsoString(value: string | Date) {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}
