import { expect, test } from "@playwright/test";

test("direct source route renders source page", async ({ page }) => {
  await page.goto("/sources/dead-sea-scrolls");

  await expect(page.getByRole("heading", { name: "Dead Sea Scrolls" })).toBeVisible();
  await expect(page.getByText("Qumran Caves, near the Dead Sea")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Reference Network" })).toBeVisible();

  const map = page.locator(".source-page-map");
  await expect(map).toBeVisible();
  await expect(map.locator(".leaflet-container")).toBeVisible();
  await expect
    .poll(async () => map.evaluate((element) => element.childElementCount))
    .toBeGreaterThan(0);
});

test("unknown source route offers source suggestions", async ({ page }) => {
  await page.goto("/sources/not-a-real-source");

  await expect(page.getByText("Source not found")).toBeVisible();
  await page.getByRole("button", { name: "Dead Sea Scrolls" }).click();

  await expect(page).toHaveURL(/\/sources\/dead-sea-scrolls$/);
  await expect(page.getByRole("heading", { name: "Dead Sea Scrolls" })).toBeVisible();
});

test("related source navigation changes the source page", async ({ page }) => {
  await page.goto("/sources/rosetta-stone");

  await page.getByRole("button", { name: /Nag Hammadi Codices/ }).click();

  await expect(page).toHaveURL(/\/sources\/nag-hammadi-codices$/);
  await expect(page.getByRole("heading", { name: "Nag Hammadi Codices" })).toBeVisible();
});
