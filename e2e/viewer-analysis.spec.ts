/**
 * E2E Tests for ChatGPT Archive Viewer with Analysis Features
 */

import { test, expect, openViewer } from './fixtures';
import { Conversation } from '../src/utils/types';

// Mock conversation data for testing
const mockConversations: Conversation[] = [
  {
    id: 'test-conv-1',
    title: 'Python Programming Tutorial',
    create_time: new Date('2024-01-15T10:00:00').getTime(),
    update_time: new Date('2024-01-15T10:30:00').getTime(),
    model: 'gpt-4',
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        content: 'How do I write a Python function to calculate factorial?',
        content_type: 'text',
        create_time: new Date('2024-01-15T10:00:00').getTime()
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: 'Here is a factorial function:\n\n```python\ndef factorial(n):\n    if n <= 1:\n        return 1\n    return n * factorial(n - 1)\n```\n\nYou can use it like: `factorial(5)`',
        content_type: 'text',
        model: 'gpt-4',
        create_time: new Date('2024-01-15T10:05:00').getTime()
      }
    ]
  },
  {
    id: 'test-conv-2',
    title: 'JavaScript Async Patterns',
    create_time: new Date('2024-02-20T14:00:00').getTime(),
    update_time: new Date('2024-02-20T14:15:00').getTime(),
    model: 'gpt-3.5',
    messages: [
      {
        id: 'msg-3',
        role: 'user',
        content: 'Explain async/await with examples',
        content_type: 'text',
        create_time: new Date('2024-02-20T14:00:00').getTime()
      },
      {
        id: 'msg-4',
        role: 'assistant',
        content: 'Async/await simplifies asynchronous code. See https://developer.mozilla.org/',
        content_type: 'text',
        model: 'gpt-3.5',
        create_time: new Date('2024-02-20T14:10:00').getTime()
      }
    ]
  }
];

