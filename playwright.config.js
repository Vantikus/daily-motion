import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  snapshotPathTemplate: '{testDir}/visual-baselines/{projectName}/{arg}{ext}',
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    video: 'retain-on-failure'
  },
  webServer: {
    command: 'node scripts/test-server.mjs',
    url: 'http://127.0.0.1:4173/index.html',
    reuseExistingServer: !process.env.CI,
    timeout: 15_000
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 }
      }
    },
    {
      name: 'webkit',
      use: {
        ...devices['iPhone 13'],
        browserName: 'webkit'
      }
    }
  ]
});
