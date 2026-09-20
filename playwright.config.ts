import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  timeout: 90000,
  use: {
    baseURL: "http://127.0.0.1:3001",
    headless: true,
    viewport: { width: 1440, height: 1000 },
    launchOptions: {
      channel: process.platform === "win32" ? "msedge" : undefined,
    },
  },
  webServer: {
    command: "node scripts/start-ui-test-server.mjs",
    url: "http://127.0.0.1:3001",
    reuseExistingServer: false,
    timeout: 120000,
  },
  reporter: "list",
});
