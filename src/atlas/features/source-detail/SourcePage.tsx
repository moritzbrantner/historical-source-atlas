'use client';

import { GitCompareArrows, Network } from 'lucide-react';
import type { ReactNode } from 'react';

import {
  Badge,
  Button,
  LoadingState,
  PageContent,
  PageHeader,
  PageShell,
  PageTitle,
  Surface,
  SurfaceContent,
  SurfaceHeader,
  SurfaceTitle,
} from '@moritzbrantner/ui';

import { getSourcePath } from '../../app/routing';
import {
  useAtlasSourcesQuery,
  useSourceQuery,
} from '../../entities/source/api/sourceQueries';
import type { SourceRepository } from '../../entities/source/api/sourceRepository';
import { sourceKindLabels } from '../../entities/source/model/sourceConstants';
import type { HistoricalSource } from '../../entities/source/model/sourceTypes';
import { MetricStats } from '../../shared/ui/MetricStats';
import { EmptyState } from '../../shared/ui/EmptyState';
import { EvidenceReviewPanel } from '../evidence-review/EvidenceReviewPanel';
import { RelatedSources } from './RelatedSources';
import { SourceFacts } from './SourceFacts';
import { SourceLocationMap } from './SourceLocationMap';

export function SourcePage({
  onBackToAtlas,
  onOpenComparison,
  onOpenReferenceNetwork,
  onOpenSource,
  sourceRepository,
  sourceId,
}: {
  onBackToAtlas: () => void;
  onOpenComparison: () => void;
  onOpenReferenceNetwork: () => void;
  onOpenSource: (sourceId: string) => void;
  sourceRepository?: SourceRepository;
  sourceId: string;
}) {
  const sourceQuery = useSourceQuery(sourceId, sourceRepository);
  const sourcesQuery = useAtlasSourcesQuery(sourceRepository);
  const source = sourceQuery.data;
  const sources = sourcesQuery.data ?? [];

  if (sourceQuery.isLoading) {
    return (
      <PageShell maxWidth="wide">
        <LoadingState label="Loading source page" />
      </PageShell>
    );
  }

  if (!source) {
    return (
      <SourceNotFound
        sources={sources}
        onBackToAtlas={onBackToAtlas}
        onOpenSource={onOpenSource}
      />
    );
  }

  return (
    <PageShell className="min-h-screen" maxWidth="wide">
      <nav
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        aria-label="Source page navigation"
      >
        <Button type="button" variant="secondary" onClick={onBackToAtlas}>
          Back to atlas
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
          <PageTitle>{source.label}</PageTitle>
          <p className="max-w-3xl text-base leading-7 text-slate-600">
            {source.properties.summary}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <SourceFacts source={source} />
        </div>
      </PageHeader>

      <PageContent>
        <section
          className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,410px)]"
          aria-label={`${source.label} source page`}
        >
          <article className="grid gap-4">
            <Surface>
              <SurfaceHeader>
                <SurfaceTitle>Detailed Information</SurfaceTitle>
              </SurfaceHeader>
              <SurfaceContent className="grid gap-4">
                <p className="leading-7 text-slate-600">
                  {source.properties.discoveryContext}
                </p>
                <MetricStats
                  stats={[
                    { label: 'atlas weight', value: source.metrics.importance },
                    {
                      label: 'referenced by',
                      value: source.properties.referencedIn.length,
                    },
                    {
                      label: 'references',
                      value: source.properties.references.length,
                    },
                  ]}
                />
              </SurfaceContent>
            </Surface>

            <SourceToolLinks
              source={source}
              onOpenComparison={onOpenComparison}
              onOpenReferenceNetwork={onOpenReferenceNetwork}
            />
          </article>

          <aside
            className="grid gap-4"
            aria-label={`${source.label} map and related sources`}
          >
            <SourceLocationMap source={source} />
            <RelatedSources
              source={source}
              sources={sources}
              onOpenSource={onOpenSource}
            />
          </aside>
        </section>

        <EvidenceReviewPanel source={source} />
      </PageContent>
    </PageShell>
  );
}

function SourceToolLinks({
  onOpenComparison,
  onOpenReferenceNetwork,
  source,
}: {
  onOpenComparison: () => void;
  onOpenReferenceNetwork: () => void;
  source: HistoricalSource;
}) {
  return (
    <Surface>
      <SurfaceHeader>
        <SurfaceTitle>Research Tools</SurfaceTitle>
      </SurfaceHeader>
      <SurfaceContent>
        <div className="grid gap-3 sm:grid-cols-2">
          <SourceToolLink
            icon={<Network aria-hidden="true" size={18} />}
            label="Reference Network"
            metric={`${source.properties.referencedIn.length} incoming · ${source.properties.references.length} outgoing`}
            onOpen={onOpenReferenceNetwork}
          />
          <SourceToolLink
            icon={<GitCompareArrows aria-hidden="true" size={18} />}
            label="Compare Sources"
            metric={`${sourceKindLabels[source.properties.kind]} · ${source.properties.region}`}
            onOpen={onOpenComparison}
          />
        </div>
      </SurfaceContent>
    </Surface>
  );
}

function SourceToolLink({
  icon,
  label,
  metric,
  onOpen,
}: {
  icon: ReactNode;
  label: string;
  metric: string;
  onOpen: () => void;
}) {
  return (
    <button
      className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-left text-slate-900 transition hover:border-teal-300 hover:bg-teal-50/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
      onClick={onOpen}
      type="button"
    >
      <span className="flex items-center gap-2 text-sm font-bold">
        {icon}
        {label}
      </span>
      <span className="text-sm font-medium text-slate-600">{metric}</span>
    </button>
  );
}

function SourceNotFound({
  onBackToAtlas,
  onOpenSource,
  sources,
}: {
  onBackToAtlas: () => void;
  onOpenSource: (sourceId: string) => void;
  sources: HistoricalSource[];
}) {
  return (
    <PageShell maxWidth="wide">
      <nav aria-label="Source page navigation">
        <Button type="button" variant="secondary" onClick={onBackToAtlas}>
          Back to atlas
        </Button>
      </nav>
      <EmptyState
        title="Source not found"
        description="Select a source from the atlas to open its detailed page."
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
