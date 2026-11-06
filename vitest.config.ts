import path from "node:path";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  // tsconfig keeps jsx "preserve" for Next.js; tests compile JSX with the automatic runtime.
  oxc: { jsx: { runtime: "automatic" } },
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
      // Server-only guard is a build-time check; tests import server modules directly.
      "server-only": path.resolve(__dirname, "tests/stubs/server-only.ts"),
    },
  },
  test: {
    // Playwright owns tests/e2e.
    exclude: [...configDefaults.exclude, "tests/e2e/**"],
    globalSetup: ["tests/global-setup.ts"],
    setupFiles: ["tests/setup.ts"],
    env: { DATABASE_URL: "file:./test.db", AI_DAILY_LIMIT: "60" },
    // Tests share one SQLite file; run files one at a time.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
