import { expect, test } from "@playwright/test";

import { expectNoA11yViolations } from "../test/playwright/accessibility";

test("app renders atlas and direct source routes", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Map the places where texts and artifacts entered the record.",
    }),
  ).toBeVisible();

  await page.goto("/sources/dead-sea-scrolls");
  await expect(page.getByRole("heading", { name: "Dead Sea Scrolls" })).toBeVisible();
});

test("in-app source navigation and browser history update route state", async ({ page }) => {
  await page.goto("/");

  await page
    .getByLabel("Source list")
    .getByRole("button", { name: /Rosetta Stone/ })
    .click();
  await page.getByRole("button", { name: "Open source page" }).click();

  await expect(page).toHaveURL(/\/sources\/rosetta-stone$/);
  await expect(page.getByRole("heading", { name: "Rosetta Stone" })).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL("/");
  await expect(page.getByLabel("Source list")).toBeVisible();

  await page.goForward();
  await expect(page).toHaveURL(/\/sources\/rosetta-stone$/);
  await expect(page.getByRole("heading", { name: "Rosetta Stone" })).toBeVisible();
});

test("primary app routes pass serious and critical accessibility scans", async ({ page }) => {
  await page.goto("/");
  await expectNoA11yViolations(page);

  await page.goto("/sources/dead-sea-scrolls");
  await expectNoA11yViolations(page);
});
