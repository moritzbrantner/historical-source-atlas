import { writeFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';
import type { BrowserContext, Page, TestInfo } from '@playwright/test';

import { expectNoHorizontalOverflow } from '../../test/playwright/layout';

type Backend = 'maplibre' | 'maps';
type Profile = 'desktop' | 'mobile';

const sourceFixture = {
  id: 'dead-sea-scrolls',
  label: 'Dead Sea Scrolls',
  longitude: 35.458,
  latitude: 31.741,
  popup: 'Found: 1947-1956',
} as const;
const mapsRevision = 'de39696953559f46a2baf5fdd04736b75beca381';
const sourceUrl = '/en/atlas/sources/' + sourceFixture.id;

async function waitForRealRenderer(page: Page, backend: Backend) {
  const surface = page.locator('.source-page-map .mb-maps');
  await expect(surface).toHaveAttribute('data-map-ready', 'true', {
    timeout: 30_000,
  });

  if (backend === 'maps') {
    // Do not let a MapLibre shim pass as a first-party Maps execution.
    await expect(surface).toHaveAttribute('data-map-runtime', 'maps');
    const canvas = surface.locator('canvas[data-flat-runtime="maps"]');
    await expect(canvas).toBeVisible();
    await expect(canvas).toHaveAttribute(
      'data-map-base-renderer',
      /^(wgpu|canvas2d)$/,
      { timeout: 30_000 },
    );
    await expect(surface.locator('.maplibregl-canvas')).toHaveCount(0);
  } else {
    await expect(surface.locator('.maplibregl-canvas')).toBeVisible();
    await expect(surface.locator('canvas[data-flat-runtime="maps"]')).toHaveCount(0);
  }

  return surface;
}

async function clickCenter(page: Page, map: ReturnType<Page['locator']>, mobile: boolean) {
  const box = await map.boundingBox();
  expect(box).not.toBeNull();
  const x = box!.x + box!.width / 2;
  const y = box!.y + box!.height / 2;

  if (mobile) {
    await page.touchscreen.tap(x, y);
  } else {
    await page.mouse.click(x, y);
  }
}

async function touchPan(context: BrowserContext, page: Page, x: number, y: number) {
  const client = await context.newCDPSession(page);

  try {
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x, y }],
    });

    for (let step = 1; step <= 6; step += 1) {
      await client.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: x - step * 9, y: y - step * 6 }],
      });
      await page.waitForTimeout(30);
    }

    await client.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });
  } finally {
    await client.detach();
  }
}

async function touchZoom(context: BrowserContext, page: Page, x: number, y: number) {
  const client = await context.newCDPSession(page);

  try {
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [
        { x: x - 25, y },
        { x: x + 25, y },
      ],
    });

    for (let step = 1; step <= 6; step += 1) {
      await client.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [
          { x: x - 25 - step * 9, y },
          { x: x + 25 + step * 9, y },
        ],
      });
      await page.waitForTimeout(30);
    }

    await client.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });
  } finally {
    await client.detach();
  }
}

async function exerciseSourceMap(
  page: Page,
  backend: Backend,
  profile: Profile,
  testInfo: TestInfo,
  context: BrowserContext,
) {
  const errors: string[] = [];
  const consoleErrors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  const timings: Record<string, number> = {};
  const started = Date.now();
  const fileStem = 'renderer-comparison-' + backend + '-' + profile;
  const map = page.locator('.source-page-map');

  try {
    await page.goto(sourceUrl + '?mapBackend=' + backend);
    await expect(
      page.getByRole('heading', { name: sourceFixture.label }),
    ).toBeVisible();
    await expect(
      page.getByRole('combobox', { name: 'Map engine' }),
    ).toHaveValue(backend);
    await waitForRealRenderer(page, backend);
    timings.startupToReadyMs = Date.now() - started;

    const initialState = JSON.parse(
      (await map.getAttribute('data-map-view-state')) ?? 'null',
    );
    expect(initialState?.center[0]).toBeCloseTo(sourceFixture.longitude, 2);
    expect(initialState?.center[1]).toBeCloseTo(sourceFixture.latitude, 2);

    const popupStarted = Date.now();
    await clickCenter(page, page.locator('.source-page-map .mb-maps'), profile === 'mobile');
    await expect(map.getByText(sourceFixture.popup)).toBeVisible();
    timings.popupMs = Date.now() - popupStarted;

    const beforePan = await map.getAttribute('data-map-view-state');
    const surface = page.locator('.source-page-map .mb-maps');
    const box = await surface.boundingBox();
    expect(box).not.toBeNull();
    const x = box!.x + box!.width * 0.7;
    const y = box!.y + box!.height * 0.7;

    const panStarted = Date.now();
    if (profile === 'mobile') {
      await touchPan(context, page, x, y);
    } else {
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x - 54, y - 36, { steps: 8 });
      await page.mouse.up();
    }
    await expect
      .poll(() => map.getAttribute('data-map-view-state'))
      .not.toBe(beforePan);
    timings.panMs = Date.now() - panStarted;

    const beforeZoom = await map.getAttribute('data-map-view-state');
    const zoomStarted = Date.now();
    if (profile === 'mobile') {
      await touchZoom(context, page, x, y);
    } else {
      await page.mouse.move(x, y);
      await page.mouse.wheel(0, -340);
    }
    await expect
      .poll(() => map.getAttribute('data-map-view-state'))
      .not.toBe(beforeZoom);
    timings.zoomMs = Date.now() - zoomStarted;

    const previousBox = await map.boundingBox();
    await page.setViewportSize(
      profile === 'mobile'
        ? { width: 430, height: 844 }
        : { width: 980, height: 720 },
    );
    await expect.poll(async () => (await map.boundingBox())?.width).not.toBe(
      previousBox?.width,
    );
    await expectNoHorizontalOverflow(page);

    await page.reload();
    await expect(page).toHaveURL(new RegExp('mapBackend=' + backend));
    await expect(
      page.getByRole('heading', { name: sourceFixture.label }),
    ).toBeVisible();
    await waitForRealRenderer(page, backend);
    await clickCenter(page, page.locator('.source-page-map .mb-maps'), profile === 'mobile');
    await expect(map.getByText(sourceFixture.popup)).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    try {
      if (await map.isVisible()) {
        await map.screenshot({ path: testInfo.outputPath(fileStem + '.png') });
      }
    } catch (error) {
      errors.push('Screenshot: ' + String(error));
    }

    const details = await page.evaluate(() => ({
      userAgent: navigator.userAgent,
      hasTouch: navigator.maxTouchPoints > 0,
      hasWebGPU: 'gpu' in navigator,
    })).catch(() => null);
    const baseRenderer =
      backend === 'maps'
        ? await page
            .locator('canvas[data-flat-runtime="maps"]')
            .getAttribute('data-map-base-renderer')
            .catch(() => null)
        : 'maplibre';

    await writeFile(
      testInfo.outputPath(fileStem + '.json'),
      JSON.stringify(
        {
          atlasCommit: process.env.GITHUB_SHA ?? 'local',
          backend,
          baseRenderer,
          browser: details,
          consoleErrors,
          errors,
          mapsRevision,
          profile,
          source: sourceFixture,
          timings,
          viewState: await map.getAttribute('data-map-view-state').catch(() => null),
        },
        null,
        2,
      ),
    );
  }
}

