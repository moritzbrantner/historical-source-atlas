import { useQuery } from '@tanstack/react-query';

import { clientEntityRepository } from './clientEntityRepository';
import type { AtlasEntityFilters, EntityRepository } from './entityRepository';

export const entityQueryKeys = {
  all: ['atlasEntities'] as const,
  detail: (slug: string) => [...entityQueryKeys.all, 'detail', slug] as const,
  list: (filters: AtlasEntityFilters) =>
    [...entityQueryKeys.all, 'list', filters] as const,
};

const repositoryScopes = new WeakMap<EntityRepository, string>();
let nextRepositoryScope = 0;

function queryNamespace(repository: EntityRepository) {
  if (repository === clientEntityRepository) {
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

export function useAtlasEntitiesQuery(
  filters: AtlasEntityFilters = {},
  repository: EntityRepository = clientEntityRepository,
) {
  return useQuery({
    queryFn: () => repository.listEntities(filters),
    queryKey: [
      ...entityQueryKeys.list(filters),
      queryNamespace(repository),
    ] as const,
  });
}

export function useAtlasEntityQuery(
  slug: string | undefined,
  repository: EntityRepository = clientEntityRepository,
) {
  return useQuery({
    enabled: slug !== undefined,
    queryFn: () =>
      slug === undefined
        ? Promise.resolve(null)
        : repository.getEntityBySlug(slug),
    queryKey: [
      ...entityQueryKeys.detail(slug ?? ''),
      queryNamespace(repository),
    ] as const,
  });
}
