import type { AppRole } from '@/lib/authorization';
import {
  foundationFeatureKeys,
  type FoundationFeatureKey,
} from '@/src/app-config/feature-keys';
import { loadActiveApp } from '@/src/app-config/load-active-app';
import type { AppManifest } from '@/src/app-config/contracts';
import { getDb } from '@/src/db/client';
import { siteSettings, userFeatureOverrides } from '@/src/db/schema';
import {
  shouldUseDatabaseReadFallback,
  upsertSiteSetting,
} from '@/src/site-config/service';

import {
  foundationFeatureMetadata,
  type FoundationFeatureCategory,
  userConfigurableFoundationFeatureKeys,
} from './catalog';
import { isFeatureEnabled } from './runtime';

const FOUNDATION_FEATURE_OVERRIDE_SETTING_KEY = 'foundation.featureOverrides';
const FOUNDATION_ROLE_FEATURE_OVERRIDE_SETTING_KEY =
  'foundation.roleFeatureOverrides';
const roleFeatureOverrideRoles = [
  'MANAGER',
  'USER',
] as const satisfies readonly AppRole[];

export type FeatureRuntimeUser = {
  id: string;
  role: AppRole;
};

export type FoundationFeatureAccessState = {
  featureKey: FoundationFeatureKey;
  label: string;
  description: string;
  category: FoundationFeatureCategory;
  supportsUserOverrides: boolean;
  manifestEnabled: boolean;
  siteEnabled: boolean;
  role: AppRole | null;
  roleEnabled: boolean | null;
  userEnabled: boolean | null;
  effectiveEnabled: boolean;
};

type FoundationFeatureOverrideMap = Partial<
  Record<FoundationFeatureKey, boolean>
>;
type FoundationRoleFeatureOverrideMap = Partial<
  Record<AppRole, FoundationFeatureOverrideMap>
>;

function isFoundationFeatureOverrideMap(
  value: unknown,
): value is FoundationFeatureOverrideMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  return Object.entries(value).every(
    ([key, enabled]) =>
      foundationFeatureKeys.includes(key as FoundationFeatureKey) &&
      typeof enabled === 'boolean',
  );
}

