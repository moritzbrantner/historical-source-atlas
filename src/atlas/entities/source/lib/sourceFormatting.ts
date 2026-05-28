import type { TimelineMode } from '../model/sourceTimeline';
import type { HistoricalSource } from '../model/sourceTypes';

export function getTimelineYear(source: HistoricalSource, mode: TimelineMode) {
  return mode === 'discovery'
    ? source.properties.discoveredYear
    : source.properties.sourceYear;
}

export function getTimelineLabel(source: HistoricalSource, mode: TimelineMode) {
  return mode === 'discovery'
    ? source.properties.discovered
    : source.properties.period;
}

export function formatTimelineYear(year: number, mode: TimelineMode) {
  if (mode === 'discovery') {
    return `${year}`;
  }

  if (year < 0) {
    return `${Math.abs(year)} BC`;
  }

  return `${year} AD`;
}
