import { getPool } from '@/src/db/client';

import type {
  HistoricalSource,
  SourceRelationship,
} from '../entities/source/model/sourceTypes';

type AtlasSourceRow = {
  current_repository: string | null;
  discovery_context: string | null;
  discovery_date_label: string | null;
  discovery_year: number | null;
  importance: number;
  kind: HistoricalSource['properties']['kind'];
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

type RelationRow = {
  note: string | null;
  object_agent_kind?: string | null;
  object_entity_slug?: string | null;
  object_entity_type?: string | null;
  object_label: string | null;
  predicate: string;
  slug: string;
};

const referencedInPrefix = 'referenced in:';

export async function listAtlasSourcesFromDb() {
  const pool = getPool();
  const { rows } = await pool.query<AtlasSourceRow>(atlasSourceSql());
  const relationships = await readRelationships(rows.map((row) => row.slug));

  return rows.map((row) =>
    mapAtlasSourceRow(row, relationships.get(row.slug) ?? []),
  );
}

export async function getAtlasSourceFromDb(slug: string) {
  const pool = getPool();
  const { rows } = await pool.query<AtlasSourceRow>(
    `${atlasSourceSql()} and cards.slug = $1`,
    [slug],
  );
  const row = rows[0];

  if (!row) {
    return null;
  }

  const relationships = await readRelationships([row.slug]);

  return mapAtlasSourceRow(row, relationships.get(row.slug) ?? []);
}

export function splitRelationRow(row: RelationRow) {
  const objectLabel = row.object_label?.trim();

  if (!objectLabel) {
    return null;
  }

  const predicate = row.predicate.trim();
  const isReferencedIn = predicate.toLowerCase().startsWith(referencedInPrefix);
  const relation = isReferencedIn
    ? predicate.slice(referencedInPrefix.length).trim() || 'source'
    : predicate;
  const relationship: SourceRelationship = {
    label: objectLabel,
    note: row.note ?? '',
    relation,
    targetEntityAgentKind: row.object_agent_kind,
    targetEntitySlug: row.object_entity_slug,
    targetEntityType: row.object_entity_type,
  };

  return {
    direction: isReferencedIn
      ? ('referencedIn' as const)
      : ('references' as const),
    relationship,
  };
}

function atlasSourceSql() {
  return `
    select
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
      ev.description as discovery_context
    from atlas_source_cards cards
    join catalog_records cr on cr.id = cards.id
    left join events ev on ev.id = cr.discovery_event_id
    where true
  `;
}

async function readRelationships(slugs: string[]) {
  const relationships = new Map<string, RelationRow[]>();

  if (slugs.length === 0) {
    return relationships;
  }

  const pool = getPool();
  const { rows } = await pool.query<RelationRow>(
    `
      select
        e.slug,
        er.predicate,
        target.slug as object_entity_slug,
        target.type::text as object_entity_type,
        target_agent.agent_type as object_agent_kind,
        er.object_label,
        er.note
      from entity_relations er
      join entities e on e.id = er.subject_entity_id
      left join entities target on target.id = er.object_entity_id
      left join agents target_agent on target_agent.entity_id = target.id
      where e.slug = any($1::text[])
      order by er.id::text
    `,
    [slugs],
  );

  rows.forEach((row) => {
    const sourceRelationships = relationships.get(row.slug) ?? [];
    sourceRelationships.push(row);
    relationships.set(row.slug, sourceRelationships);
  });

  return relationships;
}

function mapAtlasSourceRow(
  row: AtlasSourceRow,
  relationRows: RelationRow[],
): HistoricalSource {
  const references: SourceRelationship[] = [];
  const referencedIn: SourceRelationship[] = [];

  relationRows.forEach((relationRow) => {
    const split = splitRelationRow(relationRow);

    if (!split) {
      return;
    }

    if (split.direction === 'referencedIn') {
      referencedIn.push(split.relationship);
      return;
    }

    references.push(split.relationship);
  });

  return {
    id: row.slug,
    label: row.label,
    latitude: Number(row.latitude ?? 0),
    longitude: Number(row.longitude ?? 0),
    metrics: {
      importance: row.importance,
    },
    properties: {
      currentRepository: row.current_repository ?? '',
      discovered: row.discovery_date_label ?? '',
      discoveryContext: row.discovery_context ?? '',
      discoveredYear: row.discovery_year ?? 0,
      kind: row.kind,
      location: row.location_label ?? '',
      period: row.source_date_label ?? '',
      referencedIn,
      references,
      region: row.region ?? '',
      sourceYear: row.source_year ?? 0,
      summary: row.summary ?? '',
    },
  };
}
