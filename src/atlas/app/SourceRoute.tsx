'use client';

import { useRouter } from '@/i18n/navigation';

import { SourcePage } from '../features/source-detail/SourcePage';
import {
  SourceToolPage,
  type SourceToolPageKind,
} from '../features/source-detail/SourceToolPage';
import {
  getSourceComparisonPath,
  getSourcePath,
  getSourceReferenceNetworkPath,
} from './routing';

export function SourceRoute({ sourceId }: { sourceId: string }) {
  const router = useRouter();

  return (
    <SourcePage
      sourceId={sourceId}
      onBackToAtlas={() => {
        router.push('/atlas');
      }}
      onOpenComparison={() => {
        router.push(getSourceComparisonPath(sourceId));
      }}
      onOpenReferenceNetwork={() => {
        router.push(getSourceReferenceNetworkPath(sourceId));
      }}
      onOpenSource={(nextSourceId) => {
        router.push(getSourcePath(nextSourceId));
      }}
    />
  );
}

export function SourceToolRoute({
  sourceId,
  tool,
}: {
  sourceId: string;
  tool: SourceToolPageKind;
}) {
  const router = useRouter();

  return (
    <SourceToolPage
      sourceId={sourceId}
      tool={tool}
      onBackToSource={() => {
        router.push(getSourcePath(sourceId));
      }}
      onOpenSource={(nextSourceId) => {
        router.push(getSourcePath(nextSourceId));
      }}
    />
  );
}
