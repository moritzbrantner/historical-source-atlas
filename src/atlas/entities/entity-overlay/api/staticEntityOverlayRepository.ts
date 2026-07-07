import { getEntityPath } from '../../../app/entityRouting';
import {
  createEmptyEntityOverlayResult,
  dateRangeOverlapsTimeRange,
  isPointInEntityOverlayBounds,
  type EntityOverlayPoint,
  type EntityOverlayResult,
} from '../../../domain/entityOverlayModel';
import type { AtlasEntityDetail } from '../../../domain/entityPageModel';
import { staticAtlasEntityDetails } from '../../entity/api/staticEntityData';
import type { EntityOverlayRepository } from './entityOverlayRepository';

export const staticEntityOverlayRepository: EntityOverlayRepository = {
  async listEntityOverlayFeatures(filters) {
    const result = createEmptyEntityOverlayResult();

    if (filters.categories.includes('city')) {
      const cityPoints = staticAtlasEntityDetails.flatMap((detail) =>
        mapStaticPlacePoint(detail, 'city', filters),
      );
      result.points.push(...cityPoints);
      result.summary.city = cityPoints.length;
    }

    if (filters.categories.includes('person')) {
      const personPoints = staticAtlasEntityDetails.flatMap((detail) =>
        mapStaticPersonPoints(detail, filters),
      );
      result.points.push(...personPoints);
      result.summary.person = personPoints.length;
    }

    if (filters.categories.includes('country')) {
      result.summary.country = result.areas.features.length;
    }

    result.points.sort(compareOverlayPoints);

    return result;
  },
};

function mapStaticPlacePoint(
  detail: AtlasEntityDetail,
  category: 'city',
  filters: Parameters<EntityOverlayRepository['listEntityOverlayFeatures']>[0],
): EntityOverlayPoint[] {
  const typed = detail.typed;

  if (
    !typed ||
    typed.type !== 'place' ||
    typed.placeKind !== category ||
    typed.geometry?.type !== 'Point'
  ) {
    return [];
  }

  const [longitude, latitude] = typed.geometry.coordinates as [number, number];

  if (!isPointInEntityOverlayBounds({ latitude, longitude }, filters.bounds)) {
    return [];
  }

  return [
    {
      id: detail.entity.id,
      label: detail.entity.preferredLabel,
      latitude,
      longitude,
      metrics: { sourceCount: detail.linkedSources.length },
      properties: {
        category,
        dateLabel: null,
        evidenceKind: 'undated_fallback',
        linkedSourceCount: detail.linkedSources.length,
        routePath: getEntityPath({
          slug: detail.entity.slug,
          type: detail.entity.type,
        }),
        slug: detail.entity.slug,
        summary: detail.entity.summary,
      },
    },
  ];
}

function mapStaticPersonPoints(
  detail: AtlasEntityDetail,
  filters: Parameters<EntityOverlayRepository['listEntityOverlayFeatures']>[0],
): EntityOverlayPoint[] {
  const typed = detail.typed;

  if (!typed || typed.type !== 'agent' || typed.agentKind !== 'person') {
    return [];
  }

  return staticAtlasEntityDetails.flatMap((candidate) => {
    const event = candidate.typed;

    if (!event || event.type !== 'event') {
      return [];
    }

    const eventHasAgent = event.agents.some(
      (agent) => agent.agent.id === detail.entity.id,
    );

    if (!eventHasAgent) {
      return [];
    }

    const eventRange = {
      endYear: event.dateRange.endYear,
      startYear: event.dateRange.startYear,
    };
    const agentRange = {
      endYear: typed.dateRange.endYear,
      startYear: typed.dateRange.startYear,
    };
    const eventMatches = dateRangeOverlapsTimeRange(
      eventRange,
      filters.timeRange,
    );
    const agentMatches = dateRangeOverlapsTimeRange(
      agentRange,
      filters.timeRange,
    );

    if (!eventMatches && !agentMatches) {
      return [];
    }

    return event.places.flatMap(({ place }) => {
      if (place.geometry?.type !== 'Point') {
        return [];
      }

      const [longitude, latitude] = place.geometry.coordinates as [
        number,
        number,
      ];

      if (
        !isPointInEntityOverlayBounds({ latitude, longitude }, filters.bounds)
      ) {
        return [];
      }

      return [
        {
          id: `${detail.entity.id}:${event.id}:${place.id}`,
          label: detail.entity.preferredLabel,
          latitude,
          longitude,
          metrics: { sourceCount: detail.linkedSources.length },
          properties: {
            category: 'person' as const,
            dateLabel: event.dateRange.label,
            evidenceKind: eventMatches ? 'dated' : 'undated_fallback',
            linkedSourceCount: detail.linkedSources.length,
            routePath: getEntityPath({
              agentKind: typed.agentKind,
              slug: detail.entity.slug,
              type: detail.entity.type,
            }),
            slug: detail.entity.slug,
            summary: detail.entity.summary,
          },
        },
      ];
    });
  });
}

function compareOverlayPoints(a: EntityOverlayPoint, b: EntityOverlayPoint) {
  return (
    b.properties.linkedSourceCount - a.properties.linkedSourceCount ||
    a.label.localeCompare(b.label)
  );
}
