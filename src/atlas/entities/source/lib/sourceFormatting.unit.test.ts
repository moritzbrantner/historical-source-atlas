import { describe, expect, it } from 'vitest';

import type { HistoricalSource } from '../model/sourceTypes';
import {
  formatTimelineYear,
  getTimelineLabel,
  getTimelineYear,
} from './sourceFormatting';

const source = {
  properties: {
    discovered: '1947-1956',
    discoveredYear: 1947,
    period: '3rd century BC-1st century AD',
    sourceYear: -300,
  },
} as HistoricalSource;

describe('sourceFormatting', () => {
  it('formats discovery years as plain years', () => {
    expect(formatTimelineYear(1947, 'discovery')).toBe('1947');
  });

  it('formats negative source years as BC', () => {
    expect(formatTimelineYear(-300, 'source')).toBe('300 BC');
  });

  it('formats positive source years as AD', () => {
    expect(formatTimelineYear(300, 'source')).toBe('300 AD');
  });

  it('gets years for the requested timeline mode', () => {
    expect(getTimelineYear(source, 'discovery')).toBe(1947);
    expect(getTimelineYear(source, 'source')).toBe(-300);
  });

  it('gets labels for the requested timeline mode', () => {
    expect(getTimelineLabel(source, 'discovery')).toBe('1947-1956');
    expect(getTimelineLabel(source, 'source')).toBe(
      '3rd century BC-1st century AD',
    );
  });
});
