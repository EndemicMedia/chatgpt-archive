/**
 * Viewer Page Object
 * 
 * Encapsulates all interactions with the ChatGPT Archive viewer page
 * Includes: PIN unlock, conversation list, search, categories, exports, etc.
 */
import { Page, Locator, expect } from '@playwright/test';

export class ViewerPage {
  readonly page: Page;
  readonly extensionId: string;
  
  // PIN Screen
  readonly pinInput: Locator;
  readonly unlockButton: Locator;
  readonly setupPinButton: Locator;
  readonly pinError: Locator;
  
  // Main Navigation
  readonly sidebar: Locator;
  readonly allConversationsLink: Locator;
  readonly pinnedLink: Locator;
  readonly categoriesLink: Locator;
  readonly settingsLink: Locator;
  
  // Search
  readonly searchInput: Locator;
  readonly searchResults: Locator;
  
  // Conversation List
  readonly conversationList: Locator;
  readonly conversationItems: Locator;
  readonly firstConversation: Locator;
  
  // Conversation Detail
  readonly conversationDetail: Locator;
  readonly messageList: Locator;
  readonly messageItems: Locator;
  readonly exportButton: Locator;
  readonly categorySelect: Locator;
  
  // Category Management
  readonly categoryList: Locator;
  readonly addCategoryButton: Locator;
  
  // Export Modal
  readonly exportModal: Locator;
  readonly exportJsonButton: Locator;
  readonly exportMarkdownButton: Locator;
  readonly exportHtmlButton: Locator;
  readonly exportPdfButton: Locator;
  
  // Settings
  readonly settingsPanel: Locator;
  readonly changePinButton: Locator;
  readonly themeSelector: Locator;
  readonly autoLockToggle: Locator;
  
  // Empty State
  readonly emptyState: Locator;
  readonly setupArchiveButton: Locator;

  constructor(page: Page, extensionId: string) {
    this.page = page;
    this.extensionId = extensionId;
    
    // PIN Screen
    this.pinInput = page.locator('[data-testid="pin-input"], input[type="password"]').first();
    this.unlockButton = page.locator('button:has-text("Unlock"), button:has-text("Enter")').first();
    this.setupPinButton = page.locator('button:has-text("Set PIN"), button:has-text("Setup")').first();
    this.pinError = page.locator('.error, [data-testid="pin-error"]').first();
    
    // Main Navigation
    this.sidebar = page.locator('.sidebar, [data-testid="sidebar"], aside').first();
    this.allConversationsLink = page.locator('text=All Conversations, text=Archive, .nav-item:has-text("All")').first();
    this.pinnedLink = page.locator('text=Pinned, .nav-item:has-text("Pinned")').first();
    this.categoriesLink = page.locator('text=Categories, .nav-item:has-text("Categories")').first();
    this.settingsLink = page.locator('text=Settings, [data-testid="settings"]').first();
    
    // Search
    this.searchInput = page.locator('input[placeholder*="search" i], [data-testid="search"]').first();
    this.searchResults = page.locator('[data-testid="search-results"], .search-results').first();
    
    // Conversation List
    this.conversationList = page.locator('[data-testid="conversation-list"], .conversation-list').first();
    this.conversationItems = page.locator('[data-testid="conversation-item"], .conversation-item');
    this.firstConversation = this.conversationItems.first();
    
    // Conversation Detail
    this.conversationDetail = page.locator('[data-testid="conversation-detail"], .conversation-detail').first();
    this.messageList = page.locator('[data-testid="message-list"], .message-list').first();
    this.messageItems = page.locator('[data-testid="message"], .message');
    this.exportButton = page.locator('button:has-text("Export"), [data-testid="export"]').first();
    this.categorySelect = page.locator('select, [data-testid="category-select"]').first();
    
    // Category Management
    this.categoryList = page.locator('[data-testid="category-list"], .category-list').first();
    this.addCategoryButton = page.locator('button:has-text("Add Category"), button:has-text("+ Category")').first();
    
    // Export Modal
    this.exportModal = page.locator('[data-testid="export-modal"], .export-modal, [role="dialog"]').first();
    this.exportJsonButton = page.locator('button:has-text("JSON"), [data-testid="export-json"]').first();
    this.exportMarkdownButton = page.locator('button:has-text("Markdown"), [data-testid="export-markdown"]').first();
    this.exportHtmlButton = page.locator('button:has-text("HTML"), [data-testid="export-html"]').first();
    this.exportPdfButton = page.locator('button:has-text("PDF"), [data-testid="export-pdf"]').first();
    
    // Settings
    this.settingsPanel = page.locator('[data-testid="settings-panel"], .settings-panel').first();
    this.changePinButton = page.locator('button:has-text("Change PIN"), button:has-text("Update PIN")').first();
    this.themeSelector = page.locator('select, [data-testid="theme-select"]').first();
    this.autoLockToggle = page.locator('[data-testid="auto-lock"], input[type="checkbox"]').first();
    
    // Empty State
    this.emptyState = page.locator('[data-testid="empty-state"], .empty-state').first();
    this.setupArchiveButton = page.locator('button:has-text("Setup Archive"), button:has-text("Get Started")').first();
  }

