import { expect, test } from "@playwright/test";

test("atlas loads with source list and default source", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Map the places where texts and artifacts entered the record.",
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Timeline controls")).toBeVisible();
  await expect(page.getByText("12 visible", { exact: true })).toBeVisible();
  await expect(
    page.getByLabel("Source details").getByRole("heading", { name: "Dead Sea Scrolls" }),
  ).toBeVisible();

  const sourceList = page.getByLabel("Source list");
  await expect(sourceList.getByRole("button", { name: /Dead Sea Scrolls/ })).toBeVisible();
  await expect(sourceList.getByRole("button", { name: /Rosetta Stone/ })).toBeVisible();
  await expect(sourceList.getByRole("button", { name: /Antikythera Mechanism/ })).toBeVisible();
});

test("search filters source list", async ({ page }) => {
  await page.goto("/");

  await page.getByPlaceholder("Qumran, papyri, Iran...").fill(" QUMRAN ");

  const sourceList = page.getByLabel("Source list");
  await expect(page.getByText("1 visible", { exact: true })).toBeVisible();
  await expect(sourceList.getByRole("button", { name: /Dead Sea Scrolls/ })).toBeVisible();
  await expect(sourceList.getByRole("button", { name: /Antikythera Mechanism/ })).toHaveCount(0);

  await page.getByPlaceholder("Qumran, papyri, Iran...").fill("");
  await expect(page.getByText("12 visible", { exact: true })).toBeVisible();
});

test("timeline mode can change and reset to full range", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Use").selectOption("source");

  await expect(page.getByText(/Source date timeline/)).toBeVisible();
  await expect(page.getByText(/Sources dated by/)).toBeVisible();
  await page.getByRole("button", { name: "Full range" }).click();
  await expect(page.getByText("12 visible", { exact: true })).toBeVisible();
});

test("source list selection updates details", async ({ page }) => {
  await page.goto("/");

  await page
    .getByLabel("Source list")
    .getByRole("button", { name: /Rosetta Stone/ })
    .click();

  const details = page.getByLabel("Source details");
  await expect(details.getByRole("heading", { name: "Rosetta Stone" })).toBeVisible();
  await expect(details.getByText("Rashid (Rosetta), Egypt")).toBeVisible();
  await expect(details.getByText("Discovery")).toBeVisible();
  await expect(details.getByText("British Museum", { exact: true })).toBeVisible();
});

test("opens source page and returns to atlas", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Open source page" }).click();

  await expect(page).toHaveURL(/\/sources\/dead-sea-scrolls$/);
  await expect(page.getByRole("button", { name: "Back to atlas" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Detailed Information" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Reference Network" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Atlas Context" })).toBeVisible();

  await page.getByRole("button", { name: "Back to atlas" }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByLabel("Source list")).toBeVisible();
});
