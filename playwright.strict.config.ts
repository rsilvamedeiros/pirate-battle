import { defineConfig, devices } from '@playwright/test'

// Development React runs StrictMode effect setup/cleanup replay; preview does not.
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'lifecycle.spec.ts',
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/strict-mode', open: 'never' }],
    ['json', { outputFile: 'test-results/strict-mode/report.json' }]],
  outputDir: 'test-results/strict-mode',
  use: {
    baseURL: 'http://127.0.0.1:4174',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'en-US',
    timezoneId: 'UTC',
    channel: 'chromium',
    launchOptions: { args: ['--use-angle=swiftshader'] },
  },
  projects: [
    { name: 'strict-desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 } },
    { name: 'strict-mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4174 --strictPort',
    url: 'http://127.0.0.1:4174',
    reuseExistingServer: false,
  },
})