  // Navigation
  async goto() {
    await this.page.goto(`chrome-extension://${this.extensionId}/viewer.html`);
  }

  async gotoPage(pageName: 'all' | 'pinned' | 'categories' | 'settings') {
    switch (pageName) {
      case 'all':
        await this.allConversationsLink.click();
        break;
      case 'pinned':
        await this.pinnedLink.click();
        break;
      case 'categories':
        await this.categoriesLink.click();
        break;
      case 'settings':
        await this.settingsLink.click();
        break;
    }
    await this.page.waitForLoadState('networkidle');
  }

  // PIN Operations
  async setupPin(pin: string) {
    await expect(this.setupPinButton).toBeVisible();
    await this.setupPinButton.click();
    await this.pinInput.fill(pin);
    await this.unlockButton.click();
  }

  async unlockWithPin(pin: string) {
    await expect(this.pinInput).toBeVisible();
    await this.pinInput.fill(pin);
    await this.unlockButton.click();
    // Wait for unlock to complete
    await this.page.waitForSelector('[data-testid="conversation-list"], .conversation-list', { timeout: 5000 });
  }

  async expectPinError() {
    await expect(this.pinError).toBeVisible();
  }

  // Search Operations
  async search(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(300); // Debounce wait
  }

  async clearSearch() {
    await this.searchInput.clear();
  }

  async expectSearchResults(count: number) {
    if (count === 0) {
      await expect(this.page.locator('text=No results found, .no-results')).toBeVisible();
    } else {
      await expect(this.conversationItems).toHaveCount(count);
    }
  }

  // Conversation Operations
  async selectConversation(index: number = 0) {
    await this.conversationItems.nth(index).click();
    await expect(this.conversationDetail).toBeVisible();
  }

  async getConversationTitle(index: number = 0): Promise<string> {
    const title = this.conversationItems.nth(index).locator('.title, [data-testid="title"]').first();
    return await title.textContent() || '';
  }

  async pinConversation(index: number = 0) {
    const pinButton = this.conversationItems.nth(index).locator('button:has-text("Pin"), [data-testid="pin"]').first();
    await pinButton.click();
  }

  async unpinConversation(index: number = 0) {
    const unpinButton = this.conversationItems.nth(index).locator('button:has-text("Unpin"), [data-testid="unpin"]').first();
    await unpinButton.click();
  }

  async deleteConversation(index: number = 0) {
    const deleteButton = this.conversationItems.nth(index).locator('button:has-text("Delete"), [data-testid="delete"]').first();
    await deleteButton.click();
    // Confirm deletion if dialog appears
    const confirmButton = this.page.locator('button:has-text("Confirm"), button:has-text("Yes")').first();
    if (await confirmButton.isVisible().catch(() => false)) {
      await confirmButton.click();
    }
  }

