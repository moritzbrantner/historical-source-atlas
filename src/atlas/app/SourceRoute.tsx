'use client';

import { useRouter } from '@/i18n/navigation';

import { SourcePage } from '../features/source-detail/SourcePage';
import { getSourcePath } from './routing';

export function SourceRoute({ sourceId }: { sourceId: string }) {
  const router = useRouter();

  return (
    <SourcePage
      sourceId={sourceId}
      onBackToAtlas={() => {
        router.push('/atlas');
      }}
      onOpenSource={(nextSourceId) => {
        router.push(getSourcePath(nextSourceId));
      }}
    />
  );
}
