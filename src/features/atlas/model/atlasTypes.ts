import type { SourceKind } from "../../../entities/source/model/sourceTypes";
import type { TimelineMode } from "../../../entities/source/model/sourceTimeline";

export type SourceFilter = SourceKind | "all";
export type { TimelineMode };

export type AtlasFilters = {
  kind: SourceFilter;
  query: string;
  timelineMode: TimelineMode;
  timelineYear: number;
};

export type TimelineModeConfig = {
  label: string;
  maxYear: number;
  minYear: number;
  title: string;
};
