import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    locale: "id-ID",
    timezoneId: "Asia/Jakarta",
  },

  /*
   * Dua cabang tata letak kerangka aplikasi diuji terpisah: di bawah 64rem
   * memakai batang bawah, 64rem ke atas memakai sisi navigasi. Lebarnya
   * ditulis langsung supaya yang diuji jelas cabang mana.
   */
  projects: [
    {
      name: "layar-sempit",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 393, height: 851 },
        hasTouch: true,
      },
    },
    {
      name: "layar-lebar",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
  ],

  webServer: {
    command: `npm run dev -- --port ${new URL(BASE_URL).port || "3000"}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
