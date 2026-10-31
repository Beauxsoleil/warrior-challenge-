import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/pages",
  workers: 1,
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:4173/warrior-challenge-/",
    launchOptions: { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH },
  },
  webServer: {
    command: "npx vite preview --host 127.0.0.1 --port 4173 --strictPort --base /warrior-challenge-/",
    url: "http://127.0.0.1:4173/warrior-challenge-/",
    reuseExistingServer: false,
  },
});
