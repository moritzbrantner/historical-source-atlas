import { keepPreviousData, useQuery } from '@tanstack/react-query';

import {
  createEmptyEntityOverlayResult,
  type EntityOverlayFilters,
} from '../../../domain/entityOverlayModel';
import { clientEntityOverlayRepository } from './clientEntityOverlayRepository';
import type { EntityOverlayRepository } from './entityOverlayRepository';

export const entityOverlayQueryKeys = {
  all: ['entity-overlays'] as const,
  list: (filters: EntityOverlayFilters | null) =>
    [...entityOverlayQueryKeys.all, 'list', filters] as const,
};

export function useEntityOverlayQuery({
  enabled,
  filters,
  repository = clientEntityOverlayRepository,
}: {
  enabled: boolean;
  filters: EntityOverlayFilters | null;
  repository?: EntityOverlayRepository;
}) {
  return useQuery({
    enabled: enabled && filters !== null,
    placeholderData: keepPreviousData,
    queryFn: () =>
      filters
        ? repository.listEntityOverlayFeatures(filters)
        : Promise.resolve(createEmptyEntityOverlayResult()),
    queryKey: entityOverlayQueryKeys.list(filters),
  });
}
