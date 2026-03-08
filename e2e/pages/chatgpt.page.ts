/**
 * ChatGPT Page Object
 * 
 * For testing content script injection and backup functionality on chatgpt.com
 */
import { Page, Locator, expect } from '@playwright/test';

export class ChatGPTPage {
  readonly page: Page;
  
  // Main Elements
  readonly sidebar: Locator;
  readonly conversationList: Locator;
  readonly chatContainer: Locator;
  readonly messageInput: Locator;
  readonly sendButton: Locator;
  
  // Extension Injected Elements
  readonly backupButton: Locator;
  readonly extensionIndicator: Locator;
  readonly floatingActionButton: Locator;

  constructor(page: Page) {
    this.page = page;
    
    this.sidebar = page.locator('nav[aria-label="Chat history"], [data-testid="sidebar"]').first();
    this.conversationList = page.locator('[data-testid="conversation-list"], .conversation-list').first();
    this.chatContainer = page.locator('[data-testid="chat-container"], main').first();
    this.messageInput = page.locator('textarea[placeholder*="message" i], #prompt-textarea').first();
    this.sendButton = page.locator('button[data-testid="send-button"], button:has-text("Send")').first();
    
    // Extension elements injected into ChatGPT
    this.backupButton = page.locator('[data-testid="chatgpt-archive-backup"], .chatgpt-archive-backup').first();
    this.extensionIndicator = page.locator('[data-testid="chatgpt-archive-indicator"]').first();
    this.floatingActionButton = page.locator('[data-testid="chatgpt-archive-fab"]').first();
  }

  async goto() {
    await this.page.goto('https://chatgpt.com');
    // Wait for page to load
    await this.page.waitForLoadState('networkidle');
  }

  async waitForLogin() {
    // Wait for either the chat input or a login prompt
    try {
      await this.page.waitForSelector('textarea, [data-testid="login-button"]', { timeout: 10000 });
    } catch {
      console.log('Could not determine login state');
    }
  }

  async isLoggedIn(): Promise<boolean> {
    return await this.messageInput.isVisible().catch(() => false);
  }

  // Chat Operations (for testing with real conversations)
  async sendMessage(message: string) {
    await this.messageInput.fill(message);
    await this.sendButton.click();
    // Wait for response to start appearing
    await this.page.waitForTimeout(2000);
  }

  async getConversationTitles(): Promise<string[]> {
    const titles = await this.page.locator('[data-testid="conversation-title"], .conversation-title').allTextContents();
    return titles;
  }

  async selectConversation(title: string) {
    const conversation = this.page.locator(`text=${title}`).first();
    await conversation.click();
  }

  // Extension Integration
  async waitForExtensionInjection() {
    // Wait for extension elements to appear
    await this.page.waitForSelector('[data-testid="chatgpt-archive-backup"], .chatgpt-archive-backup', { 
      timeout: 10000,
      state: 'attached'
    });
  }

  async triggerBackupFromPage() {
    if (await this.backupButton.isVisible().catch(() => false)) {
      await this.backupButton.click();
    } else if (await this.floatingActionButton.isVisible().catch(() => false)) {
      await this.floatingActionButton.click();
    } else {
      throw new Error('Extension backup button not found on page');
    }
  }

  async expectBackupButtonVisible() {
    await expect(this.backupButton.or(this.floatingActionButton)).toBeVisible();
  }

  // Utility
  async getCurrentConversationId(): Promise<string | null> {
    const url = this.page.url();
    const match = url.match(/c\/([a-f0-9-]+)/i);
    return match ? match[1] : null;
  }

  async screenshot(name: string) {
    await this.page.screenshot({ path: `./e2e/test-results/${name}.png`, fullPage: true });
  }
}
