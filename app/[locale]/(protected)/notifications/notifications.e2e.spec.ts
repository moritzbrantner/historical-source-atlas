import { expect, test, type Page } from '@playwright/test';

import {
  getSeededUser,
  gotoAndWaitForHydration,
  loginWithCredentials,
  logoutFromProfileMenu,
  waitForAppHydration,
} from '@/scripts/e2e/helpers';

const adminUser = getSeededUser('admin@example.com');
const recipientUser = getSeededUser('user@example.com');

test.describe('notifications', () => {
  test('delivers a direct admin notification to the recipient preview and feed', async ({
    page,
  }) => {
    const token = createNotificationToken();
    const title = `Admin alert ${token}`;
    const body = `Please review your notification center for ${token}.`;

    await loginWithCredentials(
      page,
      recipientUser.email,
      recipientUser.password,
    );
    const unreadBefore = await getUnreadNotificationCount(page);
    await logoutFromProfileMenu(page);

    await loginWithCredentials(page, adminUser.email, adminUser.password);
    await openUsersPageAsAdmin(page);
    await sendNotificationFromAdminUsersPage(page, {
      recipientEmail: recipientUser.email,
      title,
      body,
      href: '/settings',
    });
    await logoutFromProfileMenu(page);

    await loginWithCredentials(
      page,
      recipientUser.email,
      recipientUser.password,
    );
    await expect
      .poll(() => getUnreadNotificationCount(page))
      .toBeGreaterThan(unreadBefore);

    await openNotificationBell(page);
    await expect(page.getByText(title)).toBeVisible();
    await expect(page.getByText(body)).toBeVisible();

    await gotoAndWaitForHydration(page, '/en/notifications');

    const notificationLink = page
      .locator('a')
      .filter({ hasText: title })
      .first();
    await expect(notificationLink).toContainText('Unread');
    await expect(notificationLink).toContainText(body);

    const markReadResponsePromise = waitForNotificationReadResponse(page);
    await notificationLink.click();
    const markReadResponse = await markReadResponsePromise;
    expect(markReadResponse.ok()).toBeTruthy();

    await expect(page).toHaveURL('/en/settings');
    await waitForAppHydration(page);
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

    await gotoAndWaitForHydration(page, '/en/notifications');
    await expect(
      page.locator('article').filter({ hasText: title }).first(),
    ).toContainText('Read');
  });

  test('marks a linked notification as read when clicked from the notification bell', async ({
    page,
  }) => {
    const token = createNotificationToken();
    const title = `Bell link read ${token}`;
    const body = `Click this bell notification link for ${token}.`;

    await deliverNotificationToRecipient(page, {
      title,
      body,
      href: '/settings',
    });
    const unreadBeforeClick = await getUnreadNotificationCount(page);

    await openNotificationBell(page);
    const notificationMenuItem = page
      .getByRole('menuitem')
      .filter({ hasText: title })
      .first();
    await expect(notificationMenuItem).toContainText(body);

    const markReadResponsePromise = waitForNotificationReadResponse(page);
    await notificationMenuItem.click();
    const markReadResponse = await markReadResponsePromise;
    expect(markReadResponse.ok()).toBeTruthy();

    await expect(page).toHaveURL('/en/settings');
    await waitForAppHydration(page);
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    await expect
      .poll(() => getUnreadNotificationCount(page))
      .toBe(Math.max(0, unreadBeforeClick - 1));

    await gotoAndWaitForHydration(page, '/en/notifications');
    await expect(
      page.locator('article').filter({ hasText: title }).first(),
    ).toContainText('Read');
  });

  test('marks received notifications as read from the notifications page', async ({
    page,
  }) => {
    const token = createNotificationToken();
    const title = `Read check ${token}`;
    const body = `Mark this notification as read for ${token}.`;

    await deliverNotificationToRecipient(page, { title, body });
    await gotoAndWaitForHydration(page, '/en/notifications');

    const notificationCard = page
      .locator('article')
      .filter({ hasText: title })
      .first();
    await expect(notificationCard).toContainText('Unread');
    await expect
      .poll(() => getUnreadNotificationCount(page))
      .toBeGreaterThan(0);

    await page.getByRole('button', { name: 'Mark all as read' }).click();

    await expect(
      page.getByRole('button', { name: 'Mark all as read' }),
    ).toBeDisabled();
    await expect(notificationCard).toContainText('Read');
    await expect.poll(() => getUnreadNotificationCount(page)).toBe(0);
  });

  test('marks a single notification as read from the notifications page', async ({
    page,
  }) => {
    const token = createNotificationToken();
    const title = `Single page read ${token}`;
    const body = `Mark only this page notification as read for ${token}.`;

    await deliverNotificationToRecipient(page, { title, body });
    await gotoAndWaitForHydration(page, '/en/notifications');

    const unreadBefore = await getUnreadNotificationCount(page);
    const notificationCard = page
      .locator('article')
      .filter({ hasText: title })
      .first();
    await expect(notificationCard).toContainText('Unread');

    await notificationCard
      .getByRole('button', { name: 'Mark as read' })
      .click();

    await expect(notificationCard).toContainText('Read');
    await expect
      .poll(() => getUnreadNotificationCount(page))
      .toBe(Math.max(0, unreadBefore - 1));
  });

  test('marks notifications as read from the notifications component', async ({
    page,
  }) => {
    const token = createNotificationToken();
    const title = `Bell read ${token}`;
    const body = `Mark this bell notification as read for ${token}.`;

    await deliverNotificationToRecipient(page, { title, body });

    await openNotificationBell(page);

    const notificationCard = page
      .getByRole('menuitem')
      .filter({ hasText: title })
      .first();
    await expect(notificationCard).toContainText(body);

    await page.getByRole('menuitem', { name: 'Mark as read' }).click();

    await expect.poll(() => getUnreadNotificationCount(page)).toBe(0);
    await expect(
      page.getByRole('menuitem', { name: 'Mark as read' }),
    ).toHaveCount(0);
  });
});

