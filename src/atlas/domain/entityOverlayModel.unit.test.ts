import { describe, expect, it } from 'vitest';

import {
  dateRangeOverlapsTimeRange,
  isPointInEntityOverlayBounds,
} from './entityOverlayModel';

describe('entity overlay model', () => {
  it('treats date range overlap as inclusive', () => {
    expect(
      dateRangeOverlapsTimeRange(
        { endYear: 100, startYear: 50 },
        { max: 150, min: 100 },
      ),
    ).toBe(true);
    expect(
      dateRangeOverlapsTimeRange(
        { endYear: 50, startYear: 1 },
        { max: 100, min: 51 },
      ),
    ).toBe(false);
  });

  it('supports BCE years and open-ended ranges', () => {
    expect(
      dateRangeOverlapsTimeRange(
        { endYear: -50, startYear: -200 },
        { max: -100, min: -150 },
      ),
    ).toBe(true);
    expect(
      dateRangeOverlapsTimeRange(
        { endYear: null, startYear: -100 },
        { max: 20, min: 10 },
      ),
    ).toBe(true);
    expect(
      dateRangeOverlapsTimeRange(
        { endYear: -100, startYear: null },
        { max: 20, min: 10 },
      ),
    ).toBe(false);
  });

  it('does not treat both-null dates as dated overlap', () => {
    expect(
      dateRangeOverlapsTimeRange(
        { endYear: null, startYear: null },
        { max: 100, min: -100 },
      ),
    ).toBe(false);
  });

  it('checks point inclusion in viewport bounds', () => {
    expect(
      isPointInEntityOverlayBounds(
        { latitude: 31.7, longitude: 35.4 },
        { east: 36, north: 32, south: 31, west: 35 },
      ),
    ).toBe(true);
    expect(
      isPointInEntityOverlayBounds(
        { latitude: 31.7, longitude: 34.9 },
        { east: 36, north: 32, south: 31, west: 35 },
      ),
    ).toBe(false);
  });
});
