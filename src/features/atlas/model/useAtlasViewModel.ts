import { useEffect, useMemo, useState } from "react";

import { filterSources, sortSourcesByTimeline } from "../../../entities/source/lib/sourceFiltering";
import { createSourceReferenceFlows } from "../../../entities/source/lib/sourceReferences";
import type { HistoricalSource } from "../../../entities/source/model/sourceTypes";
import type { TimelineModeConfig, SourceFilter, TimelineMode } from "./atlasTypes";

const defaultSelectedSourceId = "dead-sea-scrolls";

export function useAtlasViewModel(sources: HistoricalSource[]) {
  const [selectedSourceId, setSelectedSourceId] = useState(defaultSelectedSourceId);
  const [kindFilter, setKindFilter] = useState<SourceFilter>("all");
  const [query, setQuery] = useState("");
  const [timelineMode, setTimelineMode] = useState<TimelineMode>("discovery");
  const [timelineYears, setTimelineYears] = useState<Partial<Record<TimelineMode, number>>>({});
  const timelineModes = useMemo(() => getTimelineModes(sources), [sources]);
  const activeTimelineMode = timelineModes[timelineMode];
  const timelineYear = timelineYears[timelineMode] ?? activeTimelineMode.maxYear;

  const visibleSources = useMemo(
    () =>
      filterSources(sources, {
        kind: kindFilter,
        query,
        timelineMode,
        timelineYear,
      }),
    [kindFilter, query, sources, timelineMode, timelineYear],
  );

  const sortedVisibleSources = useMemo(
    () => sortSourcesByTimeline(visibleSources, timelineMode),
    [timelineMode, visibleSources],
  );

  const selectedSource =
    visibleSources.find((source) => source.id === selectedSourceId) ?? sortedVisibleSources[0];

  const selectedSourceReferenceFlows = useMemo(
    () => (selectedSource ? createSourceReferenceFlows(selectedSource) : []),
    [selectedSource],
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
    kindFilter,
    query,
    selectedSource,
    selectedSourceId,
    selectedSourceReferenceFlows,
    setKindFilter,
    setQuery,
    setSelectedSourceId,
    setTimelineMode,
    setTimelineYear: (year: number) => {
      setTimelineYears((current) => ({ ...current, [timelineMode]: year }));
    },
    sortedVisibleSources,
    sourceStats,
    timelineMode,
    timelineModes,
    timelineYear,
    visibleSources,
  };
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
