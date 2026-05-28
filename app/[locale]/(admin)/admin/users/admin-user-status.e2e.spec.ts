import { expect, test } from '@playwright/test';

import {
  getSeededUser,
  gotoAndWaitForHydration,
  loginWithCredentials,
  logoutFromProfileMenu,
} from '@/scripts/e2e/helpers';

const superAdminUser = getSeededUser('superadmin@example.com');
const regularUser = getSeededUser('user@example.com');

test.describe('admin user status management', () => {
  test('lets a superadmin disable and reactivate a user from the detail page', async ({
    page,
  }) => {
    await loginWithCredentials(
      page,
      superAdminUser.email,
      superAdminUser.password,
    );
    await gotoAndWaitForHydration(page, '/en/admin/users');

    await page.getByLabel('Search users').fill(regularUser.email);
    const userRow = page
      .getByRole('row')
      .filter({ hasText: regularUser.email });
    await expect(userRow).toBeVisible();
    await userRow.getByRole('link', { name: 'Inspect' }).click();

    await expect(
      page.getByRole('heading', { name: 'User inspection' }),
    ).toBeVisible();
    await page.getByLabel('Disable reason').fill('E2E status workflow');
    await page.getByRole('button', { name: 'Disable user' }).click();

    await expect(page).toHaveURL(/status=user-status-disable/);
    await expect(page.getByText('User status updated.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Disabled' })).toBeVisible();

    await page.getByRole('button', { name: 'Reactivate user' }).click();

    await expect(page).toHaveURL(/status=user-status-reactivate/);
    await expect(page.getByText('User status updated.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Active' })).toBeVisible();

    await logoutFromProfileMenu(page);
    await loginWithCredentials(page, regularUser.email, regularUser.password);
  });
});