function parseSiteWideFeatureOverrideMap(
  value: string | null | undefined,
): FoundationFeatureOverrideMap {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return isFoundationFeatureOverrideMap(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function isAppRole(value: unknown): value is AppRole {
  return (
    value === 'SUPERADMIN' ||
    value === 'ADMIN' ||
    value === 'MANAGER' ||
    value === 'USER'
  );
}

function isFoundationRoleFeatureOverrideMap(
  value: unknown,
): value is FoundationRoleFeatureOverrideMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  return Object.entries(value).every(
    ([role, overrides]) =>
      isAppRole(role) && isFoundationFeatureOverrideMap(overrides),
  );
}

function parseRoleFeatureOverrideMap(
  value: string | null | undefined,
): FoundationRoleFeatureOverrideMap {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return isFoundationRoleFeatureOverrideMap(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function canApplyRoleFeatureOverrides(
  featureKey: FoundationFeatureKey,
  role: AppRole | null | undefined,
) {
  return (
    foundationFeatureMetadata[featureKey].supportsUserOverrides &&
    roleFeatureOverrideRoles.includes(
      role as (typeof roleFeatureOverrideRoles)[number],
    )
  );
}

export function canApplyUserFeatureOverrides(
  featureKey: FoundationFeatureKey,
  role: AppRole | null | undefined,
) {
  return (
    foundationFeatureMetadata[featureKey].supportsUserOverrides &&
    role !== 'ADMIN' &&
    role !== 'SUPERADMIN'
  );
}

export function resolveFeatureEnabledState(input: {
  featureKey: FoundationFeatureKey;
  manifestEnabled: boolean;
  siteEnabled?: boolean;
  roleEnabled?: boolean | null;
  userEnabled?: boolean | null;
  role?: AppRole | null;
}) {
  if (!input.manifestEnabled) {
    return false;
  }

  let enabled = input.siteEnabled ?? true;

  if (
    canApplyRoleFeatureOverrides(input.featureKey, input.role) &&
    input.roleEnabled !== null &&
    input.roleEnabled !== undefined
  ) {
    enabled = input.roleEnabled;
  }

  if (
    canApplyUserFeatureOverrides(input.featureKey, input.role) &&
    input.userEnabled !== null &&
    input.userEnabled !== undefined
  ) {
    enabled = input.userEnabled;
  }

  return enabled;
}

async function loadSiteWideFeatureOverrideMap() {
  try {
    const row = await getDb().query.siteSettings.findFirst({
      where: (table, { eq: innerEq }) =>
        innerEq(table.key, FOUNDATION_FEATURE_OVERRIDE_SETTING_KEY),
      columns: {
        value: true,
      },
    });

    return parseSiteWideFeatureOverrideMap(row?.value);
  } catch (error) {
    if (!shouldUseDatabaseReadFallback(error)) {
      throw error;
    }

    return {};
  }
}

export async function getSiteWideFeatureOverrideMap() {
  return loadSiteWideFeatureOverrideMap();
}

export async function saveSiteWideFeatureOverride(
  featureKey: FoundationFeatureKey,
  enabled: boolean,
) {
  const currentOverrides = await loadSiteWideFeatureOverrideMap();

  await upsertSiteSetting(
    FOUNDATION_FEATURE_OVERRIDE_SETTING_KEY,
    JSON.stringify({
      ...currentOverrides,
      [featureKey]: enabled,
    } satisfies FoundationFeatureOverrideMap),
  );
}

async function loadRoleFeatureOverrideMap() {
  try {
    const row = await getDb().query.siteSettings.findFirst({
      where: (table, { eq: innerEq }) =>
        innerEq(table.key, FOUNDATION_ROLE_FEATURE_OVERRIDE_SETTING_KEY),
      columns: {
        value: true,
      },
    });

    return parseRoleFeatureOverrideMap(row?.value);
  } catch (error) {
    if (!shouldUseDatabaseReadFallback(error)) {
      throw error;
    }

    return {};
  }
}

export async function getRoleFeatureOverrideMap() {
  return loadRoleFeatureOverrideMap();
}

export async function saveRoleFeatureOverride(input: {
  role: AppRole;
  featureKey: FoundationFeatureKey;
  enabled: boolean;
}) {
  const currentOverrides = await loadRoleFeatureOverrideMap();
  const currentRoleOverrides = currentOverrides[input.role] ?? {};

  await upsertSiteSetting(
    FOUNDATION_ROLE_FEATURE_OVERRIDE_SETTING_KEY,
    JSON.stringify({
      ...currentOverrides,
      [input.role]: {
        ...currentRoleOverrides,
        [input.featureKey]: input.enabled,
      },
    } satisfies FoundationRoleFeatureOverrideMap),
  );
}

export async function getUserFeatureOverrideMap(userId: string) {
  try {
    const rows = await getDb().query.userFeatureOverrides.findMany({
      where: (table, { eq: innerEq }) => innerEq(table.userId, userId),
      columns: {
        featureKey: true,
        enabled: true,
      },
    });

    return rows.reduce<FoundationFeatureOverrideMap>((accumulator, row) => {
      if (
        !foundationFeatureKeys.includes(row.featureKey as FoundationFeatureKey)
      ) {
        return accumulator;
      }

      accumulator[row.featureKey as FoundationFeatureKey] = row.enabled;
      return accumulator;
    }, {});
  } catch (error) {
    if (!shouldUseDatabaseReadFallback(error)) {
      throw error;
    }

    return {};
  }
}

export async function saveUserFeatureOverride(input: {
  userId: string;
  featureKey: FoundationFeatureKey;
  enabled: boolean;
}) {
  await getDb()
    .insert(userFeatureOverrides)
    .values({
      userId: input.userId,
      featureKey: input.featureKey,
      enabled: input.enabled,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [userFeatureOverrides.userId, userFeatureOverrides.featureKey],
      set: {
        enabled: input.enabled,
        updatedAt: new Date(),
      },
    });
}

export async function isSiteFeatureEnabled(
  featureKey: FoundationFeatureKey,
  manifest: AppManifest = loadActiveApp(),
) {
  const siteWideOverrides = await getSiteWideFeatureOverrideMap();

  return resolveFeatureEnabledState({
    featureKey,
    manifestEnabled: isFeatureEnabled(featureKey, manifest),
    siteEnabled: siteWideOverrides[featureKey] ?? true,
  });
}

export async function isFeatureEnabledForUser(
  featureKey: FoundationFeatureKey,
  user: FeatureRuntimeUser | null | undefined,
  manifest: AppManifest = loadActiveApp(),
) {
  const [siteWideOverrides, roleOverrides, userOverrides] = await Promise.all([
    getSiteWideFeatureOverrideMap(),
    getRoleFeatureOverrideMap(),
    user?.id
      ? getUserFeatureOverrideMap(user.id)
      : Promise.resolve({} as FoundationFeatureOverrideMap),
  ]);

  return resolveFeatureEnabledState({
    featureKey,
    manifestEnabled: isFeatureEnabled(featureKey, manifest),
    siteEnabled: siteWideOverrides[featureKey] ?? true,
    roleEnabled: user?.role
      ? (roleOverrides[user.role]?.[featureKey] ?? null)
      : null,
    userEnabled: user?.id ? (userOverrides[featureKey] ?? null) : null,
    role: user?.role,
  });
}

export async function getFoundationFeatureAvailabilityMap(
  user: FeatureRuntimeUser | null | undefined,
  manifest: AppManifest = loadActiveApp(),
) {
  const [siteWideOverrides, roleOverrides, userOverrides] = await Promise.all([
    getSiteWideFeatureOverrideMap(),
    getRoleFeatureOverrideMap(),
    user?.id
      ? getUserFeatureOverrideMap(user.id)
      : Promise.resolve({} as FoundationFeatureOverrideMap),
  ]);

  return Object.fromEntries(
    foundationFeatureKeys.map((featureKey) => [
      featureKey,
      resolveFeatureEnabledState({
        featureKey,
        manifestEnabled: isFeatureEnabled(featureKey, manifest),
        siteEnabled: siteWideOverrides[featureKey] ?? true,
        roleEnabled: user?.role
          ? (roleOverrides[user.role]?.[featureKey] ?? null)
          : null,
        userEnabled: user?.id ? (userOverrides[featureKey] ?? null) : null,
        role: user?.role,
      }),
    ]),
  ) as Record<FoundationFeatureKey, boolean>;
}

export async function listSiteWideFoundationFeatureStates(
  manifest: AppManifest = loadActiveApp(),
) {
  const siteWideOverrides = await getSiteWideFeatureOverrideMap();

  return foundationFeatureKeys.map<FoundationFeatureAccessState>(
    (featureKey) => {
      const metadata = foundationFeatureMetadata[featureKey];
      const manifestEnabled = isFeatureEnabled(featureKey, manifest);
      const siteEnabled = siteWideOverrides[featureKey] ?? true;

      return {
        featureKey,
        label: metadata.label,
        description: metadata.description,
        category: metadata.category,
        supportsUserOverrides: metadata.supportsUserOverrides,
        manifestEnabled,
        siteEnabled,
        role: null,
        roleEnabled: null,
        userEnabled: null,
        effectiveEnabled: resolveFeatureEnabledState({
          featureKey,
          manifestEnabled,
          siteEnabled,
        }),
      };
    },
  );
}

export async function listRoleFoundationFeatureStates(
  role: AppRole,
  manifest: AppManifest = loadActiveApp(),
) {
  const [siteWideOverrides, roleOverrides] = await Promise.all([
    getSiteWideFeatureOverrideMap(),
    getRoleFeatureOverrideMap(),
  ]);

  return userConfigurableFoundationFeatureKeys.map<FoundationFeatureAccessState>(
    (featureKey) => {
      const metadata = foundationFeatureMetadata[featureKey];
      const manifestEnabled = isFeatureEnabled(featureKey, manifest);
      const siteEnabled = siteWideOverrides[featureKey] ?? true;
      const roleEnabled = roleOverrides[role]?.[featureKey] ?? null;

      return {
        featureKey,
        label: metadata.label,
        description: metadata.description,
        category: metadata.category,
        supportsUserOverrides: true,
        manifestEnabled,
        siteEnabled,
        role,
        roleEnabled,
        userEnabled: null,
        effectiveEnabled: resolveFeatureEnabledState({
          featureKey,
          manifestEnabled,
          siteEnabled,
          roleEnabled,
          role,
        }),
      };
    },
  );
}

export async function listUserFoundationFeatureStates(
  user: FeatureRuntimeUser,
  manifest: AppManifest = loadActiveApp(),
) {
  const [siteWideOverrides, roleOverrides, userOverrides] = await Promise.all([
    getSiteWideFeatureOverrideMap(),
    getRoleFeatureOverrideMap(),
    getUserFeatureOverrideMap(user.id),
  ]);

  return userConfigurableFoundationFeatureKeys.map<FoundationFeatureAccessState>(
    (featureKey) => {
      const metadata = foundationFeatureMetadata[featureKey];
      const manifestEnabled = isFeatureEnabled(featureKey, manifest);
      const siteEnabled = siteWideOverrides[featureKey] ?? true;
      const roleEnabled = user.role
        ? (roleOverrides[user.role]?.[featureKey] ?? null)
        : null;
      const userEnabled = userOverrides[featureKey] ?? null;

      return {
        featureKey,
        label: metadata.label,
        description: metadata.description,
        category: metadata.category,
        supportsUserOverrides: true,
        manifestEnabled,
        siteEnabled,
        role: user.role,
        roleEnabled,
        userEnabled,
        effectiveEnabled: resolveFeatureEnabledState({
          featureKey,
          manifestEnabled,
          siteEnabled,
          roleEnabled,
          userEnabled,
          role: user.role,
        }),
      };
    },
  );
}
