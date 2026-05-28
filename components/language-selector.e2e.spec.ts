import { expect, test } from '@playwright/test';
import { gotoAndWaitForHydration } from '@/scripts/e2e/helpers';

test('user can switch locale from the navbar and stay on the same route', async ({
  page,
}) => {
  await gotoAndWaitForHydration(page, '/en/about');

  await expect(page).toHaveURL('/en/about');
  await expect(
    page.getByRole('heading', { name: 'About This Project' }),
  ).toBeVisible();

  await page
    .getByRole('button', { name: 'Language selector: English' })
    .click();
  await page.getByRole('menuitemradio', { name: 'Deutsch' }).click();

  await expect(page).toHaveURL('/de/about');
  await expect(
    page.getByRole('heading', { name: /dieses Projekt/ }),
  ).toBeVisible();
});
