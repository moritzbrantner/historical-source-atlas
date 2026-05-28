import { expect, test, type Page } from '@playwright/test';
import { and, eq } from 'drizzle-orm';

import {
  getSeededUser,
  gotoAndWaitForHydration,
  loginWithCredentials,
  logoutFromProfileMenu,
} from '@/scripts/e2e/helpers';
import type { AppRole } from '@/lib/authorization';
import type { FoundationFeatureKey } from '@/src/app-config/feature-keys';
import { getDb } from '@/src/db/client';
import { siteSettings, userFollows } from '@/src/db/schema';

const superAdminUser = getSeededUser('superadmin@example.com');
const primaryUser = getSeededUser('user@example.com');
const avaUser = getSeededUser('people-001@example.com');

const SITE_FEATURE_OVERRIDES_KEY = 'foundation.featureOverrides';
const ROLE_FEATURE_OVERRIDES_KEY = 'foundation.roleFeatureOverrides';

let originalSiteFeatureOverrides: string | null = null;
let originalRoleFeatureOverrides: string | null = null;

test.describe('superadmin functionality controls', () => {
  test.beforeEach(async () => {
    originalSiteFeatureOverrides = await readSetting(
      SITE_FEATURE_OVERRIDES_KEY,
    );
    originalRoleFeatureOverrides = await readSetting(
      ROLE_FEATURE_OVERRIDES_KEY,
    );
  });

  test.afterEach(async () => {
    await restoreSetting(
      SITE_FEATURE_OVERRIDES_KEY,
      originalSiteFeatureOverrides,
    );
    await restoreSetting(
      ROLE_FEATURE_OVERRIDES_KEY,
      originalRoleFeatureOverrides,
    );
    await deleteFollowRelationshipByEmail(primaryUser.email, avaUser.email);
  });

  test('enables profile blog editing globally before a user publishes a post', async ({
    page,
  }) => {
    const postToken = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const postTitle = `Functionality enabled post ${postToken}`;
    const postContent = `This post proves the user can use profile blog editing after the superadmin enables it for ${postToken}.`;

    await setSiteFeatureOverride('profiles.blog', false);

    await loginWithCredentials(
      page,
      superAdminUser.email,
      superAdminUser.password,
    );
    await enableGlobalFeature(page, {
      featureKey: 'profiles.blog',
      label: 'Profile blog editor',
    });
    await logoutFromProfileMenu(page);

    await loginWithCredentials(page, primaryUser.email, primaryUser.password);
    await gotoAndWaitForHydration(page, '/en/profile/blog');

    await expect(
      page.getByRole('heading', { name: 'Write blog posts' }),
    ).toBeVisible();
    await page.getByLabel('Title').fill(postTitle);
    await page.getByLabel('Post content').fill(postContent);
    await page.getByRole('button', { name: 'Publish post' }).click();

    await expect(page.getByRole('status')).toContainText('Published');
    await expect(
      page.locator('article').filter({ hasText: postTitle }).first(),
    ).toContainText(postContent);
  });

  test('enables the friends directory for users before a user follows a profile', async ({
    page,
  }) => {
    await setSiteFeatureOverride('people.directory', false);
    await setRoleFeatureOverride({
      role: 'USER',
      featureKey: 'people.directory',
      enabled: false,
    });

    await loginWithCredentials(
      page,
      superAdminUser.email,
      superAdminUser.password,
    );
    await enableRoleFeature(page, {
      role: 'USER',
      featureKey: 'people.directory',
      label: 'Friends directory',
    });
    await logoutFromProfileMenu(page);

    await loginWithCredentials(page, primaryUser.email, primaryUser.password);
    await gotoAndWaitForHydration(page, '/en/friends');

    await expect(
      page.getByRole('heading', { name: 'Friends', exact: true, level: 1 }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Find people' }).click();
    const searchDialog = page.getByRole('dialog', { name: 'Find people' });
    await searchDialog
      .getByRole('textbox', { name: 'Search by name' })
      .fill('Ava Adler');

    const avaSearchResult = page
      .locator('div.rounded-lg')
      .filter({ hasText: 'Ava Adler' })
      .filter({ has: page.getByRole('button', { name: 'Follow' }) })
      .first();
    await expect(avaSearchResult).toBeVisible();

    await avaSearchResult.getByRole('button', { name: 'Follow' }).click();
    await expect(getFriendsCard(page)).toContainText(
      'You are following Ava Adler. They will appear here when they follow you back.',
    );
  });
});

async function enableGlobalFeature(
  page: Page,
  input: { featureKey: FoundationFeatureKey; label: string },
) {
  await gotoAndWaitForHydration(
    page,
    '/en/admin/system-settings/functionality',
  );
  await expect(
    page.getByRole('heading', { name: 'Functionality controls' }),
  ).toBeVisible();

  const featureForm = page
    .locator('form')
    .filter({
      has: page.locator(
        `input[name="featureKey"][value="${input.featureKey}"]`,
      ),
    })
    .filter({ has: page.getByLabel('Enabled site wide') })
    .filter({ hasText: input.label })
    .first();
  const enabledCheckbox = featureForm.getByLabel('Enabled site wide');

  await expect(featureForm).toContainText('Disabled');
  await enabledCheckbox.setChecked(true);
  await featureForm.getByRole('button', { name: 'Save' }).click();
  await expect.poll(() => getSiteFeatureOverride(input.featureKey)).toBe(true);
}

async function enableRoleFeature(
  page: Page,
  input: { role: AppRole; featureKey: FoundationFeatureKey; label: string },
) {
  await gotoAndWaitForHydration(
    page,
    '/en/admin/system-settings/functionality',
  );
  await expect(
    page.getByRole('heading', { name: 'Functionality controls' }),
  ).toBeVisible();

  const featureForm = page
    .locator('form')
    .filter({
      has: page.locator(`input[name="role"][value="${input.role}"]`),
    })
    .filter({
      has: page.locator(
        `input[name="featureKey"][value="${input.featureKey}"]`,
      ),
    })
    .filter({ hasText: input.label })
    .first();
  const enabledCheckbox = featureForm.getByLabel(
    `Enabled for ${input.role.toLowerCase()}`,
  );

  await expect(featureForm).toContainText('Unavailable');
  await enabledCheckbox.setChecked(true);
  await featureForm.getByRole('button', { name: 'Save' }).click();
  await expect
    .poll(() => getRoleFeatureOverride(input.role, input.featureKey))
    .toBe(true);
}

function getFriendsCard(page: Page) {
  return page
    .locator('section,div')
    .filter({ has: page.getByRole('heading', { name: 'Friends' }) })
    .first();
}

async function readSetting(key: string) {
  const row = await getDb().query.siteSettings.findFirst({
    where: (table, { eq: equals }) => equals(table.key, key),
    columns: {
      value: true,
    },
  });

  return row?.value ?? null;
}

async function getUserIdByEmail(email: string) {
  const user = await getDb().query.users.findFirst({
    where: (table, { eq: equals }) => equals(table.email, email),
    columns: {
      id: true,
    },
  });

  if (!user) {
    throw new Error(`Expected seeded user for ${email}`);
  }

  return user.id;
}

async function deleteFollowRelationshipByEmail(
  followerEmail: string,
  followingEmail: string,
) {
  const [followerId, followingId] = await Promise.all([
    getUserIdByEmail(followerEmail),
    getUserIdByEmail(followingEmail),
  ]);

  await getDb()
    .delete(userFollows)
    .where(
      and(
        eq(userFollows.followerId, followerId),
        eq(userFollows.followingId, followingId),
      ),
    );
}

async function restoreSetting(key: string, value: string | null) {
  if (value === null) {
    await getDb().delete(siteSettings).where(eq(siteSettings.key, key));
    return;
  }

  await writeSetting(key, value);
}

async function writeSetting(key: string, value: string) {
  await getDb()
    .insert(siteSettings)
    .values({
      key,
      value,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: {
        value,
        updatedAt: new Date(),
      },
    });
}

function parseJsonSetting<T extends Record<string, unknown>>(
  value: string | null,
) {
  if (!value) {
    return {} as T;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as T)
      : ({} as T);
  } catch {
    return {} as T;
  }
}

async function setSiteFeatureOverride(
  featureKey: FoundationFeatureKey,
  enabled: boolean,
) {
  const current = parseJsonSetting<
    Partial<Record<FoundationFeatureKey, boolean>>
  >(await readSetting(SITE_FEATURE_OVERRIDES_KEY));

  await writeSetting(
    SITE_FEATURE_OVERRIDES_KEY,
    JSON.stringify({ ...current, [featureKey]: enabled }),
  );
}

async function getSiteFeatureOverride(featureKey: FoundationFeatureKey) {
  const current = parseJsonSetting<
    Partial<Record<FoundationFeatureKey, boolean>>
  >(await readSetting(SITE_FEATURE_OVERRIDES_KEY));

  return current[featureKey] ?? null;
}

async function setRoleFeatureOverride(input: {
  role: AppRole;
  featureKey: FoundationFeatureKey;
  enabled: boolean;
}) {
  const current = parseJsonSetting<
    Partial<Record<AppRole, Partial<Record<FoundationFeatureKey, boolean>>>>
  >(await readSetting(ROLE_FEATURE_OVERRIDES_KEY));

  await writeSetting(
    ROLE_FEATURE_OVERRIDES_KEY,
    JSON.stringify({
      ...current,
      [input.role]: {
        ...(current[input.role] ?? {}),
        [input.featureKey]: input.enabled,
      },
    }),
  );
}

async function getRoleFeatureOverride(
  role: AppRole,
  featureKey: FoundationFeatureKey,
) {
  const current = parseJsonSetting<
    Partial<Record<AppRole, Partial<Record<FoundationFeatureKey, boolean>>>>
  >(await readSetting(ROLE_FEATURE_OVERRIDES_KEY));

  return current[role]?.[featureKey] ?? null;
}
