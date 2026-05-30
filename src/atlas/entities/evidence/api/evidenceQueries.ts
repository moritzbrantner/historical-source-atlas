import { useQuery } from '@tanstack/react-query';

import { clientEvidenceRepository } from './clientEvidenceRepository';
import type { EvidenceRepository } from './evidenceRepository';

export const evidenceQueryKeys = {
  all: ['evidence'] as const,
  source: (slug: string) => [...evidenceQueryKeys.all, 'source', slug] as const,
};

const repositoryScopes = new WeakMap<EvidenceRepository, string>();
let nextRepositoryScope = 0;

function queryNamespace(repository: EvidenceRepository) {
  if (repository === clientEvidenceRepository) {
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

export function useEvidenceReviewQuery(
  slug: string | undefined,
  repository: EvidenceRepository = clientEvidenceRepository,
) {
  return useQuery({
    enabled: slug !== undefined,
    queryFn: () =>
      slug === undefined
        ? Promise.resolve(null)
        : repository.getEvidenceBySourceSlug(slug),
    queryKey: [
      ...evidenceQueryKeys.source(slug ?? ''),
      queryNamespace(repository),
    ] as const,
  });
}
