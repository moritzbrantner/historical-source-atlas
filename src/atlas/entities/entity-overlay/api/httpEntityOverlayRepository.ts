import type { EntityOverlayFilters } from '../../../domain/entityOverlayModel';
import type { EntityOverlayRepository } from './entityOverlayRepository';

export const httpEntityOverlayRepository: EntityOverlayRepository = {
  async listEntityOverlayFeatures(filters) {
    const searchParams = new URLSearchParams({
      categories: filters.categories.join(','),
      east: String(filters.bounds.east),
      maxYear: String(filters.timeRange.max),
      minYear: String(filters.timeRange.min),
      north: String(filters.bounds.north),
      south: String(filters.bounds.south),
      west: String(filters.bounds.west),
    });
    const response = await fetch(`/api/atlas/entity-overlays?${searchParams}`, {
      headers: { accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(
        `Atlas entity overlay API request failed with ${response.status}`,
      );
    }

    return response.json();
  },
};
