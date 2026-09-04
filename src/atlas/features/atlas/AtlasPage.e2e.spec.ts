import { expect, test } from '@playwright/test';

import { expectNoA11yViolations } from '../../test/playwright/accessibility';
import { expectNoHorizontalOverflow } from '../../test/playwright/layout';

test('atlas loads with source list, map, and default source', async ({
  page,
}) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', {
      name: 'Map the places where texts and artifacts entered the record.',
    }),
  ).toBeVisible();
  await expect(page.getByLabel('Timeline controls')).toBeVisible();
  await expect(page.getByLabel('Source details')).toBeVisible();
  await expect(page.getByLabel('Source list')).toBeVisible();
  await expect(
    page.getByText('4 visible sources', { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByLabel('Source details')
      .getByRole('heading', { name: 'Dead Sea Scrolls' }),
  ).toBeVisible();

  const sourceList = page.getByLabel('Source list');
  await expect(
    sourceList.getByRole('button', { name: /Dead Sea Scrolls/ }),
  ).toBeVisible();
  await expect(
    sourceList.getByRole('button', { name: /Rosetta Stone/ }),
  ).toBeVisible();
  await expect(
    sourceList.getByRole('button', { name: /Nag Hammadi Codices/ }),
  ).toBeVisible();
  await expect(
    sourceList.getByRole('button', { name: /Oxyrhynchus Papyri/ }),
  ).toBeVisible();

  const map = page.locator('.source-map-panel');
  await expect(map).toBeVisible();
  await expect(map.locator('.leaflet-container')).toBeVisible();
  await expect(map.getByLabel('Map legend')).toBeVisible();
  await expect
    .poll(async () => map.evaluate((element) => element.childElementCount))
    .toBeGreaterThan(0);
});

test('search filters source list and can be cleared', async ({ page }) => {
  await page.goto('/');

  await page.getByPlaceholder('Qumran, papyri, Iran...').fill(' QUMRAN ');

  const sourceList = page.getByLabel('Source list');
  await expect(page.getByText('1 visible', { exact: true })).toBeVisible();
  await expect(
    sourceList.getByRole('button', { name: /Dead Sea Scrolls/ }),
  ).toBeVisible();
  await expect(
    sourceList.getByRole('button', { name: /Rosetta Stone/ }),
  ).toHaveCount(0);

  await page.getByPlaceholder('Qumran, papyri, Iran...').fill('');
  await expect(
    page.getByText('4 visible sources', { exact: true }),
  ).toBeVisible();
});

test('timeline mode can change and reset to full range', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('Use').selectOption('source');

  await expect(page.getByText(/Source date timeline/)).toBeVisible();
  await expect(page.getByText(/Sources dated by/)).toBeVisible();
  await page.getByRole('button', { name: 'Full range' }).click();
  await expect(
    page.getByText('4 visible sources', { exact: true }),
  ).toBeVisible();
});

test('source kind filters update the visible source list', async ({ page }) => {
  await page.goto('/');

  const sourceTypeScope = page
    .locator('fieldset')
    .filter({ hasText: 'Source type scope' });
  await sourceTypeScope.getByRole('checkbox', { name: 'All' }).nth(5).click();

  await expect(page.getByText('3 visible', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Clear sourceKinds filter' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Clear sourceKinds filter' }).click();
  await expect(
    page.getByText('4 visible sources', { exact: true }),
  ).toBeVisible();
});

test('reference direction filters update map link legend', async ({ page }) => {
  await page.goto('/');

  const mapLinks = page.locator('fieldset').filter({ hasText: 'Map links' });
  await expect(
    page.getByLabel('Map legend').getByText('References'),
  ).toBeVisible();
  await expect(
    page.getByLabel('Map legend').getByText('Referenced by'),
  ).toBeVisible();

  await mapLinks.getByRole('checkbox', { name: 'All' }).click();

  await expect(
    page.getByLabel('Map legend').getByText('References'),
  ).toHaveCount(0);
  await expect(
    page.getByLabel('Map legend').getByText('Referenced by'),
  ).toHaveCount(0);

  await mapLinks.getByRole('checkbox', { name: 'All' }).click();
  await expect(
    page.getByLabel('Map legend').getByText('References'),
  ).toBeVisible();
  await expect(
    page.getByLabel('Map legend').getByText('Referenced by'),
  ).toBeVisible();
});

test('filter controls can be minimized and restored', async ({ page }) => {
  await page.goto('/');

  const sourceTypeScope = page
    .locator('fieldset')
    .filter({ hasText: 'Source type scope' });
  const mapLinks = page.locator('fieldset').filter({ hasText: 'Map links' });

  await expect(sourceTypeScope).toBeVisible();
  await expect(mapLinks).toBeVisible();

  await page.getByRole('button', { name: 'Minimize filters' }).click();

  await expect(page.getByPlaceholder('Qumran, papyri, Iran...')).toBeVisible();
  await expect(sourceTypeScope).toHaveCount(0);
  await expect(mapLinks).toHaveCount(0);

  await page.getByRole('button', { name: 'Expand filters' }).click();

  await expect(sourceTypeScope).toBeVisible();
  await expect(mapLinks).toBeVisible();
});

test('source list selection updates details and source-page navigation', async ({
  page,
}) => {
  await page.goto('/');

  const sourceList = page.getByLabel('Source list');
  const rosettaStone = sourceList.getByRole('button', {
    name: /Rosetta Stone/,
  });

  await rosettaStone.click();

  const details = page.getByLabel('Source details');
  await expect(
    details.getByRole('heading', { name: 'Rosetta Stone' }),
  ).toBeVisible();
  await expect(details.getByText('Rashid (Rosetta), Egypt')).toBeVisible();
  await expect(details.getByText('Discovery')).toBeVisible();
  await expect(
    details.getByText('British Museum', { exact: true }),
  ).toBeVisible();
  await expect(rosettaStone).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: 'Open source page' }).click();
  await expect(page).toHaveURL(/\/sources\/rosetta-stone$/);
});

test('atlas has no serious or critical accessibility violations', async ({
  page,
}) => {
  await page.goto('/');

  await expectNoA11yViolations(page);

  await expect(
    page.locator('fieldset').filter({ hasText: 'Source type scope' }),
  ).toBeVisible();
  await expectNoA11yViolations(page);
});

test('desktop atlas has no horizontal overflow and shows primary regions', async ({
  page,
}) => {
  await page.goto('/');

  await expect(page.locator('.source-map-panel')).toBeVisible();
  await expect(page.getByLabel('Source details')).toBeVisible();
  await expect(page.getByLabel('Source list')).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('mobile atlas remains usable without horizontal overflow', async ({
  page,
}) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', {
      name: 'Map the places where texts and artifacts entered the record.',
    }),
  ).toBeVisible();
  await expect(page.getByPlaceholder('Qumran, papyri, Iran...')).toBeVisible();
  await expect(page.getByLabel('Timeline controls')).toBeVisible();
  await expect(page.locator('.source-map-panel')).toBeVisible();
  await expect(page.getByLabel('Source list')).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
