import { expect, test } from "@playwright/test";

test("desktop atlas has no horizontal overflow and shows primary regions", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator(".source-map-panel")).toBeVisible();
  await expect(page.getByLabel("Source details")).toBeVisible();
  await expect(page.getByLabel("Source list")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("mobile atlas remains usable without horizontal overflow", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Map the places where texts and artifacts entered the record.",
    }),
  ).toBeVisible();
  await expect(page.getByPlaceholder("Qumran, papyri, Iran...")).toBeVisible();
  await expect(page.getByLabel("Timeline controls")).toBeVisible();
  await expect(page.locator(".source-map-panel")).toBeVisible();
  await expect(page.getByLabel("Source list")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("mobile source page remains usable without horizontal overflow", async ({ page }) => {
  await page.goto("/sources/dead-sea-scrolls");

  await expect(page.getByRole("heading", { name: "Dead Sea Scrolls" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Back to atlas" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Reference Network" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );

  expect(hasHorizontalOverflow).toBe(false);
}
