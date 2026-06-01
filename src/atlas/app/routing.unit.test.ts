import { describe, expect, it } from 'vitest';

import {
  getSourceComparisonPath,
  getSourcePath,
  getSourceReferenceNetworkPath,
} from './routing';

describe('atlas routing', () => {
  it('keeps root as the atlas route and builds source paths', () => {
    expect(getSourcePath('dead-sea-scrolls')).toBe(
      '/atlas/sources/dead-sea-scrolls',
    );
    expect(getSourcePath('source with spaces')).toBe(
      '/atlas/sources/source%20with%20spaces',
    );
    expect(getSourceReferenceNetworkPath('source with spaces')).toBe(
      '/atlas/sources/source%20with%20spaces/reference-network',
    );
    expect(getSourceComparisonPath('source with spaces')).toBe(
      '/atlas/sources/source%20with%20spaces/compare',
    );
  });
});
