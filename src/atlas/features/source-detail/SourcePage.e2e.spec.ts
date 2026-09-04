import { expect, test } from '@playwright/test';

import { expectNoA11yViolations } from '../../test/playwright/accessibility';
import { expectNoHorizontalOverflow } from '../../test/playwright/layout';

test('direct source route renders source page', async ({ page }) => {
  await page.goto('/sources/dead-sea-scrolls');

  await expect(
    page.getByRole('heading', { name: 'Dead Sea Scrolls' }),
  ).toBeVisible();
  await expect(page.getByText('Qumran Caves, near the Dead Sea')).toBeVisible();
  await expect(page.getByText('Location')).toBeVisible();
  await expect(page.getByText('Repository')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Detailed Information' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Evidence Review' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /community in the wilderness/ }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /^Reference Network/ }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Atlas Context' }),
  ).toBeVisible();

  const map = page.locator('.source-page-map');
  await expect(map).toBeVisible();
  await expect(map).toHaveAttribute(
    'aria-label',
    'Dead Sea Scrolls discovery location',
  );
});

test('unknown source route offers source suggestions', async ({ page }) => {
  await page.goto('/sources/not-a-real-source');

  await expect(page.getByText('Source not found')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Dead Sea Scrolls' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Dead Sea Scrolls' }).click();

  await expect(page).toHaveURL(/\/sources\/dead-sea-scrolls$/);
  await expect(
    page.getByRole('heading', { name: 'Dead Sea Scrolls' }),
  ).toBeVisible();
});

test('related source navigation changes the source page', async ({ page }) => {
  await page.goto('/sources/rosetta-stone');

  await expect(
    page.getByRole('heading', { name: 'Rosetta Stone' }),
  ).toBeVisible();
  await page.getByRole('button', { name: /Nag Hammadi Codices/ }).click();

  await expect(page).toHaveURL(/\/sources\/nag-hammadi-codices$/);
  await expect(
    page.getByRole('heading', { name: 'Nag Hammadi Codices' }),
  ).toBeVisible();
});

test('source page back button and browser history return between views', async ({
  page,
}) => {
  await page.goto('/');
  await page
    .getByLabel('Source list')
    .getByRole('button', { name: /Rosetta Stone/ })
    .click();
  await page.getByRole('button', { name: 'Open source page' }).click();

  await expect(page).toHaveURL(/\/sources\/rosetta-stone$/);
  await page.getByRole('button', { name: 'Back to atlas' }).click();

  await expect(page).toHaveURL(/\/en\/atlas$/);
  await expect(page.getByLabel('Source list')).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/sources\/rosetta-stone$/);
  await expect(
    page.getByRole('heading', { name: 'Rosetta Stone' }),
  ).toBeVisible();
});

test('source pages have no serious or critical accessibility violations', async ({
  page,
}) => {
  await page.goto('/sources/dead-sea-scrolls');
  await expectNoA11yViolations(page);

  await page.goto('/sources/not-a-real-source');
  await expect(page.getByText('Source not found')).toBeVisible();
  await expectNoA11yViolations(page);
});

test('mobile source page remains usable without horizontal overflow', async ({
  page,
}) => {
  await page.goto('/sources/dead-sea-scrolls');

  await expect(
    page.getByRole('heading', { name: 'Dead Sea Scrolls' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Back to atlas' }),
  ).toBeVisible();
  await expect(page.getByText('Location')).toBeVisible();
  await expect(
    page.getByRole('button', { name: /^Reference Network/ }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Evidence Review' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Atlas Context' }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
