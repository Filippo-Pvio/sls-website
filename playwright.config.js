import { defineConfig } from "playwright/test";

const port = Number(process.env.QA_PORT || 4173);

export default defineConfig({
  testDir: "./qa",
  testMatch: "browser.spec.js",
  fullyParallel: false,
  reporter: [["line"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  projects: [
    { name: "desktop-chromium", use: { viewport: { width: 1440, height: 900 } } },
    { name: "mobile-chromium", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: "tablet-chromium", use: { viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true } }
  ],
  webServer: {
    command: "node qa/server.mjs",
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: true,
    timeout: 30000
  }
});
