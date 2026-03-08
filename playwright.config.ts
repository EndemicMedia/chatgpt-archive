import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Playwright configuration for ChatGPT Archive E2E testing
 * 
 * This config sets up Chrome extension testing with:
 * - Persistent context for extension loading
 * - Headed mode (required for extensions)
 * - Screenshot and video capture on failure
 * - Tracing for debugging
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Extensions can't run in parallel easily
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for extension tests
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],
  use: {
    actionTimeout: 10000,
    navigationTimeout: 30000,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium-extension',
      use: {
        ...devices['Desktop Chrome'],
        // Extension will be loaded via fixture
      },
    },
  ],
  outputDir: './e2e/test-results/',
  preserveOutput: 'failures-only',
});
