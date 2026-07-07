import { getPool } from '@/src/db/client';

import { getEntityPath } from '../app/entityRouting';
import {
  createEmptyEntityOverlayResult,
  type EntityOverlayAreaProperties,
  type EntityOverlayCategory,
  type EntityOverlayFilters,
  type EntityOverlayGeometry,
  type EntityOverlayPoint,
  type EntityOverlayResult,
} from '../domain/entityOverlayModel';

type OverlayPointRow = {
  category: 'city' | 'person';
  date_label: string | null;
  evidence_kind: 'dated' | 'undated_fallback';
  id: string;
  label: string;
  latitude: number | string;
  linked_source_count: number | string;
  longitude: number | string;
  route_agent_kind: string | null;
  route_type: 'agent' | 'place';
  slug: string;
  summary: string | null;
};

type OverlayAreaRow = {
  date_label: string | null;
  evidence_kind: 'dated' | 'undated_fallback';
  geometry: string;
  id: string;
  label: string;
  linked_source_count: number | string;
  route_type: 'place';
  slug: string;
  summary: string | null;
};

const linkedSourceCountCte = `
  linked_source_counts as (
    select entity_id, count(distinct source_id)::int as linked_source_count
    from (
      select cr.entity_id, cards.id as source_id
      from catalog_records cr
      join atlas_source_cards cards on cards.id = cr.id

      union

      select crl.entity_id, cards.id as source_id
      from catalog_record_links crl
      join atlas_source_cards cards on cards.id = crl.catalog_record_id

      union

      select em.entity_id, cards.id as source_id
      from entity_mentions em
      join text_units tu on tu.id = em.text_unit_id
      join text_editions te on te.id = tu.text_edition_id
      join catalog_record_links source_link
        on source_link.entity_id = te.entity_id
        and source_link.role = 'evidence_text_edition'
      join atlas_source_cards cards on cards.id = source_link.catalog_record_id

      union

      select er.object_entity_id as entity_id, cards.id as source_id
      from entity_relations er
      join catalog_records cr on cr.entity_id = er.subject_entity_id
      join atlas_source_cards cards on cards.id = cr.id
      where er.object_entity_id is not null

      union

      select er.subject_entity_id as entity_id, cards.id as source_id
      from entity_relations er
      join catalog_records cr on cr.entity_id = er.object_entity_id
      join atlas_source_cards cards on cards.id = cr.id
      where er.object_entity_id is not null
    ) linked
    group by entity_id
  )
`;

export async function listAtlasEntityOverlayFeaturesFromDb(
  filters: EntityOverlayFilters,
): Promise<EntityOverlayResult> {
  if (filters.categories.length === 0) {
    return createEmptyEntityOverlayResult();
  }

  const pool = getPool();
  const values = [
    filters.bounds.west,
    filters.bounds.south,
    filters.bounds.east,
    filters.bounds.north,
    filters.timeRange.min,
    filters.timeRange.max,
  ];
  const [cityRows, countryRows, personRows] = await Promise.all([
    filters.categories.includes('city')
      ? pool.query<OverlayPointRow>(citySql(), values)
      : Promise.resolve({ rows: [] }),
    filters.categories.includes('country')
      ? pool.query<OverlayAreaRow>(countrySql(), values)
      : Promise.resolve({ rows: [] }),
    filters.categories.includes('person')
      ? pool.query<OverlayPointRow>(personSql(), values)
      : Promise.resolve({ rows: [] }),
  ]);

  const points = [...cityRows.rows, ...personRows.rows]
    .map(mapPointRow)
    .sort(compareOverlayPoints);
  const areaFeatures = countryRows.rows.map((row) => ({
    geometry: parseGeometry(row.geometry),
    id: row.id,
    properties: mapAreaProperties(row),
    type: 'Feature' as const,
  }));

  return {
    areas: {
      features: areaFeatures,
      type: 'FeatureCollection',
    },
    points,
    summary: {
      city: cityRows.rows.length,
      country: countryRows.rows.length,
      person: personRows.rows.length,
    },
  };
}

function citySql() {
  return `
    with ${linkedSourceCountCte}
    select
      e.id::text as id,
      e.slug,
      e.preferred_label as label,
      e.summary,
      'city' as category,
      case when hg.id is null then 'undated_fallback' else 'dated' end as evidence_kind,
      hg.date_label,
      st_y(st_transform(st_pointonsurface(coalesce(hg.geom, p.geom)), 4326)) as latitude,
      st_x(st_transform(st_pointonsurface(coalesce(hg.geom, p.geom)), 4326)) as longitude,
      coalesce(lsc.linked_source_count, 0) as linked_source_count,
      e.type::text as route_type,
      null::text as route_agent_kind
    from entities e
    join places p on p.entity_id = e.id
    left join lateral (
      select historical_geometries.*
      from historical_geometries
      where historical_geometries.entity_id = e.id
        and ${dateRangeOverlapSql('historical_geometries.date_start_year', 'historical_geometries.date_end_year')}
        and st_intersects(
          historical_geometries.geom,
          st_makeenvelope($1, $2, $3, $4, 4326)
        )
      order by historical_geometries.date_start_year nulls first, historical_geometries.id
      limit 1
    ) hg on true
    left join linked_source_counts lsc on lsc.entity_id = e.id
    where e.editorial_status = 'published'
      and p.place_type = 'city'
      and coalesce(hg.geom, p.geom) is not null
      and st_intersects(coalesce(hg.geom, p.geom), st_makeenvelope($1, $2, $3, $4, 4326))
    order by linked_source_count desc, label, slug
  `;
}

