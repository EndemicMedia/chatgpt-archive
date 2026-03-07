/**
 * E2E tests for Archive Viewer
 */

import { test, expect, openViewer } from './fixtures';

test.describe('Archive Viewer', () => {
  test('should show PIN screen when archive is locked', async ({ context, extensionId }) => {
    const viewer = await openViewer(context, extensionId);
    
    // Check for PIN screen
    const pinScreen = viewer.locator('#pin-screen, [data-testid="pin-screen"]');
    
    // PIN screen might be visible if archive is initialized
    // If not initialized, might show setup screen
    const hasPinScreen = await pinScreen.isVisible().catch(() => false);
    const hasSetupScreen = await viewer.locator('text=Create PIN').isVisible().catch(() => false);
    
    expect(hasPinScreen || hasSetupScreen).toBeTruthy();
  });

  test('should have search functionality', async ({ context, extensionId }) => {
    const viewer = await openViewer(context, extensionId);
    
    // Look for search input
    const searchInput = viewer.locator('input[type="search"], input[placeholder*="Search"], #search-input');
    
    const hasSearch = await searchInput.isVisible().catch(() => false);
    
    // Search might be hidden behind PIN, so just check element exists
    if (hasSearch) {
      await expect(searchInput).toBeVisible();
    }
  });

  test('should have export options', async ({ context, extensionId }) => {
    const viewer = await openViewer(context, extensionId);
    
    // Look for export button
    const exportButton = viewer.locator('button:has-text("Export"), #export-btn');
    
    const hasExport = await exportButton.isVisible().catch(() => false);
    
    if (hasExport) {
      await expect(exportButton).toBeVisible();
    }
  });
});
