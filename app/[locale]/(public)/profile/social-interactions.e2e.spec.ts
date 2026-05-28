import { expect, test, type Locator, type Page } from '@playwright/test';

import {
  getSeededUser,
  gotoAndWaitForHydration,
  loginWithCredentials,
  logoutFromProfileMenu,
  runQueuedJobs,
  waitForAppHydration,
  waitForServiceWorkerReady,
} from '@/scripts/e2e/helpers';

const adminUser = getSeededUser('admin@example.com');
const managerUser = getSeededUser('manager@example.com');
const primaryUser = getSeededUser('user@example.com');
const aliceUser = getSeededUser('alice@example.com');
const hiddenUser = getSeededUser('private@example.com');

test.describe('social interactions', () => {
  test('loads a logged-in user public profile by tag and exposes own-profile actions', async ({
    page,
  }) => {
    await loginWithCredentials(page, aliceUser.email, aliceUser.password);
    await gotoAndWaitForHydration(page, '/en/profile/@alice');

    await expect(page).toHaveURL('/en/profile/@alice');
    await expect(page.getByText('Alice Archer', { exact: true })).toBeVisible();
    await expect(page.getByText('@alice', { exact: true })).toBeVisible();
    await expect(page.getByText('/@alice', { exact: true })).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Add friend' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Follow' })).toHaveCount(0);

    await page.getByRole('link', { name: /\d+ friends/i }).click();
    await expect(page).toHaveURL('/en/friends');
  });

  test('loads another user public profile by tag and exposes follow controls', async ({
    page,
  }) => {
    await loginWithCredentials(page, aliceUser.email, aliceUser.password);
    await gotoAndWaitForHydration(page, '/en/profile/@bob');

    await expect(page).toHaveURL('/en/profile/@bob');
    await expect(page.getByText('Bob Baker', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Follow' })).toBeVisible();
  });

  test('opens the followers page from the follower count and respects visibility roles', async ({
    page,
  }) => {
    await loginWithCredentials(page, aliceUser.email, aliceUser.password);
    await gotoAndWaitForHydration(page, '/en/profile/@test-user');

    await page.getByRole('link', { name: /6 followers/i }).click();

    await expect(page).toHaveURL('/en/profile/@test-user/followers');
    await expect(
      page.getByRole('heading', { name: 'Followers' }),
    ).toBeVisible();
    await expect(page.getByText('Alice Archer', { exact: true })).toBeVisible();
    await expect(page.getByText('Bob Baker', { exact: true })).toBeVisible();
    await expect(page.getByText('Test Manager', { exact: true })).toBeVisible();
    await expect(page.getByText('@alice', { exact: true })).toBeVisible();
    await expect(page.getByText('/@alice', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Public', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Members', { exact: true })).toHaveCount(0);
    await expect(
      page.getByText('1 hidden member', { exact: true }),
    ).toBeVisible();
    await expect(page.getByText('Private Member', { exact: true })).toHaveCount(
      0,
    );

    await page.getByText('Alice Archer', { exact: true }).click();
    await expect(page).toHaveURL('/en/profile/@alice');
  });

  test('opens the following page from the following count', async ({
    page,
  }) => {
    await loginWithCredentials(page, aliceUser.email, aliceUser.password);
    await gotoAndWaitForHydration(page, '/en/profile/@test-user');

    await page.getByRole('link', { name: /2 following/i }).click();

    await expect(page).toHaveURL('/en/profile/@test-user/following');
    await expect(
      page.getByRole('heading', { name: 'Following' }),
    ).toBeVisible();
    await expect(page.getByText('Alice Archer', { exact: true })).toBeVisible();
    await expect(page.getByText('Bob Baker', { exact: true })).toBeVisible();
    await expect(page.getByText('@alice', { exact: true })).toBeVisible();
    await expect(page.getByText('/@alice', { exact: true })).toHaveCount(0);

    await page.getByText('Bob Baker', { exact: true }).click();
    await expect(page).toHaveURL('/en/profile/@bob');
  });

  test('lets a user add and remove friends from the search modal', async ({
    page,
  }) => {
    await loginWithCredentials(page, primaryUser.email, primaryUser.password);
    await gotoAndWaitForHydration(page, '/en/friends');

    await expect(
      page.getByRole('heading', {
        name: 'Friends',
        exact: true,
        level: 1,
      }),
    ).toBeVisible();
    await expect(getFriendsCard(page)).toContainText('Alice Archer');
    await expect(getFriendsCard(page)).toContainText('Bob Baker');
    const existingCaseyEntry = getFriendsEntry(page, 'Casey Carter');
    if ((await existingCaseyEntry.count()) > 0) {
      await existingCaseyEntry
        .getByRole('button', { name: 'Unfollow' })
        .click();
      await expect(existingCaseyEntry).toHaveCount(0);
    }

    await page.getByRole('button', { name: 'Find people' }).click();
    const searchDialog = page.getByRole('dialog', { name: 'Find people' });
    await searchDialog
      .getByRole('textbox', { name: 'Search by name' })
      .fill('Casey');

    const caseySearchResult = getSearchResult(searchDialog, 'Casey Carter');
    await expect(caseySearchResult).toBeVisible();
    await expect(page.getByText(hiddenUser.name, { exact: true })).toHaveCount(
      0,
    );

    await caseySearchResult.getByRole('button', { name: 'Follow' }).click();

    await expect(getFriendsCard(page)).toContainText('Casey Carter');
    await expect(caseySearchResult.getByText('Friend')).toBeVisible();
    await expect(
      caseySearchResult.getByRole('button', { name: 'Unfollow' }),
    ).toBeVisible();

    await searchDialog
      .getByRole('button', { name: 'Close friend search' })
      .click();
    await getFriendsEntry(page, 'Casey Carter')
      .getByRole('button', { name: 'Unfollow' })
      .click();
    await expect(getFriendsEntry(page, 'Casey Carter')).toHaveCount(0);
  });

  test('delivers a role-based admin notification to the seeded manager cohort', async ({
    page,
  }) => {
    const token = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const title = `Manager broadcast ${token}`;
    const body = `Manager-only operational update for ${token}.`;

    await loginWithCredentials(page, managerUser.email, managerUser.password);
    const unreadBefore = await getUnreadNotificationCount(page);
    await logoutFromProfileMenu(page);

    await loginWithCredentials(page, adminUser.email, adminUser.password);
    await gotoAndWaitForHydration(page, '/en/admin/users');

    await expect(
      page.getByRole('heading', { name: 'User management' }),
    ).toBeVisible();
    await page.getByLabel('Audience').selectOption({ label: 'Role group' });
    await page.getByLabel('Role group').selectOption({ label: 'Managers' });
    await page.getByLabel('Title').fill(title);
    await page.getByLabel('Message').fill(body);

    const responsePromise = page.waitForResponse((response) => {
      return (
        response.url().includes('/api/admin/notifications') &&
        response.request().method() === 'POST'
      );
    });

    await page.getByRole('button', { name: 'Send notification' }).click();

    const response = await responsePromise;
    expect(response.ok()).toBeTruthy();
    const payload = (await response.json()) as { recipientCount?: number };
    expect(payload.recipientCount).toBe(1);
    await expect(page.getByRole('status')).toContainText(
      'Notification sent to 1 recipients.',
    );
    await logoutFromProfileMenu(page);

    await loginWithCredentials(page, managerUser.email, managerUser.password);
    await expect
      .poll(() => getUnreadNotificationCount(page))
      .toBeGreaterThan(unreadBefore);

    await openNotificationBell(page);
    await expect(page.getByText(title)).toBeVisible();
    await expect(page.getByText(body)).toBeVisible();
  });

  test('delivers a blog-post notification to seeded followers after jobs run', async ({
    page,
  }) => {
    const postToken = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const postTitle = `Follower update ${postToken}`;
    const postContent = `This seeded follower notification verifies that blog publishing fans out alerts to followers for ${postToken}.`;

    await loginWithCredentials(page, aliceUser.email, aliceUser.password);
    const unreadBefore = await getUnreadNotificationCount(page);
    await logoutFromProfileMenu(page);

    await loginWithCredentials(page, primaryUser.email, primaryUser.password);
    await gotoAndWaitForHydration(page, '/en/profile/blog');

    await page.getByLabel('Title').fill(postTitle);
    await page.getByLabel('Post content').fill(postContent);
    await page.getByRole('button', { name: 'Publish post' }).click();

    await expect(page.getByRole('status')).toContainText('Published');
    await expect(page.getByLabel('Title')).toHaveValue(postTitle);
    await expect(page.getByLabel('Post content')).toHaveValue(postContent);
    await runQueuedJobs();
    await logoutFromProfileMenu(page);

    await loginWithCredentials(page, aliceUser.email, aliceUser.password);
    await expect
      .poll(() => getUnreadNotificationCount(page))
      .toBeGreaterThan(unreadBefore);

    await openNotificationBell(page);
    const notificationMenuItem = page
      .getByRole('menuitem')
      .filter({ hasText: postTitle })
      .first();
    await expect(notificationMenuItem).toContainText(
      'Test User published a new blog post',
    );
    await expect(notificationMenuItem).toContainText(postTitle);

    await gotoAndWaitForHydration(page, '/en/notifications');

    const notificationLink = page
      .locator('a')
      .filter({ hasText: postTitle })
      .first();
    await expect(notificationLink).toContainText('Unread');
    await expect(notificationLink).toContainText(
      'Test User published a new blog post',
    );
  });

  test('persists local drafts across reload and publishes queued drafts after reconnect', async ({
    page,
  }) => {
    const postToken = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const postTitle = `Offline draft ${postToken}`;
    const postContent = `This local-first draft should survive a reload and publish after reconnect for ${postToken}.`;

    await loginWithCredentials(page, primaryUser.email, primaryUser.password);
    await gotoAndWaitForHydration(page, '/en/profile/blog');
    await waitForServiceWorkerReady(page);

    await page.getByLabel('Title').fill(postTitle);
    await page.getByLabel('Post content').fill(postContent);
    await expect(page.getByRole('status')).toContainText('Saved locally');
    await page.context().setOffline(true);
    await page.goto('/en/profile/blog', { waitUntil: 'domcontentloaded' });
    await waitForAppHydration(page);

    await expect(page.getByLabel('Title')).toHaveValue(postTitle);
    await expect(page.getByLabel('Post content')).toHaveValue(postContent);
    await page.getByRole('button', { name: 'Publish post' }).click();
    await expect(page.getByRole('status')).toContainText('Queued to publish');

    await page.context().setOffline(false);
    await expect(page.getByRole('status')).toContainText('Published');
    await expect(
      page.locator('article').filter({ hasText: postTitle }).first(),
    ).toContainText(postContent);
  });
});

