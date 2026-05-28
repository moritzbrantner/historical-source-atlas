import {
  Badge,
  Button,
  Surface,
  SurfaceContent,
  SurfaceHeader,
  SurfaceTitle,
} from '@moritzbrantner/ui';
import { Tag } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { getTimelineLabel } from '../../entities/source/lib/sourceFormatting';
import { sourceKindLabels } from '../../entities/source/model/sourceConstants';
import type { HistoricalSource } from '../../entities/source/model/sourceTypes';
import {
  normalizeAtlasSourceTags,
  parseAtlasSourceTagInput,
} from '../../entities/source-tags/model/sourceTags';
import { EmptyState } from '../../shared/ui/EmptyState';
import { MetricStats } from '../../shared/ui/MetricStats';
import type { TimelineMode } from './model/atlasTypes';

const selectedSourceClassName =
  'ring-2 ring-teal-600 ring-offset-1 ring-offset-white shadow-sm';
const emptySourceTags: readonly string[] = [];

export function AtlasSidebar({
  allSources,
  onOpenSource,
  onSelectSource,
  onUpdateSourceTags,
  sourceTagsAuthenticated,
  sourceTagsBySourceId,
  sourceTagsError,
  sourceTagsLoading,
  sourceTagsSaving,
  selectedSource,
  selectedSourceId,
  sources,
  sourceStats,
  timelineMode,
}: {
  allSources: HistoricalSource[];
  onOpenSource: (sourceId: string) => void;
  onSelectSource: (sourceId: string) => void;
  onUpdateSourceTags: (sourceId: string, tags: string[]) => Promise<unknown>;
  sourceTagsAuthenticated: boolean;
  sourceTagsBySourceId: ReadonlyMap<string, readonly string[]>;
  sourceTagsError: string | null;
  sourceTagsLoading: boolean;
  sourceTagsSaving: boolean;
  selectedSource: HistoricalSource | undefined;
  selectedSourceId: string | undefined;
  sources: HistoricalSource[];
  sourceStats: {
    manuscripts: number;
    regions: number;
    total: number;
  };
  timelineMode: TimelineMode;
}) {
  return (
    <aside
      className="grid gap-4 lg:sticky lg:top-4"
      aria-label="Source details"
    >
      <MetricStats
        stats={[
          { label: 'visible sources', value: sourceStats.total },
          { label: 'regions', value: sourceStats.regions },
          { label: 'manuscripts', value: sourceStats.manuscripts },
        ]}
      />

      <SourceDetail
        source={selectedSource}
        sourceTags={
          selectedSource
            ? (sourceTagsBySourceId.get(selectedSource.id) ?? emptySourceTags)
            : emptySourceTags
        }
        sourceTagsAuthenticated={sourceTagsAuthenticated}
        sourceTagsError={sourceTagsError}
        sourceTagsLoading={sourceTagsLoading}
        sourceTagsSaving={sourceTagsSaving}
        onOpenPage={onOpenSource}
        onUpdateSourceTags={onUpdateSourceTags}
      />

      <TaggedSourcesSummary
        allSources={allSources}
        sourceTagsBySourceId={sourceTagsBySourceId}
        onSelectSource={onSelectSource}
      />

      <Surface aria-label="Source list">
        <SurfaceHeader>
          <SurfaceTitle>Sources</SurfaceTitle>
        </SurfaceHeader>
        <SurfaceContent>
          <div className="grid max-h-[330px] gap-2 overflow-auto pr-1">
            {sources.map((source) => (
              <Button
                aria-pressed={source.id === selectedSourceId}
                key={source.id}
                type="button"
                variant={
                  source.id === selectedSourceId ? 'default' : 'secondary'
                }
                {...(source.id === selectedSourceId
                  ? { className: selectedSourceClassName }
                  : {})}
                onClick={() => {
                  onSelectSource(source.id);
                }}
              >
                <span className="min-w-0 flex-1 truncate text-left">
                  {source.label}
                </span>
                {sourceTagsBySourceId.get(source.id)?.length ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-xs font-bold text-teal-700">
                    <Tag aria-hidden="true" className="h-3 w-3" />
                    {sourceTagsBySourceId.get(source.id)!.length}
                  </span>
                ) : null}
                <small className="truncate text-xs opacity-75">
                  {getTimelineLabel(source, timelineMode)}
                </small>
              </Button>
            ))}
          </div>
        </SurfaceContent>
      </Surface>
    </aside>
  );
}

