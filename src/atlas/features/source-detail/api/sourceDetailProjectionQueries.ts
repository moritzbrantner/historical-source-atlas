import { useQuery } from '@tanstack/react-query';

import { httpSourceDetailProjectionRepository } from './httpSourceDetailProjectionRepository';
import type { SourceDetailProjectionRepository } from './sourceDetailProjectionRepository';

export const sourceDetailProjectionQueryKeys = {
  detail: (slug: string) => ['atlas-v2', 'source-detail', slug] as const,
};

const repositoryScopes = new WeakMap<
  SourceDetailProjectionRepository,
  string
>();
let nextRepositoryScope = 0;

function queryNamespace(repository: SourceDetailProjectionRepository) {
  if (repository === httpSourceDetailProjectionRepository) {
    return 'default';
  }

  const existingScope = repositoryScopes.get(repository);

  if (existingScope) {
    return existingScope;
  }

  nextRepositoryScope += 1;
  const scope = `custom-${nextRepositoryScope}`;
  repositoryScopes.set(repository, scope);

  return scope;
}

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
    queryKey: [
      ...sourceDetailProjectionQueryKeys.detail(slug ?? ''),
      queryNamespace(repository),
    ] as const,
  });
}
