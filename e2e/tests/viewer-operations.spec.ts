/**
 * Viewer Operations E2E Tests
 * 
 * Comprehensive tests for all viewer functionality:
 * - PIN setup and unlock
 * - Conversation browsing and viewing
 * - Search functionality
 * - Category management
 * - Export operations
 * - Message visibility controls
 * - Settings
 */
import { test, expect } from '../fixtures/extension';
import { ViewerPage } from '../pages/viewer.page';
import { TEST_PIN, TEST_PIN_WRONG, NEW_PIN, mockConversations, mockCategories } from '../utils/test-data';
import { initializeArchive, saveConversations, saveCategories, clearArchive } from '../../src/utils/storage';

test.describe('Viewer - PIN Operations', () => {
  test.beforeEach(async ({ viewerPage: page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/viewer.html`);
  });

  test('should show PIN setup on first visit', async ({ viewerPage: page }) => {
    const viewer = new ViewerPage(page, '');
    await viewer.expectEmptyState();
    await expect(viewer.setupPinButton).toBeVisible();
  });

  test('should setup PIN successfully', async ({ viewerPage: page, extensionId }) => {
    const viewer = new ViewerPage(page, extensionId);
    await viewer.setupPin(TEST_PIN);
    // After setup, should show empty archive or conversation list
    await page.waitForTimeout(1000);
    // Verify we can unlock with the same PIN
    await page.reload();
    await viewer.unlockWithPin(TEST_PIN);
  });

  test('should reject incorrect PIN', async ({ viewerPage: page, extensionId }) => {
    const viewer = new ViewerPage(page, extensionId);
    await viewer.setupPin(TEST_PIN);
    await page.reload();
    await viewer.pinInput.fill(TEST_PIN_WRONG);
    await viewer.unlockButton.click();
    await viewer.expectPinError();
  });

  test('should lock after page reload', async ({ viewerPage: page, extensionId }) => {
    const viewer = new ViewerPage(page, extensionId);
    await viewer.setupPin(TEST_PIN);
    await page.reload();
    // Should show PIN screen again
    await expect(viewer.pinInput).toBeVisible();
  });
});

test.describe('Viewer - Conversation Browsing', () => {
  test.beforeEach(async ({ viewerPage: page, extensionId }) => {
    // Inject test data via page evaluation
    await page.goto(`chrome-extension://${extensionId}/viewer.html`);
    
    // Setup archive and add mock data
    await page.evaluate(async (data) => {
      const { initializeArchive, saveConversations } = await import('../../src/utils/storage.js');
      await initializeArchive(data.pin);
      await saveConversations(data.conversations);
    }, { pin: TEST_PIN, conversations: mockConversations });
    
    await page.reload();
    const viewer = new ViewerPage(page, extensionId);
    await viewer.unlockWithPin(TEST_PIN);
  });

  test('should display all conversations', async ({ viewerPage: page, extensionId }) => {
    const viewer = new ViewerPage(page, extensionId);
    await viewer.expectConversationCount(mockConversations.length);
  });

  test('should show conversation titles', async ({ viewerPage: page, extensionId }) => {
    const viewer = new ViewerPage(page, extensionId);
    const title = await viewer.getConversationTitle(0);
    expect(title).toBeTruthy();
  });

  test('should select and view conversation details', async ({ viewerPage: page, extensionId }) => {
    const viewer = new ViewerPage(page, extensionId);
    await viewer.selectConversation(0);
    await viewer.expectMessageCount(4); // conv-001 has 4 messages
  });

  test('should navigate between conversations', async ({ viewerPage: page, extensionId }) => {
    const viewer = new ViewerPage(page, extensionId);
    
    // Select first conversation
    await viewer.selectConversation(0);
    await viewer.expectMessageCount(4);
    
    // Go back and select second
    await viewer.gotoPage('all');
    await viewer.selectConversation(1);
    await viewer.expectMessageCount(4); // conv-002 also has 4 messages
  });
});

test.describe('Viewer - Search Functionality', () => {
  test.beforeEach(async ({ viewerPage: page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/viewer.html`);
    await page.evaluate(async (data) => {
      const { initializeArchive, saveConversations } = await import('../../src/utils/storage.js');
      await initializeArchive(data.pin);
      await saveConversations(data.conversations);
    }, { pin: TEST_PIN, conversations: mockConversations });
    
    await page.reload();
    const viewer = new ViewerPage(page, extensionId);
    await viewer.unlockWithPin(TEST_PIN);
  });

  test('should search by conversation title', async ({ viewerPage: page, extensionId }) => {
    const viewer = new ViewerPage(page, extensionId);
    await viewer.search('React');
    await viewer.expectSearchResults(1);
  });

  test('should search by message content', async ({ viewerPage: page, extensionId }) => {
    const viewer = new ViewerPage(page, extensionId);
    await viewer.search('pandas');
    await viewer.expectSearchResults(1);
  });

  test('should show no results for non-matching query', async ({ viewerPage: page, extensionId }) => {
    const viewer = new ViewerPage(page, extensionId);
    await viewer.search('xyznonexistent');
    await viewer.expectSearchResults(0);
  });

  test('should clear search results', async ({ viewerPage: page, extensionId }) => {
    const viewer = new ViewerPage(page, extensionId);
    await viewer.search('React');
    await viewer.clearSearch();
    // Should show all conversations again
    await viewer.expectConversationCount(mockConversations.length);
  });

  test('should search case-insensitively', async ({ viewerPage: page, extensionId }) => {
    const viewer = new ViewerPage(page, extensionId);
    await viewer.search('REACT');
    await viewer.expectSearchResults(1);
  });
});

test.describe('Viewer - Category Management', () => {
  test.beforeEach(async ({ viewerPage: page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/viewer.html`);
    await page.evaluate(async (data) => {
      const { initializeArchive, saveConversations, saveCategories } = await import('../../src/utils/storage.js');
      await initializeArchive(data.pin);
      await saveConversations(data.conversations);
      await saveCategories(data.categories);
    }, { pin: TEST_PIN, conversations: mockConversations, categories: mockCategories });
    
    await page.reload();
    const viewer = new ViewerPage(page, extensionId);
    await viewer.unlockWithPin(TEST_PIN);
  });

  test('should display categories', async ({ viewerPage: page, extensionId }) => {
    const viewer = new ViewerPage(page, extensionId);
    await viewer.gotoPage('categories');
    for (const category of mockCategories) {
      await viewer.expectCategoryExists(category.name);
    }
  });

  test('should assign category to conversation', async ({ viewerPage: page, extensionId }) => {
    const viewer = new ViewerPage(page, extensionId);
    await viewer.assignCategory(0, 'Work');
    // Verify category was assigned
    await expect(page.locator('text=Work').first()).toBeVisible();
  });

  test('should filter by category', async ({ viewerPage: page, extensionId }) => {
    const viewer = new ViewerPage(page, extensionId);
    await viewer.assignCategory(0, 'Work');
    await viewer.filterByCategory('Work');
    // Should show only conversations in Work category
    await viewer.expectConversationCount(1);
  });

  test('should add new category', async ({ viewerPage: page, extensionId }) => {
    const viewer = new ViewerPage(page, extensionId);
    await viewer.gotoPage('categories');
    await viewer.addNewCategory('Research', 'purple');
    await viewer.expectCategoryExists('Research');
  });
});

test.describe('Viewer - Export Operations', () => {
  test.beforeEach(async ({ viewerPage: page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/viewer.html`);
    await page.evaluate(async (data) => {
      const { initializeArchive, saveConversations } = await import('../../src/utils/storage.js');
      await initializeArchive(data.pin);
      await saveConversations(data.conversations);
    }, { pin: TEST_PIN, conversations: mockConversations });
    
    await page.reload();
    const viewer = new ViewerPage(page, extensionId);
    await viewer.unlockWithPin(TEST_PIN);
    await viewer.selectConversation(0);
  });

  test('should open export modal', async ({ viewerPage: page, extensionId }) => {
    const viewer = new ViewerPage(page, extensionId);
    await viewer.openExportModal();
    await expect(viewer.exportJsonButton).toBeVisible();
    await expect(viewer.exportMarkdownButton).toBeVisible();
    await expect(viewer.exportHtmlButton).toBeVisible();
  });

  test('should export conversation as JSON', async ({ viewerPage: page, extensionId, context }) => {
    const viewer = new ViewerPage(page, extensionId);
    
    // Wait for download
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      viewer.exportAsJson(),
    ]);
    
    expect(download.suggestedFilename()).toContain('.json');
    const path = await download.path();
    expect(path).toBeTruthy();
  });

  test('should export conversation as Markdown', async ({ viewerPage: page, extensionId }) => {
    const viewer = new ViewerPage(page, extensionId);
    
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      viewer.exportAsMarkdown(),
    ]);
    
    expect(download.suggestedFilename()).toContain('.md');
  });
});

test.describe('Viewer - Message Visibility', () => {
  test.beforeEach(async ({ viewerPage: page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/viewer.html`);
    await page.evaluate(async (data) => {
      const { initializeArchive, saveConversations } = await import('../../src/utils/storage.js');
      await initializeArchive(data.pin);
      await saveConversations(data.conversations);
    }, { pin: TEST_PIN, conversations: mockConversations });
    
    await page.reload();
    const viewer = new ViewerPage(page, extensionId);
    await viewer.unlockWithPin(TEST_PIN);
    await viewer.selectConversation(0);
  });

  test('should toggle message visibility', async ({ viewerPage: page, extensionId }) => {
    const viewer = new ViewerPage(page, extensionId);
    await viewer.toggleMessageVisibility(0);
    // Message should now be hidden/collapsed
    const message = viewer.messageItems.nth(0);
    await expect(message.locator('.hidden, .collapsed, [data-hidden="true"]')).toBeVisible();
  });

  test('should expand all messages', async ({ viewerPage: page, extensionId }) => {
    const viewer = new ViewerPage(page, extensionId);
    await viewer.expandAllMessages();
    // All messages should be visible
    await viewer.expectMessageCount(4);
  });

  test('should collapse all messages', async ({ viewerPage: page, extensionId }) => {
    const viewer = new ViewerPage(page, extensionId);
    await viewer.collapseAllMessages();
    // Messages should be collapsed
    const firstMessage = viewer.messageItems.nth(0);
    await expect(firstMessage.locator('.collapsed, .summary')).toBeVisible();
  });
});

test.describe('Viewer - Settings', () => {
  test.beforeEach(async ({ viewerPage: page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/viewer.html`);
    await page.evaluate(async (data) => {
      const { initializeArchive, saveConversations } = await import('../../src/utils/storage.js');
      await initializeArchive(data.pin);
      await saveConversations(data.conversations);
    }, { pin: TEST_PIN, conversations: mockConversations });
    
    await page.reload();
    const viewer = new ViewerPage(page, extensionId);
    await viewer.unlockWithPin(TEST_PIN);
  });

  test('should open settings page', async ({ viewerPage: page, extensionId }) => {
    const viewer = new ViewerPage(page, extensionId);
    await viewer.openSettings();
    await expect(viewer.changePinButton).toBeVisible();
  });

  test('should change PIN', async ({ viewerPage: page, extensionId }) => {
    const viewer = new ViewerPage(page, extensionId);
    await viewer.changePin(TEST_PIN, NEW_PIN);
    // Should show success message
    await expect(page.locator('text=PIN changed, text=success')).toBeVisible();
    
    // Verify new PIN works
    await page.reload();
    await viewer.unlockWithPin(NEW_PIN);
  });

  test('should change theme', async ({ viewerPage: page, extensionId }) => {
    const viewer = new ViewerPage(page, extensionId);
    await viewer.setTheme('dark');
    // Verify dark theme is applied
    await expect(page.locator('html.dark, body.dark, [data-theme="dark"]')).toBeVisible();
  });

  test('should toggle auto-lock', async ({ viewerPage: page, extensionId }) => {
    const viewer = new ViewerPage(page, extensionId);
    await viewer.toggleAutoLock();
    // Toggle should change state
    await expect(viewer.autoLockToggle).toBeChecked();
  });
});

test.describe('Viewer - Pinned Conversations', () => {
  test.beforeEach(async ({ viewerPage: page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/viewer.html`);
    await page.evaluate(async (data) => {
      const { initializeArchive, saveConversations } = await import('../../src/utils/storage.js');
      await initializeArchive(data.pin);
      await saveConversations(data.conversations);
    }, { pin: TEST_PIN, conversations: mockConversations });
    
    await page.reload();
    const viewer = new ViewerPage(page, extensionId);
    await viewer.unlockWithPin(TEST_PIN);
  });

  test('should pin a conversation', async ({ viewerPage: page, extensionId }) => {
    const viewer = new ViewerPage(page, extensionId);
    await viewer.pinConversation(0);
    
    // Navigate to pinned section
    await viewer.gotoPage('pinned');
    await viewer.expectConversationCount(1);
  });

  test('should unpin a conversation', async ({ viewerPage: page, extensionId }) => {
    const viewer = new ViewerPage(page, extensionId);
    await viewer.pinConversation(0);
    await viewer.gotoPage('pinned');
    await viewer.unpinConversation(0);
    await viewer.expectConversationCount(0);
  });

  test('should show pinned conversations in Pinned section', async ({ viewerPage: page, extensionId }) => {
    const viewer = new ViewerPage(page, extensionId);
    await viewer.pinConversation(0);
    await viewer.pinConversation(1);
    
    await viewer.gotoPage('pinned');
    await viewer.expectConversationCount(2);
  });
});

test.describe('Viewer - Keyboard Shortcuts', () => {
  test.beforeEach(async ({ viewerPage: page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/viewer.html`);
    await page.evaluate(async (data) => {
      const { initializeArchive, saveConversations } = await import('../../src/utils/storage.js');
      await initializeArchive(data.pin);
      await saveConversations(data.conversations);
    }, { pin: TEST_PIN, conversations: mockConversations });
    
    await page.reload();
    const viewer = new ViewerPage(page, extensionId);
    await viewer.unlockWithPin(TEST_PIN);
  });

  test('should focus search on Cmd/Ctrl+K', async ({ viewerPage: page, extensionId }) => {
    const viewer = new ViewerPage(page, extensionId);
    await page.keyboard.press('Control+k');
    await expect(viewer.searchInput).toBeFocused();
  });

  test('should navigate with arrow keys', async ({ viewerPage: page, extensionId }) => {
    const viewer = new ViewerPage(page, extensionId);
    await viewer.conversationList.press('ArrowDown');
    // First conversation should be focused
    await expect(viewer.conversationItems.nth(0)).toBeFocused();
  });

  test('should open selected conversation with Enter', async ({ viewerPage: page, extensionId }) => {
    const viewer = new ViewerPage(page, extensionId);
    await viewer.conversationItems.nth(0).focus();
    await page.keyboard.press('Enter');
    await expect(viewer.conversationDetail).toBeVisible();
  });
});
