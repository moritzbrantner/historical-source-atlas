'use client';

import { useRouter } from 'next/navigation';

import { AtlasPage } from '../features/atlas/AtlasPage';
import { getSourcePath } from './routing';

export function AtlasRoute() {
  const router = useRouter();

  return (
    <AtlasPage
      onOpenSource={(sourceId) => {
        router.push(getSourcePath(sourceId));
      }}
    />
  );
}
