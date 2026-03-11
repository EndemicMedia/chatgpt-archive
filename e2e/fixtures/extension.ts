/**
 * Playwright fixture for Chrome Extension testing
 * 
 * This fixture loads the unpacked extension and provides:
 * - context: BrowserContext with extension loaded
 * - extensionId: Dynamic extension ID for navigating to extension pages
 */
import { test as base, chromium, type BrowserContext, type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// Find the extension build directory
function findExtensionPath(): string {
  const possiblePaths = [
    path.join(__dirname, '../../.output/chrome-mv3'),
    path.join(__dirname, '../../.output/chrome-mv3-dev'),
    path.join(__dirname, '../../.output/chrome-mv3-prod'),
    path.join(__dirname, '../../dist'),
  ];
  
  for (const p of possiblePaths) {
    if (fs.existsSync(path.join(p, 'manifest.json'))) {
      console.log(`Found extension at: ${p}`);
      return p;
    }
  }
  
  throw new Error(
    'Extension build not found. Please run "npm run build" or "npm run dev" first.\n' +
    'Searched paths:\n' + possiblePaths.join('\n')
  );
}

export type ExtensionFixtures = {
  context: BrowserContext;
  extensionId: string;
  popupPage: Page;
  viewerPage: Page;
};

export const test = base.extend<ExtensionFixtures>({
  // Create persistent context with extension loaded
  context: async ({}, use) => {
    const pathToExtension = findExtensionPath();
    
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      headless: false, // Extensions require headed mode
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
        '--no-first-run',
        '--no-default-browser-check',
      ],
      viewport: { width: 1280, height: 800 },
    });
    
    await use(context);
    await context.close();
  },
  
  // Get extension ID from service worker
  extensionId: async ({ context }, use) => {
    // For Manifest V3, get service worker
    let [serviceWorker] = context.serviceWorkers();
    if (!serviceWorker) {
      serviceWorker = await context.waitForEvent('serviceworker', { timeout: 10000 });
    }
    
    const extensionId = serviceWorker.url().split('/')[2];
    console.log(`Extension ID: ${extensionId}`);
    
    await use(extensionId);
  },
  
  // Create popup page
  popupPage: async ({ context, extensionId }, use) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await use(page);
  },
  
  // Create viewer page (side panel)
  viewerPage: async ({ context, extensionId }, use) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/viewer.html`);
    await use(page);
  },
});

export const expect = test.expect;

/**
 * Helper to wait for service worker to be ready
 */
export async function waitForServiceWorker(context: BrowserContext): Promise<void> {
  const [serviceWorker] = await Promise.all([
    context.waitForEvent('serviceworker', { timeout: 10000 }),
    new Promise(resolve => setTimeout(resolve, 500)), // Small delay for SW registration
  ]);
  
  if (!serviceWorker) {
    throw new Error('Service worker failed to start');
  }
}

/**
 * Helper to clear extension storage
 */
export async function clearExtensionStorage(context: BrowserContext): Promise<void> {
  // Open a page and execute script to clear storage
  const page = await context.newPage();
  await page.goto('about:blank');
  await page.evaluate(async () => {
    // @ts-ignore
    if (typeof chrome !== 'undefined' && chrome.storage) {
      // @ts-ignore
      await chrome.storage.local.clear();
    }
  });
  await page.close();
}
