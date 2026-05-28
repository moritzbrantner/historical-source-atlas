import { useQuery } from '@tanstack/react-query';

import { httpSourceRepository } from './httpSourceRepository';

export const sourceQueryKeys = {
  all: ['sources'] as const,
  detail: (slug: string) => [...sourceQueryKeys.all, 'detail', slug] as const,
  list: () => [...sourceQueryKeys.all, 'list'] as const,
};

export type SourceQueryKeys = typeof sourceQueryKeys;

export function useAtlasSourcesQuery() {
  return useQuery({
    queryFn: () => httpSourceRepository.listAtlasSources(),
    queryKey: sourceQueryKeys.list(),
  });
}

export function useSourceQuery(slug: string | undefined) {
  return useQuery({
    enabled: slug !== undefined,
    queryFn: () =>
      slug === undefined
        ? Promise.resolve(null)
        : httpSourceRepository.getSourceBySlug(slug),
    queryKey: sourceQueryKeys.detail(slug ?? ''),
  });
}
