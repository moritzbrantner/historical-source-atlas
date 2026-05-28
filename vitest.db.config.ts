import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["db/**/*.db.test.ts", "src/**/*.db.test.ts"],
    testTimeout: 30000,
  },
});
