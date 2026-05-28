import { expect, test } from '@playwright/test';

import {
  getSeededUser,
  gotoAndWaitForHydration,
  loginWithCredentials,
} from '@/scripts/e2e/helpers';
import { seedTestUsers } from '@/src/testing/test-users';

const deletionUser = getSeededUser('delete-account@example.com');

async function recreateDeletionUserIfNeeded() {
  await seedTestUsers();
}

test.describe('account deletion', () => {
  test('lets a user delete their account from settings', async ({ page }) => {
    try {
      await loginWithCredentials(
        page,
        deletionUser.email,
        deletionUser.password,
      );

      await gotoAndWaitForHydration(page, '/en/settings/account');
      await expect(
        page.getByRole('heading', { name: 'Delete account' }),
      ).toBeVisible();

      const deleteForm = page.locator('form').filter({
        has: page.getByRole('button', { name: 'Delete account' }),
      });

      await deleteForm
        .getByLabel('Current password')
        .fill(deletionUser.password);
      await deleteForm.getByRole('button', { name: 'Delete account' }).click();

      await expect(page).toHaveURL('/en');
      await expect(
        page.getByRole('heading', {
          name: 'One template, multiple production-ready starting points.',
        }),
      ).toBeVisible();

      await gotoAndWaitForHydration(page, '/en/settings/account');
      await expect(page).toHaveURL('/en');

      await gotoAndWaitForHydration(page, '/en/login');
      await page.getByLabel('Email').fill(deletionUser.email);
      await page.getByLabel('Password').fill(deletionUser.password);
      await page.getByRole('button', { name: 'Log in' }).click();

      await expect(
        page.getByText('Email or password is incorrect.'),
      ).toBeVisible();
      await expect(page).toHaveURL('/en/login');
    } finally {
      await recreateDeletionUserIfNeeded();
    }
  });
});