function SourceDetail({
  onOpenPage,
  onUpdateSourceTags,
  source,
  sourceTags,
  sourceTagsAuthenticated,
  sourceTagsError,
  sourceTagsLoading,
  sourceTagsSaving,
}: {
  onOpenPage: (sourceId: string) => void;
  onUpdateSourceTags: (sourceId: string, tags: string[]) => Promise<unknown>;
  source: HistoricalSource | undefined;
  sourceTags: readonly string[];
  sourceTagsAuthenticated: boolean;
  sourceTagsError: string | null;
  sourceTagsLoading: boolean;
  sourceTagsSaving: boolean;
}) {
  if (!source) {
    return (
      <EmptyState
        title="No sources visible"
        description="Move the timeline forward or adjust the type and search filters."
      />
    );
  }

  return (
    <Surface>
      <SurfaceHeader>
        <div className="flex items-center justify-between gap-3">
          <Badge>{sourceKindLabels[source.properties.kind]}</Badge>
          <span className="text-sm font-semibold text-slate-500">
            {source.properties.region}
          </span>
        </div>
        <SurfaceTitle>{source.label}</SurfaceTitle>
      </SurfaceHeader>
      <SurfaceContent className="grid gap-4">
        <p className="text-sm leading-6 text-slate-600">
          {source.properties.summary}
        </p>
        <dl className="grid gap-3">
          <Fact label="Found" value={source.properties.location} />
          <Fact label="Discovery" value={source.properties.discovered} />
          <Fact label="Source date" value={source.properties.period} />
          <Fact
            label="Repository"
            value={source.properties.currentRepository}
          />
        </dl>
        <DetailSection title="How and where it was found">
          <p>{source.properties.discoveryContext}</p>
        </DetailSection>
        <SourceTagsEditor
          authenticated={sourceTagsAuthenticated}
          error={sourceTagsError}
          loading={sourceTagsLoading}
          saving={sourceTagsSaving}
          source={source}
          tags={sourceTags}
          onUpdateSourceTags={onUpdateSourceTags}
        />
        <SourceRelationList
          title="Where it is referenced"
          items={source.properties.referencedIn}
        />
        <SourceRelationList
          title="What it references"
          items={source.properties.references}
        />
        <Button
          className="w-full"
          type="button"
          onClick={() => {
            onOpenPage(source.id);
          }}
        >
          Open source page
        </Button>
      </SurfaceContent>
    </Surface>
  );
}

function SourceTagsEditor({
  authenticated,
  error,
  loading,
  onUpdateSourceTags,
  saving,
  source,
  tags,
}: {
  authenticated: boolean;
  error: string | null;
  loading: boolean;
  onUpdateSourceTags: (sourceId: string, tags: string[]) => Promise<unknown>;
  saving: boolean;
  source: HistoricalSource;
  tags: readonly string[];
}) {
  const [draftTags, setDraftTags] = useState(tags.join(', '));
  const [localError, setLocalError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraftTags(tags.join(', '));
    setLocalError(null);
    setSaved(false);
  }, [source.id, tags]);

  const parsedTags = useMemo(
    () => parseAtlasSourceTagInput(draftTags),
    [draftTags],
  );

  const normalizedTags = normalizeAtlasSourceTags(parsedTags);
  const displayedTags = normalizedTags.ok ? normalizedTags.tags : tags;

  if (loading) {
    return (
      <DetailSection title="Your tags">
        <p>Loading your tags...</p>
      </DetailSection>
    );
  }

  if (error && !authenticated) {
    return (
      <DetailSection title="Your tags">
        <p className="font-semibold text-red-700">{error}</p>
      </DetailSection>
    );
  }

  if (!authenticated) {
    return (
      <DetailSection title="Your tags">
        <p>Sign in to tag map objects and keep a personal tag list.</p>
      </DetailSection>
    );
  }

  return (
    <DetailSection title="Your tags">
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setSaved(false);

          if (!normalizedTags.ok) {
            setLocalError(normalizedTags.message);
            return;
          }

          setLocalError(null);
          onUpdateSourceTags(source.id, normalizedTags.tags)
            .then(() => {
              setSaved(true);
            })
            .catch((cause: unknown) => {
              setLocalError(
                cause instanceof Error ? cause.message : 'Could not save tags.',
              );
            });
        }}
      >
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          <span>Tags</span>
          <input
            className="min-h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
            placeholder="important, compare later, translation"
            value={draftTags}
            onChange={(event) => {
              setDraftTags(event.target.value);
              setLocalError(null);
              setSaved(false);
            }}
          />
        </label>
        {displayedTags.length ? <TagChips tags={displayedTags} /> : null}
        {localError || error ? (
          <p className="text-sm font-semibold text-red-700">
            {localError ?? error}
          </p>
        ) : null}
        {saved ? (
          <p className="text-sm font-semibold text-teal-700">Tags saved.</p>
        ) : null}
        <Button
          className="w-full"
          disabled={saving}
          type="submit"
          variant="secondary"
        >
          <Tag aria-hidden="true" className="h-4 w-4" />
          {saving ? 'Saving tags' : 'Save tags'}
        </Button>
      </form>
    </DetailSection>
  );
}

