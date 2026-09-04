import type { SourceDetailProjection } from '../../../domain/v2/projections';
import type { SourceDetailProjectionRepository } from './sourceDetailProjectionRepository';

async function readSourceDetailProjection(
  slug: string,
): Promise<SourceDetailProjection | null> {
  const response = await fetch(
    `/api/atlas/v2/sources/${encodeURIComponent(slug)}/projection`,
    {
      headers: {
        accept: 'application/json',
      },
    },
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Atlas v2 projection request failed with ${response.status}`);
  }

  return response.json() as Promise<SourceDetailProjection>;
}

export const httpSourceDetailProjectionRepository: SourceDetailProjectionRepository = {
  getSourceDetailProjection: readSourceDetailProjection,
};