function createNotificationToken() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

function waitForNotificationReadResponse(page: Page) {
  return page.waitForResponse((response) => {
    return (
      response.url().includes('/api/notifications/') &&
      response.url().endsWith('/read') &&
      response.request().method() === 'POST'
    );
  });
}

async function openUsersPageAsAdmin(page: Page) {
  await gotoAndWaitForHydration(page, '/en/admin/users');
  await expect(
    page.getByRole('heading', { name: 'User management' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Send notification' }),
  ).toBeVisible();
}

async function deliverNotificationToRecipient(
  page: Page,
  input: { title: string; body: string; href?: string },
) {
  await loginWithCredentials(page, recipientUser.email, recipientUser.password);
  const unreadBefore = await getUnreadNotificationCount(page);
  await logoutFromProfileMenu(page);

  await loginWithCredentials(page, adminUser.email, adminUser.password);
  await openUsersPageAsAdmin(page);
  await sendNotificationFromAdminUsersPage(page, {
    recipientEmail: recipientUser.email,
    title: input.title,
    body: input.body,
    href: input.href,
  });
  await logoutFromProfileMenu(page);

  await loginWithCredentials(page, recipientUser.email, recipientUser.password);
  await expect
    .poll(() => getUnreadNotificationCount(page))
    .toBeGreaterThan(unreadBefore);
}

async function sendNotificationFromAdminUsersPage(
  page: Page,
  input: { recipientEmail: string; title: string; body: string; href?: string },
) {
  await page.getByLabel('Recipient').fill(input.recipientEmail);
  const recipientResult = page
    .locator('button')
    .filter({ hasText: input.recipientEmail })
    .first();
  await expect(recipientResult).toBeVisible();
  await recipientResult.click();
  await expect(page.getByText(input.recipientEmail)).toBeVisible();

  await page.getByLabel('Title').fill(input.title);
  await page.getByLabel('Message').fill(input.body);

  if (input.href) {
    await page.getByLabel('Destination link').fill(input.href);
  }

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
}
