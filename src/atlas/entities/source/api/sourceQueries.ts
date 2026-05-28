import { useQuery } from '@tanstack/react-query';

import { clientSourceRepository } from './clientSourceRepository';
import type { SourceRepository } from './sourceRepository';

export const sourceQueryKeys = {
  all: ['sources'] as const,
  detail: (slug: string) => [...sourceQueryKeys.all, 'detail', slug] as const,
  list: () => [...sourceQueryKeys.all, 'list'] as const,
};

export type SourceQueryKeys = typeof sourceQueryKeys;

const repositoryScopes = new WeakMap<SourceRepository, string>();
let nextRepositoryScope = 0;

function queryNamespace(repository: SourceRepository) {
  if (repository === clientSourceRepository) {
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

export function useAtlasSourcesQuery(
  repository: SourceRepository = clientSourceRepository,
) {
  return useQuery({
    queryFn: () => repository.listAtlasSources(),
    queryKey: [...sourceQueryKeys.list(), queryNamespace(repository)] as const,
  });
}

export function useSourceQuery(
  slug: string | undefined,
  repository: SourceRepository = clientSourceRepository,
) {
  return useQuery({
    enabled: slug !== undefined,
    queryFn: () =>
      slug === undefined
        ? Promise.resolve(null)
        : repository.getSourceBySlug(slug),
    queryKey: [
      ...sourceQueryKeys.detail(slug ?? ''),
      queryNamespace(repository),
    ] as const,
  });
}