  // Category Operations
  async assignCategory(conversationIndex: number, categoryName: string) {
    await this.selectConversation(conversationIndex);
    await this.categorySelect.selectOption({ label: categoryName });
  }

  async filterByCategory(categoryName: string) {
    const categoryChip = this.page.locator(`.category-chip:has-text("${categoryName}"), [data-category="${categoryName}"]`).first();
    await categoryChip.click();
  }

  async addNewCategory(name: string, color: string = 'blue') {
    await this.addCategoryButton.click();
    const nameInput = this.page.locator('input[placeholder*="name" i], [data-testid="category-name"]').first();
    await nameInput.fill(name);
    // Select color if available
    const colorOption = this.page.locator(`[data-color="${color}"], .color-${color}`).first();
    if (await colorOption.isVisible().catch(() => false)) {
      await colorOption.click();
    }
    const saveButton = this.page.locator('button:has-text("Save"), button:has-text("Add")').first();
    await saveButton.click();
  }

  // Export Operations
  async openExportModal() {
    await this.exportButton.click();
    await expect(this.exportModal).toBeVisible();
  }

  async exportAsJson() {
    await this.openExportModal();
    await this.exportJsonButton.click();
  }

  async exportAsMarkdown() {
    await this.openExportModal();
    await this.exportMarkdownButton.click();
  }

  async exportAsHtml() {
    await this.openExportModal();
    await this.exportHtmlButton.click();
  }

  // Message Visibility Operations
  async toggleMessageVisibility(messageIndex: number) {
    const message = this.messageItems.nth(messageIndex);
    const toggle = message.locator('button:has-text("Hide"), button:has-text("Show"), [data-testid="toggle-visibility"]').first();
    await toggle.click();
  }

  async expandAllMessages() {
    const expandButton = this.page.locator('button:has-text("Expand All"), [data-testid="expand-all"]').first();
    if (await expandButton.isVisible().catch(() => false)) {
      await expandButton.click();
    }
  }

  async collapseAllMessages() {
    const collapseButton = this.page.locator('button:has-text("Collapse All"), [data-testid="collapse-all"]').first();
    if (await collapseButton.isVisible().catch(() => false)) {
      await collapseButton.click();
    }
  }

  // Settings Operations
  async openSettings() {
    await this.gotoPage('settings');
    await expect(this.settingsPanel).toBeVisible();
  }

  async changePin(oldPin: string, newPin: string) {
    await this.openSettings();
    await this.changePinButton.click();
    
    const oldPinInput = this.page.locator('input[placeholder*="old" i], [data-testid="old-pin"]').first();
    const newPinInput = this.page.locator('input[placeholder*="new" i], [data-testid="new-pin"]').first();
    const confirmPinInput = this.page.locator('input[placeholder*="confirm" i], [data-testid="confirm-pin"]').first();
    
    await oldPinInput.fill(oldPin);
    await newPinInput.fill(newPin);
    await confirmPinInput.fill(newPin);
    
    const saveButton = this.page.locator('button:has-text("Save"), button:has-text("Update")').first();
    await saveButton.click();
  }

  async setTheme(theme: 'light' | 'dark' | 'sepia') {
    await this.openSettings();
    await this.themeSelector.selectOption(theme);
  }

  async toggleAutoLock() {
    await this.openSettings();
    await this.autoLockToggle.click();
  }

  // State Assertions
  async expectEmptyState() {
    await expect(this.emptyState).toBeVisible();
  }

  async expectConversationCount(count: number) {
    await expect(this.conversationItems).toHaveCount(count);
  }

  async expectMessageCount(count: number) {
    await expect(this.messageItems).toHaveCount(count);
  }

  async expectCategoryExists(name: string) {
    const category = this.page.locator(`.category:has-text("${name}"), [data-category="${name}"]`).first();
    await expect(category).toBeVisible();
  }

  // Utility
  async waitForLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  async screenshot(name: string) {
    await this.page.screenshot({ path: `./e2e/test-results/${name}.png`, fullPage: true });
  }
}
