import type { TimelineMode } from '../../../entities/source/model/sourceTimeline';
import type {
  SourceKindFilters,
  YearRange,
} from '../../../entities/source/lib/sourceFiltering';
import type { SourceReferenceDirection } from '../../../entities/source/lib/sourceReferences';

export type { TimelineMode };

export type AtlasFilters = {
  referenceDirections: SourceReferenceDirection[];
  sourceKinds: SourceKindFilters;
  query: string;
  timelineRanges: Record<TimelineMode, YearRange>;
};

export type TimelineModeConfig = {
  label: string;
  maxYear: number;
  minYear: number;
  title: string;
};
