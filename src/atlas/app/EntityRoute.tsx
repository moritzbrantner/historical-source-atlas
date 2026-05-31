'use client';

import { useRouter } from '@/i18n/navigation';

import { EntityPage } from '../features/entity-detail/EntityPage';
import { getEntityPath } from './entityRouting';

export function EntityRoute({ slug }: { slug: string }) {
  const router = useRouter();

  return (
    <EntityPage
      slug={slug}
      onBackToAtlas={() => {
        router.push('/atlas');
      }}
      onOpenEntity={(entity) => {
        router.push(getEntityPath(entity));
      }}
      onOpenSource={(sourceSlug) => {
        router.push(`/atlas/sources/${encodeURIComponent(sourceSlug)}`);
      }}
    />
  );
}
