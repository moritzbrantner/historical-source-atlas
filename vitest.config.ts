import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    exclude: ["e2e/**", "src/**/*.db.test.ts", "db/**/*.db.test.ts", "node_modules/**"],
    include: ["src/**/*.test.ts", "src/**/*.spec.ts", "src/**/*.test.tsx"],
    setupFiles: ["src/test/setup.ts"],
  },
});
