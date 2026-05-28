import { defineConfig, devices } from "@playwright/test";

const isCi = Boolean(process.env.CI);

export default defineConfig({
  expect: {
    timeout: 10000,
  },
  fullyParallel: true,
  projects: [
    {
      name: "chromium-desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: {
          height: 1000,
          width: 1440,
        },
      },
    },
    {
      name: "chromium-mobile",
      use: {
        ...devices["Pixel 5"],
      },
    },
  ],
  reporter: isCi ? [["github"], ["html", { open: "never" }]] : "list",
  retries: isCi ? 1 : 0,
  testDir: "./src",
  testMatch: "**/*.e2e.ts",
  use: {
    baseURL: "http://127.0.0.1:5180",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "bun run dev --host 127.0.0.1",
    reuseExistingServer: !isCi,
    url: "http://127.0.0.1:5180",
  },
});
