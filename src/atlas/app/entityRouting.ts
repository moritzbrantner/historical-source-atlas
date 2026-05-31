import type { EntityType } from '../domain/dataModel';

export type AtlasEntityRouteType =
  | 'agents'
  | 'assets'
  | 'entities'
  | 'events'
  | 'inscriptions'
  | 'locations'
  | 'manuscripts'
  | 'objects'
  | 'persons'
  | 'texts';

export function getEntityRouteType(entity: {
  agentKind?: string | null;
  type: EntityType;
}): AtlasEntityRouteType {
  if (entity.type === 'agent') {
    return entity.agentKind === 'person' ? 'persons' : 'agents';
  }

  if (entity.type === 'place') {
    return 'locations';
  }

  if (entity.type === 'event') {
    return 'events';
  }

  if (
    entity.type === 'text_work' ||
    entity.type === 'text_witness' ||
    entity.type === 'text_edition'
  ) {
    return 'texts';
  }

  if (entity.type === 'manuscript_unit') {
    return 'manuscripts';
  }

  if (entity.type === 'inscription') {
    return 'inscriptions';
  }

  if (entity.type === 'physical_object' || entity.type === 'object_part') {
    return 'objects';
  }

  if (entity.type === 'asset') {
    return 'assets';
  }

  return 'entities';
}

export function getEntityPath(entity: {
  agentKind?: string | null;
  slug: string;
  type: EntityType;
}) {
  return `/atlas/${getEntityRouteType(entity)}/${encodeURIComponent(entity.slug)}`;
}
