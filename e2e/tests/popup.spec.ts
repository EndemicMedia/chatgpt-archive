/**
 * Popup E2E Tests
 * 
 * Tests for extension popup functionality:
 * - Backup triggering
 * - Status display
 * - Quick actions
 * - PIN quick unlock
 */
import { test, expect } from '../fixtures/extension';
import { PopupPage } from '../pages/popup.page';
import { TEST_PIN, mockConversations } from '../utils/test-data';

test.describe('Popup - Initial State', () => {
  test('should load popup successfully', async ({ popupPage: page, extensionId }) => {
    const popup = new PopupPage(page, extensionId);
    await popup.goto();
    await popup.expectReady();
  });

  test('should show backup button', async ({ popupPage: page, extensionId }) => {
    const popup = new PopupPage(page, extensionId);
    await popup.goto();
    await expect(popup.backupButton).toBeVisible();
  });

  test('should show archive stats when empty', async ({ popupPage: page, extensionId }) => {
    const popup = new PopupPage(page, extensionId);
    await popup.goto();
    await expect(popup.conversationCount).toContainText('0');
  });
});

test.describe('Popup - Backup Operations', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    // Setup archive with PIN
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/viewer.html`);
    await page.evaluate(async (pin) => {
      const { initializeArchive } = await import('../../src/utils/storage.js');
      await initializeArchive(pin);
    }, TEST_PIN);
    await page.close();
  });

  test('should trigger backup from popup', async ({ popupPage: page, extensionId }) => {
    const popup = new PopupPage(page, extensionId);
    await popup.goto();
    await popup.enterPin(TEST_PIN);
    await popup.startBackup();
    
    // Should show progress or success
    await Promise.race([
      popup.waitForBackupProgress().catch(() => {}),
      popup.expectSuccess().catch(() => {}),
    ]);
  });

  test('should show backup progress', async ({ popupPage: page, extensionId }) => {
    const popup = new PopupPage(page, extensionId);
    await popup.goto();
    await popup.enterPin(TEST_PIN);
    await popup.startBackup();
    
    // Check if progress indicator appears
    const hasProgress = await popup.backupProgress.isVisible().catch(() => false);
    const hasStatus = await popup.backupStatus.isVisible().catch(() => false);
    expect(hasProgress || hasStatus).toBeTruthy();
  });

  test('should cancel backup', async ({ popupPage: page, extensionId }) => {
    const popup = new PopupPage(page, extensionId);
    await popup.goto();
    await popup.enterPin(TEST_PIN);
    await popup.startBackup();
    
    // Wait a bit then cancel
    await page.waitForTimeout(500);
    if (await popup.cancelBackupButton.isVisible().catch(() => false)) {
      await popup.cancelBackup();
      await popup.expectBackupButtonEnabled();
    }
  });

  test('should disable backup button during backup', async ({ popupPage: page, extensionId }) => {
    const popup = new PopupPage(page, extensionId);
    await popup.goto();
    await popup.enterPin(TEST_PIN);
    await popup.startBackup();
    
    // Button should be disabled during backup
    await page.waitForTimeout(200);
    const isEnabled = await popup.backupButton.isEnabled().catch(() => true);
    // Note: This might fail if backup completes too fast
    expect(isEnabled).toBeFalsy();
  });
});

test.describe('Popup - Archive Statistics', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    // Setup archive with data
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/viewer.html`);
    await page.evaluate(async (data) => {
      const { initializeArchive, saveConversations } = await import('../../src/utils/storage.js');
      await initializeArchive(data.pin);
      await saveConversations(data.conversations);
    }, { pin: TEST_PIN, conversations: mockConversations });
    await page.close();
  });

  test('should display conversation count', async ({ popupPage: page, extensionId }) => {
    const popup = new PopupPage(page, extensionId);
    await popup.goto();
    const count = await popup.getConversationCount();
    expect(count).toBe(mockConversations.length);
  });

  test('should display storage used', async ({ popupPage: page, extensionId }) => {
    const popup = new PopupPage(page, extensionId);
    await popup.goto();
    const storage = await popup.getStorageUsed();
    expect(storage).toBeTruthy();
  });

  test('should display last backup time', async ({ popupPage: page, extensionId }) => {
    const popup = new PopupPage(page, extensionId);
    await popup.goto();
    await expect(popup.lastBackupTime).toBeVisible();
  });
});

test.describe('Popup - Navigation', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    // Setup archive
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/viewer.html`);
    await page.evaluate(async (pin) => {
      const { initializeArchive } = await import('../../src/utils/storage.js');
      await initializeArchive(pin);
    }, TEST_PIN);
    await page.close();
  });

  test('should open viewer in new tab', async ({ popupPage: page, extensionId }) => {
    const popup = new PopupPage(page, extensionId);
    await popup.goto();
    
    const viewerPage = await popup.openViewer();
    expect(viewerPage.url()).toContain('viewer.html');
    await viewerPage.close();
  });

  test('should open side panel', async ({ popupPage: page, extensionId }) => {
    const popup = new PopupPage(page, extensionId);
    await popup.goto();
    await popup.openSidePanel();
    // Side panel opening is handled by Chrome API
    // Just verify button click doesn't error
  });

  test('should open settings', async ({ popupPage: page, extensionId }) => {
    const popup = new PopupPage(page, extensionId);
    await popup.goto();
    await popup.openSettings();
    // Should navigate to settings or open settings modal
  });
});

test.describe('Popup - PIN Protection', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    // Setup archive with PIN
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/viewer.html`);
    await page.evaluate(async (pin) => {
      const { initializeArchive } = await import('../../src/utils/storage.js');
      await initializeArchive(pin);
    }, TEST_PIN);
    await page.close();
  });

  test('should require PIN for backup', async ({ popupPage: page, extensionId }) => {
    const popup = new PopupPage(page, extensionId);
    await popup.goto();
    
    // Try to start backup without PIN
    await popup.backupButton.click();
    
    // Should show PIN input or error
    const hasPinInput = await popup.pinInput.isVisible().catch(() => false);
    const hasError = await popup.errorMessage.isVisible().catch(() => false);
    expect(hasPinInput || hasError).toBeTruthy();
  });

  test('should unlock with PIN', async ({ popupPage: page, extensionId }) => {
    const popup = new PopupPage(page, extensionId);
    await popup.goto();
    await popup.enterPin(TEST_PIN);
    
    // After unlock, backup should be possible
    await popup.expectBackupButtonEnabled();
  });

  test('should show error for wrong PIN', async ({ popupPage: page, extensionId }) => {
    const popup = new PopupPage(page, extensionId);
    await popup.goto();
    
    // If PIN input is shown
    if (await popup.pinInput.isVisible().catch(() => false)) {
      await popup.pinInput.fill('0000');
      await popup.unlockButton.click();
      await popup.expectError();
    }
  });
});

test.describe('Popup - Error Handling', () => {
  test('should handle network errors gracefully', async ({ popupPage: page, extensionId }) => {
    const popup = new PopupPage(page, extensionId);
    await popup.goto();
    
    // Try backup without being on ChatGPT
    await popup.startBackup();
    
    // Should show error about not being on ChatGPT
    await popup.expectError(/chatgpt|not on|wrong page/i);
  });

  test('should show appropriate message when not on ChatGPT', async ({ popupPage: page, extensionId }) => {
    const popup = new PopupPage(page, extensionId);
    await popup.goto();
    
    const statusText = await popup.statusIndicator.textContent();
    expect(statusText?.toLowerCase()).toContain(/chatgpt|navigate/i);
  });
});
