import type { SourceDetailProjection } from '../../../domain/v2/projections';

export interface SourceDetailProjectionRepository {
  getSourceDetailProjection(
    slug: string,
  ): Promise<SourceDetailProjection | null>;
}
