import type {
  EntityOverlayFilters,
  EntityOverlayResult,
} from '../../../domain/entityOverlayModel';

export type EntityOverlayRepository = {
  listEntityOverlayFeatures: (
    filters: EntityOverlayFilters,
  ) => Promise<EntityOverlayResult>;
};
