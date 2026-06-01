'use client';

import {
  Badge,
  Button,
  LoadingState,
  PageContent,
  PageHeader,
  PageShell,
  PageTitle,
} from '@moritzbrantner/ui';

import { getSourcePath } from '../../app/routing';
import {
  useAtlasSourcesQuery,
  useSourceQuery,
} from '../../entities/source/api/sourceQueries';
import type { SourceRepository } from '../../entities/source/api/sourceRepository';
import { sourceKindLabels } from '../../entities/source/model/sourceConstants';
import type { HistoricalSource } from '../../entities/source/model/sourceTypes';
import { EmptyState } from '../../shared/ui/EmptyState';
import { SourceComparison } from './SourceComparison';
import { SourceFacts } from './SourceFacts';
import { SourceReferenceNetwork } from './SourceReferenceNetwork';

export type SourceToolPageKind = 'compare' | 'reference-network';

export function SourceToolPage({
  onBackToSource,
  onOpenSource,
  sourceId,
  sourceRepository,
  tool,
}: {
  onBackToSource: () => void;
  onOpenSource: (sourceId: string) => void;
  sourceId: string;
  sourceRepository?: SourceRepository;
  tool: SourceToolPageKind;
}) {
  const sourceQuery = useSourceQuery(sourceId, sourceRepository);
  const sourcesQuery = useAtlasSourcesQuery(sourceRepository);
  const source = sourceQuery.data;
  const sources = sourcesQuery.data ?? [];

  if (sourceQuery.isLoading) {
    return (
      <PageShell maxWidth="wide">
        <LoadingState label="Loading source tool" />
      </PageShell>
    );
  }

  if (!source) {
    return (
      <SourceToolNotFound
        onBackToSource={onBackToSource}
        onOpenSource={onOpenSource}
        sources={sources}
      />
    );
  }

  const toolTitle =
    tool === 'reference-network' ? 'Reference Network' : 'Compare Sources';

  return (
    <PageShell className="min-h-screen" maxWidth="wide">
      <nav
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        aria-label="Source tool navigation"
      >
        <Button type="button" variant="secondary" onClick={onBackToSource}>
          Back to source
        </Button>
        <a
          className="truncate text-sm font-semibold text-slate-500 no-underline"
          href={getSourcePath(source.id)}
        >
          {getSourcePath(source.id)}
        </a>
      </nav>

      <PageHeader className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,470px)]">
        <div className="grid content-center gap-4 rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-center gap-3">
            <Badge>{sourceKindLabels[source.properties.kind]}</Badge>
            <span className="text-sm font-semibold text-slate-500">
              {source.properties.region}
            </span>
          </div>
          <PageTitle>{toolTitle}</PageTitle>
          <p className="max-w-3xl text-base leading-7 text-slate-600">
            {source.label}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <SourceFacts source={source} />
        </div>
      </PageHeader>

      <PageContent>
        {tool === 'reference-network' ? (
          <SourceReferenceNetwork source={source} />
        ) : (
          <SourceComparison
            source={source}
            sources={sources}
            onOpenSource={onOpenSource}
          />
        )}
      </PageContent>
    </PageShell>
  );
}

function SourceToolNotFound({
  onBackToSource,
  onOpenSource,
  sources,
}: {
  onBackToSource: () => void;
  onOpenSource: (sourceId: string) => void;
  sources: HistoricalSource[];
}) {
  return (
    <PageShell maxWidth="wide">
      <nav aria-label="Source tool navigation">
        <Button type="button" variant="secondary" onClick={onBackToSource}>
          Back to source
        </Button>
      </nav>
      <EmptyState
        title="Source not found"
        description="Select a source from the atlas to open its tools."
        actions={
          <div className="grid gap-2">
            {sources.map((source) => (
              <Button
                key={source.id}
                type="button"
                variant="secondary"
                onClick={() => {
                  onOpenSource(source.id);
                }}
              >
                {source.label}
              </Button>
            ))}
          </div>
        }
      />
    </PageShell>
  );
}
