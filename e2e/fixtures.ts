/**
 * Playwright fixtures for browser extension testing
 */

import { test as base, chromium, type BrowserContext } from '@playwright/test';
import path from 'path';

// Extension path - adjust based on build output
const EXTENSION_PATH = path.join(__dirname, '../.output/chrome-mv3');

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  // Launch browser with extension loaded
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      headless: false, // Extensions don't work in standard headless mode
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ],
    });
    await use(context);
    await context.close();
  },
  
  // Extract extension ID from service worker
  extensionId: async ({ context }, use) => {
    // For Manifest V3, get service worker
    let [serviceWorker] = context.serviceWorkers();
    if (!serviceWorker) {
      serviceWorker = await context.waitForEvent('serviceworker');
    }
    const extensionId = serviceWorker.url().split('/')[2];
    await use(extensionId);
  },
});

export const expect = test.expect;

/**
 * Helper to open popup
 */
export async function openPopup(context: BrowserContext, extensionId: string) {
  const popupPage = await context.newPage();
  await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);
  return popupPage;
}

/**
 * Helper to open viewer
 */
export async function openViewer(context: BrowserContext, extensionId: string) {
  const viewerPage = await context.newPage();
  await viewerPage.goto(`chrome-extension://${extensionId}/viewer.html`);
  return viewerPage;
}

/**
 * Helper to mock ChatGPT page
 */
export async function mockChatGPTPage(context: BrowserContext) {
  const page = await context.newPage();
  await page.goto('https://chatgpt.com');
  return page;
}
