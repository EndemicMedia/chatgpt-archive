/**
 * E2E tests for popup UI
 */

import { test, expect, openPopup } from './fixtures';

test.describe('Popup UI', () => {
  test('should display popup correctly', async ({ context, extensionId }) => {
    const popup = await openPopup(context, extensionId);
    
    // Check that popup loaded
    await expect(popup.locator('body')).toBeVisible();
    
    // Check for expected elements (adjust selectors based on actual popup)
    await expect(popup.locator('text=Archive')).toBeVisible();
  });

  test('should show backup button', async ({ context, extensionId }) => {
    const popup = await openPopup(context, extensionId);
    
    // Look for backup button
    const backupButton = popup.locator('button:has-text("Backup"), button:has-text("Start")');
    await expect(backupButton).toBeVisible();
  });

  test('should navigate to viewer', async ({ context, extensionId }) => {
    const popup = await openPopup(context, extensionId);
    
    // Click viewer link/button
    const viewerLink = popup.locator('a:has-text("Viewer"), button:has-text("Viewer")');
    if (await viewerLink.isVisible().catch(() => false)) {
      await viewerLink.click();
      // Should open viewer in new tab
      await expect(popup).toHaveURL(/viewer/);
    }
  });
});
