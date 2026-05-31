import { describe, expect, it } from 'vitest';

import {
  getStaticDeployFeatureOverrides,
  staticDeployDisabledFeatureKeys,
} from './static-deploy-features';

describe('static deploy feature overrides', () => {
  it('disables backend-dependent features for GitHub Pages', () => {
    const overrides = getStaticDeployFeatureOverrides('gh-pages');

    for (const featureKey of staticDeployDisabledFeatureKeys) {
      expect(overrides[featureKey]).toBe(false);
    }

    expect(overrides['content.blog']).toBeUndefined();
    expect(overrides['content.changelog']).toBeUndefined();
    expect(overrides['showcase.forms']).toBeUndefined();
    expect(overrides['showcase.employeeTable']).toBeUndefined();
  });

  it('does not override features for normal deployments', () => {
    expect(getStaticDeployFeatureOverrides('default')).toEqual({});
  });
});