function countrySql() {
  return `
    with ${linkedSourceCountCte}
    select
      e.id::text as id,
      e.slug,
      e.preferred_label as label,
      e.summary,
      case when hg.id is null then 'undated_fallback' else 'dated' end as evidence_kind,
      hg.date_label,
      st_asgeojson(coalesce(hg.geom, p.geom)) as geometry,
      coalesce(lsc.linked_source_count, 0) as linked_source_count,
      e.type::text as route_type
    from entities e
    join places p on p.entity_id = e.id
    left join lateral (
      select historical_geometries.*
      from historical_geometries
      where historical_geometries.entity_id = e.id
        and ${dateRangeOverlapSql('historical_geometries.date_start_year', 'historical_geometries.date_end_year')}
        and st_intersects(
          historical_geometries.geom,
          st_makeenvelope($1, $2, $3, $4, 4326)
        )
      order by historical_geometries.date_start_year nulls first, historical_geometries.id
      limit 1
    ) hg on true
    left join linked_source_counts lsc on lsc.entity_id = e.id
    where e.editorial_status = 'published'
      and p.place_type = 'country'
      and coalesce(hg.geom, p.geom) is not null
      and st_intersects(coalesce(hg.geom, p.geom), st_makeenvelope($1, $2, $3, $4, 4326))
    order by linked_source_count desc, label, slug
  `;
}

function personSql() {
  return `
    with
      ${linkedSourceCountCte},
      presence_places as (
        select
          ev.id as event_id,
          ep.place_id
        from events ev
        join event_places ep on ep.event_id = ev.id

        union

        select
          ev.id as event_id,
          ev.place_id
        from events ev
        where ev.place_id is not null
      )
    select
      concat(e.id::text, ':', ev.id::text, ':', p.id::text) as id,
      e.slug,
      e.preferred_label as label,
      e.summary,
      'person' as category,
      case
        when ${dateRangeOverlapSql('ev.date_start_year', 'ev.date_end_year')} then 'dated'
        else 'undated_fallback'
      end as evidence_kind,
      ev.date_label,
      st_y(st_transform(st_pointonsurface(coalesce(hg.geom, p.geom)), 4326)) as latitude,
      st_x(st_transform(st_pointonsurface(coalesce(hg.geom, p.geom)), 4326)) as longitude,
      coalesce(lsc.linked_source_count, 0) as linked_source_count,
      e.type::text as route_type,
      a.agent_type as route_agent_kind
    from entities e
    join agents a on a.entity_id = e.id
    join event_agents ea on ea.agent_id = a.id
    join events ev on ev.id = ea.event_id
    join presence_places pp on pp.event_id = ev.id
    join places p on p.id = pp.place_id
    left join lateral (
      select historical_geometries.*
      from historical_geometries
      where historical_geometries.entity_id = p.entity_id
        and ${dateRangeOverlapSql('historical_geometries.date_start_year', 'historical_geometries.date_end_year')}
        and st_intersects(
          historical_geometries.geom,
          st_makeenvelope($1, $2, $3, $4, 4326)
        )
      order by historical_geometries.date_start_year nulls first, historical_geometries.id
      limit 1
    ) hg on true
    left join linked_source_counts lsc on lsc.entity_id = e.id
    where e.editorial_status = 'published'
      and a.agent_type = 'person'
      and coalesce(hg.geom, p.geom) is not null
      and st_intersects(coalesce(hg.geom, p.geom), st_makeenvelope($1, $2, $3, $4, 4326))
      and (
        ${dateRangeOverlapSql('ev.date_start_year', 'ev.date_end_year')}
        or (
          ev.date_start_year is null
          and ev.date_end_year is null
          and ${dateRangeOverlapSql('a.date_start_year', 'a.date_end_year')}
        )
      )
    order by linked_source_count desc, label, slug
  `;
}

function dateRangeOverlapSql(startColumn: string, endColumn: string) {
  return `(
    (${startColumn} is not null or ${endColumn} is not null)
    and coalesce(${startColumn}, -2147483648) <= $6
    and coalesce(${endColumn}, 2147483647) >= $5
  )`;
}

function mapPointRow(row: OverlayPointRow): EntityOverlayPoint {
  const linkedSourceCount = Number(row.linked_source_count);

  return {
    id: row.id,
    label: row.label,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    metrics: { sourceCount: linkedSourceCount },
    properties: {
      category: row.category,
      dateLabel: row.date_label,
      evidenceKind: row.evidence_kind,
      linkedSourceCount,
      routePath: getEntityPath({
        agentKind: row.route_agent_kind,
        slug: row.slug,
        type: row.route_type,
      }),
      slug: row.slug,
      summary: row.summary,
    },
  };
}

function mapAreaProperties(row: OverlayAreaRow): EntityOverlayAreaProperties {
  return {
    category: 'country',
    dateLabel: row.date_label,
    evidenceKind: row.evidence_kind,
    id: row.id,
    label: row.label,
    linkedSourceCount: Number(row.linked_source_count),
    routePath: getEntityPath({
      slug: row.slug,
      type: row.route_type,
    }),
    slug: row.slug,
    summary: row.summary,
  };
}

function parseGeometry(value: string): EntityOverlayGeometry {
  return JSON.parse(value) as EntityOverlayGeometry;
}

function compareOverlayPoints(a: EntityOverlayPoint, b: EntityOverlayPoint) {
  return (
    b.properties.linkedSourceCount - a.properties.linkedSourceCount ||
    a.label.localeCompare(b.label)
  );
}