function TaggedSourcesSummary({
  allSources,
  onSelectSource,
  sourceTagsBySourceId,
}: {
  allSources: HistoricalSource[];
  onSelectSource: (sourceId: string) => void;
  sourceTagsBySourceId: ReadonlyMap<string, readonly string[]>;
}) {
  const sourcesById = new Map(allSources.map((source) => [source.id, source]));
  const taggedSources = Array.from(sourceTagsBySourceId.entries())
    .map(([sourceId, tags]) => ({
      source: sourcesById.get(sourceId),
      sourceId,
      tags,
    }))
    .filter((item) => item.tags.length > 0)
    .sort((left, right) =>
      (left.source?.label ?? left.sourceId).localeCompare(
        right.source?.label ?? right.sourceId,
      ),
    );

  if (taggedSources.length === 0) {
    return null;
  }

  return (
    <Surface aria-label="Tagged objects">
      <SurfaceHeader>
        <SurfaceTitle>Your tagged objects</SurfaceTitle>
      </SurfaceHeader>
      <SurfaceContent>
        <ul className="grid max-h-56 gap-2 overflow-auto pr-1">
          {taggedSources.map(({ source, sourceId, tags }) => (
            <li
              className="grid gap-2 rounded-md border border-slate-200 bg-white p-3 shadow-sm"
              key={sourceId}
            >
              <button
                className="text-left text-sm font-bold text-slate-950 hover:text-teal-700"
                type="button"
                onClick={() => {
                  onSelectSource(sourceId);
                }}
              >
                {source?.label ?? sourceId}
              </button>
              <TagChips tags={tags} />
            </li>
          ))}
        </ul>
      </SurfaceContent>
    </Surface>
  );
}

function TagChips({ tags }: { tags: readonly string[] }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-1 text-xs font-bold text-teal-700"
          key={tag}
        >
          <Tag aria-hidden="true" className="h-3 w-3" />
          {tag}
        </span>
      ))}
    </span>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-t border-slate-200 pt-3">
      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
      <dd className="m-0 text-sm font-semibold leading-5 text-slate-800">
        {value}
      </dd>
    </div>
  );
}

function DetailSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="grid gap-2 border-t border-slate-200 pt-3">
      <h3 className="text-sm font-bold text-slate-950">{title}</h3>
      <div className="text-sm leading-6 text-slate-600">{children}</div>
    </section>
  );
}

function SourceRelationList({
  items,
  title,
}: {
  items: HistoricalSource['properties']['references'];
  title: string;
}) {
  return (
    <DetailSection title={title}>
      <ul className="grid gap-2">
        {items.map((item) => (
          <li
            className="grid gap-1 rounded-md border border-slate-200 bg-slate-50 p-3"
            key={`${item.relation}-${item.label}`}
          >
            <strong className="text-sm text-slate-900">{item.label}</strong>
            <span className="w-fit rounded-full bg-teal-50 px-2 py-1 text-xs font-bold text-teal-700">
              {item.relation}
            </span>
            <p>{item.note}</p>
          </li>
        ))}
      </ul>
    </DetailSection>
  );
}
