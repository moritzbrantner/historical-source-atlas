import { expect, test } from '@playwright/test';

import {
  extractFirstUrl,
  getSeededUser,
  gotoAndWaitForHydration,
  loginWithCredentials,
  waitForMailpitMessage,
} from '@/scripts/e2e/helpers';

const managerUser = getSeededUser('manager@example.com');
const regularUser = getSeededUser('user@example.com');

test.describe('settings and hotkeys', () => {
  test('persists settings choices across reloads', async ({ page }) => {
    await loginWithCredentials(page, regularUser.email, regularUser.password);

    await gotoAndWaitForHydration(page, '/en/settings');
    await page
      .getByRole('button', { name: /Aurora Cool cyan and green gradients\./ })
      .click();

    await gotoAndWaitForHydration(page, '/en/settings/dates');
    await page.getByLabel('Date format').selectOption('iso');
    await expect(page.getByText(/\d{4}-\d{2}-\d{2}/)).toBeVisible();

    await gotoAndWaitForHydration(page, '/en/settings/workflow');
    await page.getByRole('switch', { name: 'Show hotkey hints' }).click();
    await expect(page.getByRole('button', { name: 'Search' })).toHaveCount(0);

    await gotoAndWaitForHydration(page, '/en/settings/notifications');
    await page.getByRole('switch', { name: 'Enable notifications' }).click();
    await page.getByRole('button', { name: 'Digest' }).click();

    await page.reload();
    await gotoAndWaitForHydration(page, '/en/settings/notifications');

    await expect(page.locator('html')).toHaveAttribute(
      'data-hotkey-hints',
      'hidden',
    );
    await expect(page.getByRole('button', { name: 'Search' })).toHaveCount(0);

    await gotoAndWaitForHydration(page, '/en/settings');
    await expect(
      page.getByRole('button', {
        name: /Aurora Cool cyan and green gradients\./,
      }),
    ).toHaveAttribute('aria-pressed', 'true');

    await gotoAndWaitForHydration(page, '/en/settings/dates');
    await expect(page.getByText(/\d{4}-\d{2}-\d{2}/)).toBeVisible();

    await gotoAndWaitForHydration(page, '/en/settings/workflow');
    await expect(
      page.getByRole('switch', { name: 'Show hotkey hints' }),
    ).toHaveAttribute('aria-checked', 'false');

    await gotoAndWaitForHydration(page, '/en/settings/notifications');
    await expect(
      page.getByRole('switch', { name: 'Enable notifications' }),
    ).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByLabel('Notification type')).toHaveValue('digest');

    await gotoAndWaitForHydration(page, '/en/settings/privacy');
    await expect(
      page.getByRole('switch', { name: 'Allow people to find me' }),
    ).toBeVisible();
  });

  test('does not expose admin hotkeys to manager roles', async ({ page }) => {
    await loginWithCredentials(page, managerUser.email, managerUser.password);

    const hotkeysButton = page.getByRole('button', { name: 'Search' });
    await expect(hotkeysButton).toBeVisible();

    await hotkeysButton.click();
    const hotkeysDialog = page.getByRole('dialog', {
      name: 'Search',
    });
    await expect(
      hotkeysDialog.getByRole('button', { name: 'Admin' }),
    ).toHaveCount(0);
    await expect(
      hotkeysDialog.getByRole('button', { name: 'Settings' }),
    ).toBeVisible();
    await page.keyboard.press('Escape');

    await hotkeysButton.focus();
    await page.keyboard.press('Alt+E');
    await expect(page).toHaveURL('/en/settings');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

    await hotkeysButton.focus();
    await page.keyboard.press('Alt+P');
    await expect(page).toHaveURL('/en/profile');

    await hotkeysButton.focus();
    await page.keyboard.press('Alt+E');
    await expect(page).toHaveURL('/en/settings');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  });

  test('keeps regular users out of admin pages', async ({ page }) => {
    await loginWithCredentials(page, regularUser.email, regularUser.password);

    await gotoAndWaitForHydration(page, '/en/admin');
    await expect(page).toHaveURL('/en');
    await expect(
      page.getByRole('heading', {
        name: 'One template, multiple production-ready starting points.',
      }),
    ).toBeVisible();
  });

  test('lets a user change their email from settings', async ({ page }) => {
    const timestamp = Date.now();
    const email = `settings-${timestamp}@example.com`;
    const nextEmail = `settings-updated-${timestamp}@example.com`;
    const password = 'SettingsUser123';

    await gotoAndWaitForHydration(page, '/en/register');
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByLabel('Confirm password').fill(password);
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByLabel('Display name').fill('Settings User');
    await page.getByRole('button', { name: 'Create account' }).click();

    const verificationMessage = await waitForMailpitMessage({
      to: email,
      subject: 'Verify your email address',
    });
    await gotoAndWaitForHydration(
      page,
      extractFirstUrl(verificationMessage.raw),
    );
    await loginWithCredentials(page, email, password);
    await gotoAndWaitForHydration(page, '/en/settings/account');

    await page.getByLabel('New email address').fill(nextEmail);
    await page.getByLabel('Current password').first().fill(password);
    await page.getByRole('button', { name: 'Update email' }).click();

    await expect(page.getByLabel('Current email address')).toHaveValue(
      nextEmail,
    );
  });
});