function getFriendsCard(page: Page) {
  return page
    .locator('section,div')
    .filter({ has: page.getByRole('heading', { name: 'Friends' }) })
    .first();
}

function getSearchResult(scope: Page | Locator, displayName: string): Locator {
  return scope
    .locator('div.rounded-lg')
    .filter({ hasText: displayName })
    .first();
}

function getFriendsEntry(page: Page, displayName: string): Locator {
  return getFriendsCard(page)
    .locator('div.rounded-lg')
    .filter({ hasText: displayName })
    .first();
}

function getNotificationBell(page: Page) {
  return page.getByRole('button', {
    name: /^Notifications(?:, \d+ unread)?$/,
  });
}

async function getUnreadNotificationCount(page: Page) {
  const label = await getNotificationBell(page).getAttribute('aria-label');
  const match = label?.match(/Notifications(?:, (\d+) unread)?/);

  if (!match || !label?.startsWith('Notifications')) {
    throw new Error(
      `Unable to parse unread notification count from "${label ?? 'missing'}".`,
    );
  }

  return Number(match[1] ?? 0);
}

async function openNotificationBell(page: Page) {
  await getNotificationBell(page).click();
  await expect(
    page.getByRole('menu', { name: /^Notifications(?:, \d+ unread)?$/ }),
  ).toBeVisible();
}
