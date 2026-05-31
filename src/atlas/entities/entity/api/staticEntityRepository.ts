import type { EntitySummary } from '../../../domain/entityModel';
import type { AtlasEntityFilters, EntityRepository } from './entityRepository';
import {
  staticAtlasEntityDetails,
  staticAtlasEntitySummaries,
} from './staticEntityData';

const detailBySlug = new Map(
  staticAtlasEntityDetails.map((detail) => [detail.entity.slug, detail]),
);

function matchesFilters(summary: EntitySummary, filters: AtlasEntityFilters) {
  if (filters.type && summary.type !== filters.type) {
    return false;
  }

  if (
    filters.kind &&
    summary.displayCategory.toLowerCase() !== filters.kind.toLowerCase()
  ) {
    return false;
  }

  const query = filters.query?.trim().toLowerCase();

  if (!query) {
    return true;
  }

  return [
    summary.preferredLabel,
    summary.summary ?? '',
    summary.displayCategory,
    summary.slug,
  ]
    .join(' ')
    .toLowerCase()
    .includes(query);
}

export const staticEntityRepository: EntityRepository = {
  async getEntityBySlug(slug) {
    return detailBySlug.get(slug) ?? null;
  },
  async getEntityLinkedSources(slug) {
    return detailBySlug.get(slug)?.linkedSources ?? null;
  },
  async getEntityMentions(slug) {
    return detailBySlug.get(slug)?.mentions ?? null;
  },
  async getEntityRelations(slug) {
    const detail = detailBySlug.get(slug);

    if (!detail) {
      return null;
    }

    return {
      incomingRelations: detail.incomingRelations,
      outgoingRelations: detail.outgoingRelations,
    };
  },
  async listEntities(filters = {}) {
    return staticAtlasEntitySummaries.filter((summary) =>
      matchesFilters(summary, filters),
    );
  },
};
