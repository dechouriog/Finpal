import { defineConfig } from "@playwright/test";

/**
 * E2E against an isolated production build (port 3100, prisma/e2e.db, .next-e2e).
 * Pal runs in deterministic fallback mode and the PayPal popup is mocked in the
 * browser, so the suite needs no API keys and no network.
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: "http://localhost:3100",
    viewport: { width: 1440, height: 900 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  // The Desktop | Mobile toggle is part of the app (container queries), so both
  // projects use a laptop-sized browser and switch modes with ?device=.
  projects: [
    { name: "desktop", use: { device: "desktop" } as never },
    { name: "mobile", use: { device: "mobile" } as never },
  ],
  webServer: {
    command: "node scripts/e2e-server.mjs",
    url: "http://localhost:3100/api/health",
    timeout: 300_000,
    reuseExistingServer: !process.env.CI,
    env: {
      NEXT_DIST_DIR: ".next-e2e",
      DATABASE_URL: "file:./e2e.db",
      AUTH_SECRET: "e2e-only-secret-not-used-anywhere-else-000000",
      AI_FORCE_FALLBACK: "1",
      OPENROUTER_API_KEY: "e2e-unused",
      PAYPAL_ENV: "sandbox",
      PAYPAL_CLIENT_ID: "e2e-client-id",
      PAYPAL_CLIENT_SECRET: "e2e-client-secret",
      NEXT_PUBLIC_PAYPAL_CLIENT_ID: "e2e-client-id",
      DEMO_RECORDING_KEY: "e2e-recording-key-0000000000",
    },
  },
});
