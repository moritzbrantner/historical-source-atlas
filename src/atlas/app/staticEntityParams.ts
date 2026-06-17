import { routing } from '@/i18n/routing';
import {
  type AtlasEntityRouteType,
  getEntityRouteType,
} from '../domain/atlasTaxonomy';
import { staticAtlasEntityDetails } from '../entities/entity/api/staticEntityData';

export function generateStaticEntityParams(routeType: AtlasEntityRouteType) {
  return routing.locales.flatMap((locale) =>
    staticAtlasEntityDetails
      .filter(
        (detail) =>
          getEntityRouteType({
            agentKind:
              detail.typed?.type === 'agent'
                ? detail.typed.agentKind
                : undefined,
            type: detail.entity.type,
          }) === routeType,
      )
      .map((detail) => ({ locale, slug: detail.entity.slug })),
  );
}
