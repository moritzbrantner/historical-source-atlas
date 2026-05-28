import { useEffect, useMemo, useState } from "react";

import {
  filterSources,
  sortSourcesByTimeline,
  type SourceKindFilters,
  type YearRange,
} from "../../../entities/source/lib/sourceFiltering";
import {
  createSourceReferenceFlows,
  type SourceReferenceDirection,
} from "../../../entities/source/lib/sourceReferences";
import { allSourceKinds } from "../../../entities/source/model/sourceConstants";
import type { HistoricalSource } from "../../../entities/source/model/sourceTypes";
import type { TimelineModeConfig, TimelineMode } from "./atlasTypes";

const defaultSelectedSourceId = "dead-sea-scrolls";
const defaultReferenceDirections: SourceReferenceDirection[] = ["incoming", "outgoing"];
const defaultRelationshipDepth = 1;

export function useAtlasViewModel(sources: HistoricalSource[]) {
  const [selectedSourceId, setSelectedSourceId] = useState(defaultSelectedSourceId);
  const [sourceKindFilters, setSourceKindFilters] = useState<SourceKindFilters>(() =>
    createDefaultSourceKindFilters(),
  );
  const [referenceDirectionFilters, setReferenceDirectionFilters] = useState([
    ...defaultReferenceDirections,
  ]);
  const [query, setQuery] = useState("");
  const [timelineMode, setTimelineMode] = useState<TimelineMode>("discovery");
  const timelineModes = useMemo(() => getTimelineModes(sources), [sources]);
  const activeTimelineMode = timelineModes[timelineMode];
  const [timelineRanges, setTimelineRanges] = useState<Partial<Record<TimelineMode, YearRange>>>(
    {},
  );
  const activeTimelineRange =
    timelineRanges[timelineMode] ??
    getFullTimelineRange(activeTimelineMode.minYear, activeTimelineMode.maxYear);
  const resolvedTimelineRanges = useMemo(
    () => ({
      discovery:
        timelineRanges.discovery ??
        getFullTimelineRange(timelineModes.discovery.minYear, timelineModes.discovery.maxYear),
      source:
        timelineRanges.source ??
        getFullTimelineRange(timelineModes.source.minYear, timelineModes.source.maxYear),
    }),
    [timelineModes, timelineRanges],
  );

  const visibleSources = useMemo(
    () =>
      filterSources(sources, {
        query,
        selectedSourceId,
        sourceKinds: sourceKindFilters,
        timelineRanges: resolvedTimelineRanges,
      }),
    [query, resolvedTimelineRanges, selectedSourceId, sourceKindFilters, sources],
  );

  const sortedVisibleSources = useMemo(
    () => sortSourcesByTimeline(visibleSources, timelineMode),
    [timelineMode, visibleSources],
  );

  const selectedSource =
    visibleSources.find((source) => source.id === selectedSourceId) ?? sortedVisibleSources[0];

  const selectedSourceReferenceFlows = useMemo(
    () =>
      selectedSource
        ? createSourceReferenceFlows(selectedSource).filter((flow) =>
            referenceDirectionFilters.includes(flow.properties.direction),
          )
        : [],
    [referenceDirectionFilters, selectedSource],
  );

  const sourceStats = useMemo(() => {
    const regions = new Set(visibleSources.map((source) => source.properties.region));
    const manuscripts = visibleSources.filter(
      (source) => source.properties.kind === "manuscript",
    ).length;

    return {
      manuscripts,
      regions: regions.size,
      total: visibleSources.length,
    };
  }, [visibleSources]);

  useEffect(() => {
    if (selectedSource || sortedVisibleSources.length === 0) {
      return;
    }

    setSelectedSourceId(sortedVisibleSources[0]!.id);
  }, [selectedSource, sortedVisibleSources]);

  return {
    activeTimelineMode,
    query,
    referenceDirectionFilters,
    selectedSource,
    selectedSourceId,
    selectedSourceReferenceFlows,
    setQuery,
    setReferenceDirectionFilters,
    setSelectedSourceId,
    setSourceKindFilters,
    setTimelineMode,
    setTimelineRange: (range: YearRange) => {
      setTimelineRanges((current) => ({
        ...current,
        [timelineMode]: clampYearRange(
          range,
          activeTimelineMode.minYear,
          activeTimelineMode.maxYear,
        ),
      }));
    },
    sortedVisibleSources,
    sourceKindFilters,
    sourceStats,
    timelineRange: activeTimelineRange,
    timelineRanges: resolvedTimelineRanges,
    timelineMode,
    timelineModes,
    visibleSources,
  };
}

export function createDefaultSourceKindFilters(): SourceKindFilters {
  return Object.fromEntries(
    allSourceKinds.map((kind) => [
      kind,
      {
        all: true,
        referenced: {
          depth: defaultRelationshipDepth,
          enabled: false,
        },
        referencing: {
          depth: defaultRelationshipDepth,
          enabled: false,
        },
      },
    ]),
  ) as SourceKindFilters;
}

function getTimelineModes(sources: HistoricalSource[]): Record<TimelineMode, TimelineModeConfig> {
  const discoveryYears = sources.map((source) => source.properties.discoveredYear);
  const sourceYears = sources.map((source) => source.properties.sourceYear);

  return {
    discovery: {
      label: "Discovery time",
      maxYear: Math.max(...discoveryYears, 0),
      minYear: Math.min(...discoveryYears, 0),
      title: "Sources known by",
    },
    source: {
      label: "Source date",
      maxYear: Math.max(...sourceYears, 0),
      minYear: Math.min(...sourceYears, 0),
      title: "Sources dated by",
    },
  };
}

function getFullTimelineRange(min: number, max: number): YearRange {
  return { max, min };
}

function clampYearRange(range: YearRange, min: number, max: number): YearRange {
  const rangeMin = Math.max(min, Math.min(max, range.min));
  const rangeMax = Math.max(rangeMin, Math.min(max, range.max));

  return {
    max: rangeMax,
    min: rangeMin,
  };
}
