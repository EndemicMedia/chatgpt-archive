import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for E2E testing of ChatGPT Archive extension
 * 
 * Note: Extensions require headed mode (not headless)
 * Use xvfb-run on Linux CI environments
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Firefox extensions work differently, skip for now
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
  ],
});
