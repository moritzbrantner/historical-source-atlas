// Relations, mentions and linked sources of a published entity.
import { getPool } from '@/src/db/client';
import {
  type MentionRow,
  type RelationRow,
  type SourceCardRow,
  mapMentionRow,
  mapRelationRow,
  mapSourceCardRow,
} from './atlasEntityRows';

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
