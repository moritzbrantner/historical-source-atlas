import type { EntityType } from '../domain/dataModel';
import { getEntityRouteType } from '../domain/atlasTaxonomy';
export type { AtlasEntityRouteType } from '../domain/atlasTaxonomy';
export { getEntityRouteType };

export function getEntityPath(entity: {
  agentKind?: string | null;
  slug: string;
  type: EntityType;
}) {
  return `/atlas/${getEntityRouteType(entity)}/${encodeURIComponent(entity.slug)}`;
}
