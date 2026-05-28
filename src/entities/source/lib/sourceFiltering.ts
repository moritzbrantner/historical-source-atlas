import type { TimelineMode } from "../model/sourceTimeline";
import type { HistoricalSource } from "../model/sourceTypes";
import { getTimelineYear } from "./sourceFormatting";

export type SourceFilters = {
  kind: HistoricalSource["properties"]["kind"] | "all";
  query: string;
  timelineMode: TimelineMode;
  timelineYear: number;
};

export function filterSources(sources: HistoricalSource[], filters: SourceFilters) {
  const normalizedQuery = filters.query.trim().toLowerCase();

  return sources.filter((source) => {
    const matchesKind = filters.kind === "all" || source.properties.kind === filters.kind;
    const matchesTimeline = getTimelineYear(source, filters.timelineMode) <= filters.timelineYear;
    const matchesQuery =
      normalizedQuery.length === 0 ||
      getSearchableSourceValues(source).some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      );

    return matchesKind && matchesTimeline && matchesQuery;
  });
}

export function sortSourcesByTimeline(sources: HistoricalSource[], mode: TimelineMode) {
  return [...sources].sort(
    (a, b) => getTimelineYear(a, mode) - getTimelineYear(b, mode) || a.label.localeCompare(b.label),
  );
}

function getSearchableSourceValues(source: HistoricalSource) {
  return [
    source.label,
    source.properties.discovered,
    source.properties.location,
    source.properties.period,
    source.properties.region,
    source.properties.summary,
    ...source.properties.references.flatMap((entry) => [entry.label, entry.note, entry.relation]),
    ...source.properties.referencedIn.flatMap((entry) => [entry.label, entry.note, entry.relation]),
  ];
}
