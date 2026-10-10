import { getPool } from '@/src/db/client';
import type { AtlasEntityDetail } from '../domain/entityPageModel';
import type { AtlasEntityFilters } from '../entities/entity/api/entityRepository';
import {
  type EntitySummaryRow,
  buildFacts,
  mapEntitySummaryRow,
  validEntityTypes,
} from './atlasEntityRows';
import {
  getAtlasEntityLinkedSourcesFromDb,
  getAtlasEntityMentionsFromDb,
  getAtlasEntityRelationsFromDb,
} from './atlasEntityLinks';
import {
  getPublishedEntityBySlug,
  readAliases,
  readTypedEntity,
} from './atlasEntityTypedReaders';

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

export {
  getAtlasEntityLinkedSourcesFromDb,
  getAtlasEntityMentionsFromDb,
  getAtlasEntityRelationsFromDb,
} from './atlasEntityLinks';
