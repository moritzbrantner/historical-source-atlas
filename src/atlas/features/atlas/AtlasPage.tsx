'use client';

import { useMemo } from 'react';
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
import type { SourceRepository } from '../../entities/source/api/sourceRepository';
import {
  useAddAtlasCollectionItemMutation,
  useAtlasCollectionsQuery,
  useCreateAtlasCollectionMutation,
  useReplaceAtlasCollectionItemsMutation,
  useUpdateAtlasCollectionMutation,
} from '../../entities/collections/api/collectionQueries';
import {
  useAtlasSourceTagsQuery,
  useReplaceAtlasSourceTagsMutation,
} from '../../entities/source-tags/api/sourceTagQueries';
import { AtlasFilters } from './AtlasFilters';
import { AtlasMap } from './AtlasMap';
import { AtlasSidebar } from './AtlasSidebar';
import { TimelineControl } from './TimelineControl';
import { useAtlasViewModel } from './model/useAtlasViewModel';

export function AtlasPage({
  onOpenSource,
  sourceRepository,
}: {
  onOpenSource: (sourceId: string) => void;
  sourceRepository?: SourceRepository;
}) {
  const sourcesQuery = useAtlasSourcesQuery(sourceRepository);
  const sourceTagsQuery = useAtlasSourceTagsQuery();
  const collectionsQuery = useAtlasCollectionsQuery();
  const replaceSourceTagsMutation = useReplaceAtlasSourceTagsMutation();
  const createCollectionMutation = useCreateAtlasCollectionMutation();
  const updateCollectionMutation = useUpdateAtlasCollectionMutation();
  const addCollectionItemMutation = useAddAtlasCollectionItemMutation();
  const replaceCollectionItemsMutation =
    useReplaceAtlasCollectionItemsMutation();
  const sources = sourcesQuery.data ?? [];
  const atlas = useAtlasViewModel(sources);
  const sourceTags = sourceTagsQuery.data?.tags ?? [];
  const sourceTagsBySourceId = useMemo(
    () =>
      new Map(sourceTags.map((tagGroup) => [tagGroup.sourceId, tagGroup.tags])),
    [sourceTags],
  );

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
            sourceTagsBySourceId={sourceTagsBySourceId}
            sources={atlas.visibleSources}
            onSelectSource={atlas.setSelectedSourceId}
          />
          <AtlasSidebar
            allSources={sources}
            sourceTagsAuthenticated={
              sourceTagsQuery.data?.authenticated ?? false
            }
            sourceTagsBySourceId={sourceTagsBySourceId}
            collections={collectionsQuery.data?.collections ?? []}
            collectionsAuthenticated={
              collectionsQuery.data?.authenticated ?? false
            }
            collectionsError={
              createCollectionMutation.error?.message ??
              updateCollectionMutation.error?.message ??
              addCollectionItemMutation.error?.message ??
              replaceCollectionItemsMutation.error?.message ??
              (collectionsQuery.isError
                ? 'Could not load your collections.'
                : null)
            }
            collectionsLoading={collectionsQuery.isLoading}
            collectionsSaving={
              createCollectionMutation.isPending ||
              updateCollectionMutation.isPending ||
              addCollectionItemMutation.isPending ||
              replaceCollectionItemsMutation.isPending
            }
            sourceTagsError={
              replaceSourceTagsMutation.error?.message ??
              (sourceTagsQuery.isError
                ? 'Could not load your source tags.'
                : null)
            }
            sourceTagsLoading={sourceTagsQuery.isLoading}
            sourceTagsSaving={replaceSourceTagsMutation.isPending}
            selectedSource={atlas.selectedSource}
            selectedSourceId={atlas.selectedSourceId}
            sourceStats={atlas.sourceStats}
            sources={atlas.sortedVisibleSources}
            timelineMode={atlas.timelineMode}
            onAddSourceToCollection={(input) =>
              addCollectionItemMutation.mutateAsync(input)
            }
            onCreateCollection={(input) =>
              createCollectionMutation.mutateAsync(input)
            }
            onOpenSource={onOpenSource}
            onReplaceCollectionItems={(collectionId, items) =>
              replaceCollectionItemsMutation.mutateAsync({
                collectionId,
                items,
              })
            }
            onSelectSource={atlas.setSelectedSourceId}
            onUpdateCollection={(collectionId, input) =>
              updateCollectionMutation.mutateAsync({
                collectionId,
                ...input,
              })
            }
            onUpdateSourceTags={(sourceId, tags) =>
              replaceSourceTagsMutation.mutateAsync({ sourceId, tags })
            }
          />
        </section>
      </PageContent>
    </PageShell>
  );
}
