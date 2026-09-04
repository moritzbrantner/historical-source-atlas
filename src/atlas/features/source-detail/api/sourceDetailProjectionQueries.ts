import { useQuery } from '@tanstack/react-query';

import { httpSourceDetailProjectionRepository } from './httpSourceDetailProjectionRepository';
import type { SourceDetailProjectionRepository } from './sourceDetailProjectionRepository';

export const sourceDetailProjectionQueryKeys = {
  detail: (slug: string) => ['atlas-v2', 'source-detail', slug] as const,
};

export function useSourceDetailProjectionQuery(
  slug: string | undefined,
  repository: SourceDetailProjectionRepository = httpSourceDetailProjectionRepository,
) {
  return useQuery({
    enabled: slug !== undefined,
    queryFn: () =>
      slug === undefined
        ? Promise.resolve(null)
        : repository.getSourceDetailProjection(slug),
    queryKey: sourceDetailProjectionQueryKeys.detail(slug ?? ''),
  });
}
