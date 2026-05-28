import type { TimelineMode } from '../model/sourceTimeline';
import type { HistoricalSource, SourceKind } from '../model/sourceTypes';
import { getTimelineYear } from './sourceFormatting';

export type RelationshipScopeMode = 'referenced' | 'referencing';

export type SourceRelationshipFilter = {
  depth: number;
  enabled: boolean;
};

export type SourceKindFilter = {
  all: boolean;
  referenced: SourceRelationshipFilter;
  referencing: SourceRelationshipFilter;
};

export type SourceKindFilters = Record<SourceKind, SourceKindFilter>;

export type YearRange = {
  max: number;
  min: number;
};

export type SourceFilters = {
  query: string;
  selectedSourceId: string | null;
  sourceKinds: SourceKindFilters;
  timelineRanges: Record<TimelineMode, YearRange>;
};

export function filterSources(
  sources: HistoricalSource[],
  filters: SourceFilters,
) {
  const normalizedQuery = filters.query.trim().toLowerCase();
  const relationGraph = createSourceRelationGraph(sources);
  const reachableSourceIds = getReachableSourceIdsByKind(
    sources,
    relationGraph,
    filters.sourceKinds,
    filters.selectedSourceId,
  );

  return sources.filter((source) => {
    const matchesKind = reachableSourceIds.has(source.id);
    const matchesTimeline = (['discovery', 'source'] as const).every((mode) =>
      isYearInRange(
        getTimelineYear(source, mode),
        filters.timelineRanges[mode],
      ),
    );
    const matchesQuery =
      normalizedQuery.length === 0 ||
      getSearchableSourceValues(source).some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      );

    return matchesKind && matchesTimeline && matchesQuery;
  });
}

export function sortSourcesByTimeline(
  sources: HistoricalSource[],
  mode: TimelineMode,
) {
  return [...sources].sort(
    (a, b) =>
      getTimelineYear(a, mode) - getTimelineYear(b, mode) ||
      a.label.localeCompare(b.label),
  );
}

function getReachableSourceIdsByKind(
  sources: HistoricalSource[],
  relationGraph: SourceRelationGraph,
  filters: SourceKindFilters,
  selectedSourceId: string | null,
) {
  const sourceIds = new Set<string>();
  const reachableByFilter = new Map<string, Set<string>>();

  sources.forEach((source) => {
    const filter = filters[source.properties.kind];

    if (filter.all) {
      sourceIds.add(source.id);
      return;
    }

    if (!selectedSourceId) {
      return;
    }

    if (
      sourceMatchesRelationshipFilter(
        source.id,
        relationGraph,
        selectedSourceId,
        filter,
        reachableByFilter,
      )
    ) {
      sourceIds.add(source.id);
    }
  });

  return sourceIds;
}

function sourceMatchesRelationshipFilter(
  sourceId: string,
  relationGraph: SourceRelationGraph,
  selectedSourceId: string,
  filter: SourceKindFilter,
  reachableByFilter: Map<string, Set<string>>,
) {
  return (['referenced', 'referencing'] as const).some((mode) => {
    const relationshipFilter = filter[mode];

    if (!relationshipFilter.enabled) {
      return false;
    }

    const reachableFilterKey = `${mode}:${relationshipFilter.depth}`;
    const reachableIds =
      reachableByFilter.get(reachableFilterKey) ??
      getReachableSourceIds(
        relationGraph,
        selectedSourceId,
        mode,
        relationshipFilter.depth,
      );
    reachableByFilter.set(reachableFilterKey, reachableIds);

    return reachableIds.has(sourceId);
  });
}

type SourceRelationGraph = {
  incoming: Map<string, Set<string>>;
  outgoing: Map<string, Set<string>>;
};

function createSourceRelationGraph(
  sources: HistoricalSource[],
): SourceRelationGraph {
  const graph: SourceRelationGraph = {
    incoming: new Map(sources.map((source) => [source.id, new Set<string>()])),
    outgoing: new Map(sources.map((source) => [source.id, new Set<string>()])),
  };

  sources.forEach((source) => {
    sources.forEach((candidate) => {
      if (source.id === candidate.id) {
        return;
      }

      if (sourceReferencesCandidate(source, candidate)) {
        graph.outgoing.get(source.id)?.add(candidate.id);
        graph.incoming.get(candidate.id)?.add(source.id);
      }

      if (candidateReferencesSourceThroughReferencedIn(source, candidate)) {
        graph.outgoing.get(candidate.id)?.add(source.id);
        graph.incoming.get(source.id)?.add(candidate.id);
      }
    });
  });

  return graph;
}

function sourceReferencesCandidate(
  source: HistoricalSource,
  candidate: HistoricalSource,
) {
  return source.properties.references.some((relationship) =>
    relationshipTargetsSource(relationship.label, candidate),
  );
}

function candidateReferencesSourceThroughReferencedIn(
  source: HistoricalSource,
  candidate: HistoricalSource,
) {
  return source.properties.referencedIn.some((relationship) =>
    relationshipTargetsSource(relationship.label, candidate),
  );
}

function relationshipTargetsSource(
  relationshipLabel: string,
  source: HistoricalSource,
) {
  const normalizedRelationship = normalizeRelationshipValue(relationshipLabel);
  const normalizedSourceLabel = normalizeRelationshipValue(source.label);

  return (
    normalizedRelationship === normalizedSourceLabel ||
    normalizedRelationship.includes(normalizedSourceLabel) ||
    normalizedSourceLabel.includes(normalizedRelationship)
  );
}

function getReachableSourceIds(
  relationGraph: SourceRelationGraph,
  selectedSourceId: string,
  mode: RelationshipScopeMode,
  depth: number,
) {
  const adjacency =
    mode === 'referenced' ? relationGraph.outgoing : relationGraph.incoming;
  const visited = new Set<string>();
  let frontier = new Set([selectedSourceId]);

  for (
    let currentDepth = 0;
    currentDepth < Math.max(1, depth);
    currentDepth += 1
  ) {
    const nextFrontier = new Set<string>();

    frontier.forEach((sourceId) => {
      adjacency.get(sourceId)?.forEach((relatedSourceId) => {
        if (
          visited.has(relatedSourceId) ||
          relatedSourceId === selectedSourceId
        ) {
          return;
        }

        visited.add(relatedSourceId);
        nextFrontier.add(relatedSourceId);
      });
    });

    frontier = nextFrontier;
  }

  return visited;
}

function isYearInRange(year: number, range: YearRange) {
  return year >= range.min && year <= range.max;
}

function normalizeRelationshipValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getSearchableSourceValues(source: HistoricalSource) {
  return [
    source.label,
    source.properties.discovered,
    source.properties.location,
    source.properties.period,
    source.properties.region,
    source.properties.summary,
    ...source.properties.references.flatMap((entry) => [
      entry.label,
      entry.note,
      entry.relation,
    ]),
    ...source.properties.referencedIn.flatMap((entry) => [
      entry.label,
      entry.note,
      entry.relation,
    ]),
  ];
}