test('source map defaults to MapLibre and rejects unknown renderer values', async ({
  page,
}) => {
  await page.goto(sourceUrl);
  await expect(page.getByRole('combobox', { name: 'Map engine' })).toHaveValue(
    'maplibre',
  );
  await waitForRealRenderer(page, 'maplibre');
  await page.goto(sourceUrl + '?mapBackend=unsupported');
  await expect(page.getByRole('status')).toContainText(
    'Unsupported mapBackend value',
  );
  await expect(page.getByRole('combobox', { name: 'Map engine' })).toHaveValue(
    'maplibre',
  );
  await waitForRealRenderer(page, 'maplibre');
});

test('renderer selection retains source, camera and browser history', async ({ page }) => {
  await page.goto(sourceUrl);
  const selector = page.getByRole('combobox', { name: 'Map engine' });
  const map = page.locator('.source-page-map');
  const surface = await waitForRealRenderer(page, 'maplibre');
  const box = await surface.boundingBox();
  expect(box).not.toBeNull();

  const start = await map.getAttribute('data-map-view-state');
  await page.mouse.move(box!.x + box!.width * 0.7, box!.y + box!.height * 0.7);
  await page.mouse.down();
  await page.mouse.move(
    box!.x + box!.width * 0.7 - 70,
    box!.y + box!.height * 0.7 - 30,
    { steps: 8 },
  );
  await page.mouse.up();
  await expect
    .poll(() => map.getAttribute('data-map-view-state'))
    .not.toBe(start);
  const panned = JSON.parse(
    (await map.getAttribute('data-map-view-state')) ?? 'null',
  );

  await selector.selectOption('maps');
  await expect(page).toHaveURL(/mapBackend=maps/);
  await waitForRealRenderer(page, 'maps');
  await expect(
    page.getByRole('heading', { name: sourceFixture.label }),
  ).toBeVisible();
  const selected = JSON.parse(
    (await map.getAttribute('data-map-view-state')) ?? 'null',
  );
  expect(selected.center[0]).toBeCloseTo(panned.center[0], 2);
  expect(selected.center[1]).toBeCloseTo(panned.center[1], 2);
  expect(selected.zoom).toBeCloseTo(panned.zoom, 1);

  await page.goBack();
  await expect(selector).toHaveValue('maplibre');
  await waitForRealRenderer(page, 'maplibre');

  await page.goForward();
  await expect(selector).toHaveValue('maps');
  await waitForRealRenderer(page, 'maps');
});

test('source navigation keeps the engine while changing historical identity', async ({
  page,
}) => {
  await page.goto('/en/atlas/sources/rosetta-stone?mapBackend=maps');
  await waitForRealRenderer(page, 'maps');
  await page.getByRole('button', { name: /Nag Hammadi Codices/ }).click();
  await expect(page).toHaveURL(/nag-hammadi-codices\?mapBackend=maps/);
  await expect(
    page.getByRole('heading', { name: 'Nag Hammadi Codices' }),
  ).toBeVisible();
  await waitForRealRenderer(page, 'maps');
});

for (const backend of ['maplibre', 'maps'] as const) {
  test('source location ' + backend + ' desktop comparison', async ({
    page,
    context,
  }, testInfo) => {
    await exerciseSourceMap(page, backend, 'desktop', testInfo, context);
  });

  test('source location ' + backend + ' mobile comparison', async ({
    browser,
  }, testInfo) => {
    const context = await browser.newContext({
      baseURL: testInfo.project.use.baseURL,
      deviceScaleFactor: 2,
      hasTouch: true,
      isMobile: true,
      viewport: { width: 390, height: 844 },
    });
    try {
      const page = await context.newPage();
      await exerciseSourceMap(page, backend, 'mobile', testInfo, context);
    } finally {
      await context.close();
    }
  });
}
