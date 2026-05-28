import { describe, expect, it } from 'vitest';

import {
  canApplyRoleFeatureOverrides,
  canApplyUserFeatureOverrides,
  resolveFeatureEnabledState,
} from '@/src/foundation/features/access';

describe('foundation feature access', () => {
  it('never enables functionality that is disabled in the active build manifest', () => {
    expect(
      resolveFeatureEnabledState({
        featureKey: 'notifications',
        manifestEnabled: false,
        siteEnabled: true,
        userEnabled: true,
        role: 'USER',
      }),
    ).toBe(false);
  });

  it('uses site-wide settings as the global default', () => {
    expect(
      resolveFeatureEnabledState({
        featureKey: 'notifications',
        manifestEnabled: true,
        siteEnabled: false,
        role: 'USER',
      }),
    ).toBe(false);
  });

  it('allows role-specific enables to override the global default', () => {
    expect(
      resolveFeatureEnabledState({
        featureKey: 'notifications',
        manifestEnabled: true,
        siteEnabled: false,
        roleEnabled: true,
        role: 'USER',
      }),
    ).toBe(true);
  });

  it('applies role-specific disables for supported member functionality', () => {
    expect(
      resolveFeatureEnabledState({
        featureKey: 'notifications',
        manifestEnabled: true,
        siteEnabled: true,
        roleEnabled: false,
        role: 'MANAGER',
      }),
    ).toBe(false);
  });

  it('applies user-specific overrides after role-specific settings', () => {
    expect(
      resolveFeatureEnabledState({
        featureKey: 'notifications',
        manifestEnabled: true,
        siteEnabled: true,
        roleEnabled: false,
        userEnabled: true,
        role: 'USER',
      }),
    ).toBe(true);
  });

  it('ignores user-specific overrides for admins', () => {
    expect(
      resolveFeatureEnabledState({
        featureKey: 'notifications',
        manifestEnabled: true,
        siteEnabled: true,
        userEnabled: false,
        role: 'ADMIN',
      }),
    ).toBe(true);
  });

  it('only applies role-specific overrides to supported member functionality', () => {
    expect(canApplyRoleFeatureOverrides('notifications', 'USER')).toBe(true);
    expect(canApplyRoleFeatureOverrides('notifications', 'MANAGER')).toBe(true);
    expect(canApplyRoleFeatureOverrides('notifications', 'ADMIN')).toBe(false);
    expect(canApplyRoleFeatureOverrides('content.blog', 'USER')).toBe(false);
  });

  it('ignores user-specific overrides for features that are only global', () => {
    expect(canApplyUserFeatureOverrides('content.blog', 'USER')).toBe(false);
    expect(canApplyUserFeatureOverrides('workspace.dataEntry', 'USER')).toBe(
      false,
    );
    expect(canApplyRoleFeatureOverrides('workspace.dataEntry', 'USER')).toBe(
      false,
    );
    expect(
      resolveFeatureEnabledState({
        featureKey: 'content.blog',
        manifestEnabled: true,
        siteEnabled: true,
        userEnabled: false,
        role: 'USER',
      }),
    ).toBe(true);
  });
});
