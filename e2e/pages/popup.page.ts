/**
 * Popup Page Object
 * 
 * Encapsulates all interactions with the extension popup
 */
import { Page, Locator, expect } from '@playwright/test';

export class PopupPage {
  readonly page: Page;
  readonly extensionId: string;
  
  // Main Elements
  readonly container: Locator;
  readonly header: Locator;
  readonly statusIndicator: Locator;
  
  // Backup Section
  readonly backupButton: Locator;
  readonly backupProgress: Locator;
  readonly backupStatus: Locator;
  readonly cancelBackupButton: Locator;
  
  // Archive Status
  readonly conversationCount: Locator;
  readonly lastBackupTime: Locator;
  readonly storageUsed: Locator;
  
  // Quick Actions
  readonly openViewerButton: Locator;
  readonly openSidePanelButton: Locator;
  readonly settingsButton: Locator;
  
  // PIN Section (in popup)
  readonly pinInput: Locator;
  readonly unlockButton: Locator;
  readonly quickUnlockButton: Locator;
  
  // Notifications
  readonly notification: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;

  constructor(page: Page, extensionId: string) {
    this.page = page;
    this.extensionId = extensionId;
    
    this.container = page.locator('.popup, [data-testid="popup"]').first();
    this.header = page.locator('h1, h2, .header').first();
    this.statusIndicator = page.locator('.status, [data-testid="status"]').first();
    
    this.backupButton = page.locator('button:has-text("Backup"), button:has-text("Start Backup"), [data-testid="backup"]').first();
    this.backupProgress = page.locator('.progress, [data-testid="progress"], progress').first();
    this.backupStatus = page.locator('.backup-status, [data-testid="backup-status"]').first();
    this.cancelBackupButton = page.locator('button:has-text("Cancel"), [data-testid="cancel"]').first();
    
    this.conversationCount = page.locator('[data-testid="count"], .count').first();
    this.lastBackupTime = page.locator('[data-testid="last-backup"], .last-backup').first();
    this.storageUsed = page.locator('[data-testid="storage"], .storage').first();
    
    this.openViewerButton = page.locator('button:has-text("Open Archive"), button:has-text("View"), [data-testid="open-viewer"]').first();
    this.openSidePanelButton = page.locator('button:has-text("Side Panel"), [data-testid="side-panel"]').first();
    this.settingsButton = page.locator('button:has-text("Settings"), [data-testid="settings"]').first();
    
    this.pinInput = page.locator('input[type="password"], [data-testid="pin-input"]').first();
    this.unlockButton = page.locator('button:has-text("Unlock"), button:has-text("Enter")').first();
    this.quickUnlockButton = page.locator('button:has-text("Quick Unlock"), [data-testid="quick-unlock"]').first();
    
    this.notification = page.locator('.notification, [role="alert"]').first();
    this.errorMessage = page.locator('.error, [data-testid="error"]').first();
    this.successMessage = page.locator('.success, [data-testid="success"]').first();
  }

  async goto() {
    await this.page.goto(`chrome-extension://${this.extensionId}/popup.html`);
    // Wait for popup to fully load
    await this.page.waitForLoadState('domcontentloaded');
  }

  // Backup Operations
  async startBackup() {
    await this.backupButton.click();
  }

  async cancelBackup() {
    await this.cancelBackupButton.click();
  }

  async waitForBackupComplete(timeout: number = 60000) {
    await expect(this.successMessage).toBeVisible({ timeout });
    await expect(this.backupButton).toBeEnabled();
  }

  async waitForBackupProgress() {
    await expect(this.backupProgress).toBeVisible();
  }

  async expectBackupInProgress() {
    await expect(this.backupProgress).toBeVisible();
    await expect(this.cancelBackupButton).toBeVisible();
  }

  // Navigation
  async openViewer(): Promise<Page> {
    const [newPage] = await Promise.all([
      this.page.context().waitForEvent('page'),
      this.openViewerButton.click(),
    ]);
    await newPage.waitForLoadState('domcontentloaded');
    return newPage;
  }

  async openSidePanel() {
    await this.openSidePanelButton.click();
  }

  async openSettings() {
    await this.settingsButton.click();
  }

  // PIN Operations
  async enterPin(pin: string) {
    if (await this.pinInput.isVisible().catch(() => false)) {
      await this.pinInput.fill(pin);
      await this.unlockButton.click();
    }
  }

  // Status Checks
  async getConversationCount(): Promise<number> {
    const text = await this.conversationCount.textContent();
    const match = text?.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  async getStorageUsed(): Promise<string> {
    return await this.storageUsed.textContent() || '';
  }

  // State Assertions
  async expectReady() {
    await expect(this.container).toBeVisible();
    await expect(this.backupButton).toBeVisible();
  }

  async expectBackupButtonEnabled() {
    await expect(this.backupButton).toBeEnabled();
  }

  async expectBackupButtonDisabled() {
    await expect(this.backupButton).toBeDisabled();
  }

  async expectError(message?: string) {
    if (message) {
      await expect(this.errorMessage).toContainText(message);
    } else {
      await expect(this.errorMessage).toBeVisible();
    }
  }

  async expectSuccess(message?: string) {
    if (message) {
      await expect(this.successMessage).toContainText(message);
    } else {
      await expect(this.successMessage).toBeVisible();
    }
  }

  // Notifications
  async dismissNotification() {
    const dismissButton = this.notification.locator('button:has-text("Dismiss"), .close').first();
    if (await dismissButton.isVisible().catch(() => false)) {
      await dismissButton.click();
    }
  }
}
