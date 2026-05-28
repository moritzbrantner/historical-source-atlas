import { expect, test } from '@playwright/test';
import {
  getSeededUser,
  gotoAndWaitForHydration,
  loginWithCredentials,
} from '@/scripts/e2e/helpers';

const memberUser = getSeededUser('user@example.com');

test('navbar groups destinations into categories and reveals submenu links on click', async ({
  page,
}) => {
  await loginWithCredentials(page, memberUser.email, memberUser.password);
  await gotoAndWaitForHydration(page, '/en');
  const discoverSubmenu = page.locator('[data-slot="platform-navbar-submenu"]');

  await expect(page.getByRole('button', { name: 'Discover' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Social' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Workspace' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'About' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Discover' }).click();
  await expect(
    discoverSubmenu.getByRole('link', { name: 'About' }),
  ).toBeVisible();

  await discoverSubmenu.getByRole('link', { name: 'About' }).click();

  await expect(page).toHaveURL('/en/about');
  await expect(
    page.getByRole('heading', { name: 'About This Project' }),
  ).toBeVisible();

  await page.goBack();

  await expect(page).toHaveURL('/en');
  await expect(
    page.getByRole('navigation', { name: 'Primary navigation' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Discover' })).toBeVisible();
});