test.describe('Viewer Analysis Features', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    // Pre-populate storage with test data
    const viewerPage = await openViewer(context, extensionId);
    
    // Inject test data into storage
    await viewerPage.evaluate((data) => {
      localStorage.setItem('lastBackupData', JSON.stringify(data));
    }, mockConversations);
    
    await viewerPage.close();
  });

  test('should unlock with PIN and display conversations', async ({ context, extensionId }) => {
    const viewer = await openViewer(context, extensionId);
    
    // Enter PIN
    await viewer.click('[data-key="1"]');
    await viewer.click('[data-key="2"]');
    await viewer.click('[data-key="3"]');
    await viewer.click('[data-key="4"]');
    await viewer.click('[data-key="enter"]');
    
    // Verify unlocked state
    await expect(viewer.locator('#pin-screen')).toHaveClass(/hidden/);
    await expect(viewer.locator('#app')).not.toHaveClass(/hidden/);
    
    // Verify conversations loaded
    await expect(viewer.locator('.conversation-item')).toHaveCount(2);
    await expect(viewer.locator('.conversation-item').first()).toContainText('Python Programming Tutorial');
  });

  test('should search conversations', async ({ context, extensionId }) => {
    const viewer = await openViewer(context, extensionId);
    
    // Unlock
    await viewer.fill('#pin-input', '1234');
    await viewer.click('[data-key="enter"]');
    
    // Search
    await viewer.fill('#search-input', 'Python');
    await viewer.waitForTimeout(300); // Debounce
    
    // Verify filtered results
    const items = viewer.locator('.conversation-item');
    await expect(items).toHaveCount(1);
    await expect(items.first()).toContainText('Python Programming Tutorial');
  });

  test('should view conversation details', async ({ context, extensionId }) => {
    const viewer = await openViewer(context, extensionId);
    
    // Unlock
    await viewer.fill('#pin-input', '1234');
    await viewer.click('[data-key="enter"]');
    
    // Click first conversation
    await viewer.click('.conversation-item:first-child');
    
    // Verify detail view opened
    await expect(viewer.locator('#detail-view')).not.toHaveClass(/hidden/);
    await expect(viewer.locator('#detail-view')).toContainText('Python Programming Tutorial');
    await expect(viewer.locator('#detail-view')).toContainText('How do I write a Python function');
  });

  test('should switch between detail tabs', async ({ context, extensionId }) => {
    const viewer = await openViewer(context, extensionId);
    
    // Unlock and open conversation
    await viewer.fill('#pin-input', '1234');
    await viewer.click('[data-key="enter"]');
    await viewer.click('.conversation-item:first-child');
    
    // Switch to Code tab
    await viewer.click('[data-tab="code"]');
    await expect(viewer.locator('#tab-code')).toHaveClass(/active/);
    await expect(viewer.locator('#tab-code')).toContainText('def factorial');
    
    // Switch to URLs tab
    await viewer.click('[data-tab="urls"]');
    await expect(viewer.locator('#tab-urls')).toHaveClass(/active/);
  });

  test('should open analytics dashboard', async ({ context, extensionId }) => {
    const viewer = await openViewer(context, extensionId);
    
    // Unlock
    await viewer.fill('#pin-input', '1234');
    await viewer.click('[data-key="enter"]');
    
    // Open analytics
    await viewer.click('#btn-global-analysis');
    
    // Verify analysis view
    await expect(viewer.locator('#analysis-view')).not.toHaveClass(/hidden/);
    await expect(viewer.locator('.analysis-header')).toContainText('Archive Analytics');
    
    // Verify stats displayed
    await expect(viewer.locator('.stat-value').first()).toContainText('2');
  });

  test('should display monthly heatmap', async ({ context, extensionId }) => {
    const viewer = await openViewer(context, extensionId);
    
    // Unlock and open analytics
    await viewer.fill('#pin-input', '1234');
    await viewer.click('[data-key="enter"]');
    await viewer.click('#btn-global-analysis');
    
    // Switch to heatmap tab
    await viewer.click('[data-tab="heatmap"]');
    
    // Verify heatmap displayed
    await expect(viewer.locator('.heatmap')).toBeVisible();
    await expect(viewer.locator('.heatmap-row')).toHaveCount.greaterThan(0);
  });

  test('should display top topics', async ({ context, extensionId }) => {
    const viewer = await openViewer(context, extensionId);
    
    // Unlock and open analytics
    await viewer.fill('#pin-input', '1234');
    await viewer.click('[data-key="enter"]');
    await viewer.click('#btn-global-analysis');
    
    // Switch to topics tab
    await viewer.click('[data-tab="topics"]');
    
    // Verify topics displayed
    await expect(viewer.locator('.topics-list')).toBeVisible();
    await expect(viewer.locator('.topic-item').first()).toBeVisible();
  });

  test('should run PII scan', async ({ context, extensionId }) => {
    const viewer = await openViewer(context, extensionId);
    
    // Unlock and open analytics
    await viewer.fill('#pin-input', '1234');
    await viewer.click('[data-key="enter"]');
    await viewer.click('#btn-global-analysis');
    
    // Switch to PII tab
    await viewer.click('[data-tab="pii"]');
    
    // Run scan
    await viewer.click('#btn-run-pii-scan');
    
    // Verify results (should be safe for mock data)
    await expect(viewer.locator('#pii-results')).toContainText('No PII detected');
  });

  test('should export CSV', async ({ context, extensionId }) => {
    const viewer = await openViewer(context, extensionId);
    
    // Unlock
    await viewer.fill('#pin-input', '1234');
    await viewer.click('[data-key="enter"]');
    
    // Click export (will trigger download)
    const [download] = await Promise.all([
      viewer.waitForEvent('download'),
      viewer.click('#btn-export-csv')
    ]);
    
    // Verify download started
    expect(download.suggestedFilename()).toContain('.csv');
  });

  test('should export conversation to HTML', async ({ context, extensionId }) => {
    const viewer = await openViewer(context, extensionId);
    
    // Unlock and open conversation
    await viewer.fill('#pin-input', '1234');
    await viewer.click('[data-key="enter"]');
    await viewer.click('.conversation-item:first-child');
    
    // Click export HTML
    const [download] = await Promise.all([
      viewer.waitForEvent('download'),
      viewer.click('#btn-export-html')
    ]);
    
    // Verify download
    expect(download.suggestedFilename()).toContain('.html');
  });

  test('should lock on button click', async ({ context, extensionId }) => {
    const viewer = await openViewer(context, extensionId);
    
    // Unlock
    await viewer.fill('#pin-input', '1234');
    await viewer.click('[data-key="enter"]');
    
    // Lock
    await viewer.click('#lock-btn');
    
    // Verify locked state
    await expect(viewer.locator('#pin-screen')).not.toHaveClass(/hidden/);
    await expect(viewer.locator('#app')).toHaveClass(/hidden/);
  });
});

test.describe('Viewer Advanced Search', () => {
  test('should search with regex pattern', async ({ context, extensionId }) => {
    const viewer = await openViewer(context, extensionId);
    
    // Unlock
    await viewer.fill('#pin-input', '1234');
    await viewer.click('[data-key="enter"]');
    
    // Open advanced search
    await viewer.click('#btn-advanced-search');
    
    // Enter regex pattern
    await viewer.fill('#regex-input', 'def\\s+\\w+');
    await viewer.click('#btn-regex-search');
    
    // Verify results
    await expect(viewer.locator('.search-results')).toContainText('Python Programming Tutorial');
  });

  test('should filter by date range', async ({ context, extensionId }) => {
    const viewer = await openViewer(context, extensionId);
    
    // Unlock
    await viewer.fill('#pin-input', '1234');
    await viewer.click('[data-key="enter"]');
    
    // Set date range
    await viewer.fill('#date-start', '2024-01-01');
    await viewer.fill('#date-end', '2024-01-31');
    await viewer.click('#btn-date-filter');
    
    // Verify filtered results
    const items = viewer.locator('.conversation-item');
    await expect(items).toHaveCount(1);
    await expect(items.first()).toContainText('Python');
  });
});
