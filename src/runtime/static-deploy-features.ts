import type { FoundationFeatureKey } from '@/src/app-config/feature-keys';
import { getEnv } from '@/src/config/env';

export const staticDeployDisabledFeatureKeys = [
  'account.register',
  'account.passwordRecovery',
  'profiles.public',
  'profiles.follow',
  'profiles.blog',
  'people.directory',
  'groups',
  'notifications',
  'newsletter',
  'reportProblem',
  'workspace.dataEntry',
  'admin.workspace',
  'admin.content',
  'admin.reports',
  'admin.users',
  'admin.systemSettings',
  'admin.dataStudio',
] as const satisfies readonly FoundationFeatureKey[];

export type StaticDeployFeatureOverrides = Partial<
  Record<FoundationFeatureKey, boolean>
>;

export function isStaticDeployFeatureOverrideActive(
  deploymentTarget = getEnv().deploymentTarget,
) {
  return deploymentTarget === 'gh-pages';
}

export function getStaticDeployFeatureOverrides(
  deploymentTarget = getEnv().deploymentTarget,
): StaticDeployFeatureOverrides {
  if (!isStaticDeployFeatureOverrideActive(deploymentTarget)) {
    return {};
  }

  return Object.fromEntries(
    staticDeployDisabledFeatureKeys.map((featureKey) => [featureKey, false]),
  ) as StaticDeployFeatureOverrides;
}
