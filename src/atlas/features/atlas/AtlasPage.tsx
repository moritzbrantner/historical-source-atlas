'use client';

import {
  ErrorState,
  LoadingState,
  PageActions,
  PageContent,
  PageDescription,
  PageHeader,
  PageShell,
  PageTitle,
  StateViewDescription,
  StateViewTitle,
} from '@moritzbrantner/ui';

import { useAtlasSourcesQuery } from '../../entities/source/api/sourceQueries';
import { AtlasFilters } from './AtlasFilters';
import { AtlasMap } from './AtlasMap';
import { AtlasSidebar } from './AtlasSidebar';
import { TimelineControl } from './TimelineControl';
import { useAtlasViewModel } from './model/useAtlasViewModel';

export function AtlasPage({
  onOpenSource,
}: {
  onOpenSource: (sourceId: string) => void;
}) {
  const sourcesQuery = useAtlasSourcesQuery();
  const sources = sourcesQuery.data ?? [];
  const atlas = useAtlasViewModel(sources);

  if (sourcesQuery.isLoading) {
    return (
      <PageShell maxWidth="wide">
        <LoadingState label="Loading source atlas" />
      </PageShell>
    );
  }

  if (sourcesQuery.isError) {
    return (
      <PageShell maxWidth="wide">
        <ErrorState className="rounded-lg border border-slate-200 bg-white">
          <StateViewTitle>Could not load the atlas</StateViewTitle>
          <StateViewDescription>
            Refresh the page and try again.
          </StateViewDescription>
        </ErrorState>
      </PageShell>
    );
  }

  return (
    <PageShell className="min-h-screen" maxWidth="full">
      <PageHeader className="gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-xs font-bold uppercase text-teal-700">
            Historical source atlas
          </p>
          <PageTitle className="max-w-3xl">
            Map the places where texts and artifacts entered the record.
          </PageTitle>
          <PageDescription className="sr-only">
            Explore historical texts, artifacts, inscriptions, and manuscripts
            by discovery location and date.
          </PageDescription>
        </div>
        <PageActions>
          <AtlasFilters
            query={atlas.query}
            referenceDirectionFilters={atlas.referenceDirectionFilters}
            resultCount={atlas.visibleSources.length}
            sourceKindFilters={atlas.sourceKindFilters}
            onQueryChange={atlas.setQuery}
            onReferenceDirectionFiltersChange={
              atlas.setReferenceDirectionFilters
            }
            onSourceKindFiltersChange={atlas.setSourceKindFilters}
          />
        </PageActions>
      </PageHeader>

      <PageContent className="grid gap-4">
        <TimelineControl
          maxYear={atlas.activeTimelineMode.maxYear}
          minYear={atlas.activeTimelineMode.minYear}
          mode={atlas.timelineMode}
          modeConfig={atlas.activeTimelineMode}
          sourceCount={atlas.visibleSources.length}
          timelineRange={atlas.timelineRange}
          onModeChange={atlas.setTimelineMode}
          onTimelineRangeChange={atlas.setTimelineRange}
        />

        <section
          className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]"
          aria-label="Historical source map"
        >
          <AtlasMap
            flows={atlas.selectedSourceReferenceFlows}
            referenceDirectionFilters={atlas.referenceDirectionFilters}
            selectedSourceId={atlas.selectedSource?.id ?? null}
            sources={atlas.visibleSources}
            onSelectSource={atlas.setSelectedSourceId}
          />
          <AtlasSidebar
            selectedSource={atlas.selectedSource}
            selectedSourceId={atlas.selectedSourceId}
            sourceStats={atlas.sourceStats}
            sources={atlas.sortedVisibleSources}
            timelineMode={atlas.timelineMode}
            onOpenSource={onOpenSource}
            onSelectSource={atlas.setSelectedSourceId}
          />
        </section>
      </PageContent>
    </PageShell>
  );
}
