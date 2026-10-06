import { defineConfig, devices } from "@playwright/test";

// CI runs Chromium, Firefox and WebKit. Locally only Chromium unless ALL_BROWSERS is set.
const all = Boolean(process.env.ALL_BROWSERS);

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://localhost:3100" },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: process.env.CHROMIUM_PATH
          ? { executablePath: process.env.CHROMIUM_PATH }
          : {},
      },
    },
    ...(all
      ? [
          { name: "firefox", use: { ...devices["Desktop Firefox"] } },
          { name: "webkit", use: { ...devices["Desktop Safari"] } },
        ]
      : []),
  ],
  webServer: {
    command: "pnpm build && pnpm start",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
