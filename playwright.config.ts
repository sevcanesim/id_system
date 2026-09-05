import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
const useExternalServer = Boolean(process.env.E2E_BASE_URL);

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: useExternalServer
    ? undefined
    : {
        command: "npm run build && npm run start -- --hostname 127.0.0.1",
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
  projects: [
    {
      name: "chromium-mobile",
      use: { ...devices["iPhone 13"], browserName: "chromium" },
    },
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
