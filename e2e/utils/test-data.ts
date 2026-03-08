/**
 * Test Data Utilities
 * 
 * Provides mock conversation data for testing
 */
import type { Conversation, Category } from '../../src/utils/types';

export const TEST_PIN = '1234';
export const TEST_PIN_WRONG = '0000';
export const NEW_PIN = '5678';

export const mockCategories: Category[] = [
  { id: 'cat-work', name: 'Work', color: '#4285f4', icon: 'briefcase' },
  { id: 'cat-personal', name: 'Personal', color: '#ea4335', icon: 'user' },
  { id: 'cat-code', name: 'Code', color: '#24c1e0', icon: 'code' },
];

export const mockConversations: Conversation[] = [
  {
    id: 'conv-001',
    title: 'React Hooks Best Practices',
    create_time: Date.now() - 86400000 * 2, // 2 days ago
    update_time: Date.now() - 86400000 * 2,
    mapping: {
      'msg-001': {
        id: 'msg-001',
        message: {
          id: 'msg-001',
          author: { role: 'user' },
          content: { parts: ['What are React hooks best practices?'] },
          create_time: Date.now() - 86400000 * 2,
        },
        children: ['msg-002'],
      },
      'msg-002': {
        id: 'msg-002',
        message: {
          id: 'msg-002',
          author: { role: 'assistant' },
          content: { 
            parts: ['Here are React hooks best practices:\n\n1. Use hooks at the top level\n2. Only call hooks from React functions\n3. Use the ESLint plugin\n4. Keep hooks focused on single concerns'] 
          },
          create_time: Date.now() - 86400000 * 2 + 1000,
        },
        children: ['msg-003'],
      },
      'msg-003': {
        id: 'msg-003',
        message: {
          id: 'msg-003',
          author: { role: 'user' },
          content: { parts: ['Thanks! What about useEffect?'] },
          create_time: Date.now() - 86400000 * 2 + 5000,
        },
        children: ['msg-004'],
      },
      'msg-004': {
        id: 'msg-004',
        message: {
          id: 'msg-004',
          author: { role: 'assistant' },
          content: { 
            parts: ['useEffect tips:\n\n- Always include dependencies\n- Use cleanup functions\n- Consider useLayoutEffect for DOM mutations'] 
          },
          create_time: Date.now() - 86400000 * 2 + 6000,
        },
        children: [],
      },
    },
    moderation_results: [],
    current_node: 'msg-004',
    plugin_ids: null,
    conversation_template_id: null,
    gizmo_id: null,
    is_archived: false,
  },
  {
    id: 'conv-002',
    title: 'Python Data Processing',
    create_time: Date.now() - 86400000, // 1 day ago
    update_time: Date.now() - 86400000,
    mapping: {
      'msg-101': {
        id: 'msg-101',
        message: {
          id: 'msg-101',
          author: { role: 'user' },
          content: { parts: ['How do I process CSV files in Python?'] },
          create_time: Date.now() - 86400000,
        },
        children: ['msg-102'],
      },
      'msg-102': {
        id: 'msg-102',
        message: {
          id: 'msg-102',
          author: { role: 'assistant' },
          content: { 
            parts: ['Use pandas for CSV processing:\n\n```python\nimport pandas as pd\n\ndf = pd.read_csv("data.csv")\nprint(df.head())\n```'] 
          },
          create_time: Date.now() - 86400000 + 1000,
        },
        children: ['msg-103'],
      },
      'msg-103': {
        id: 'msg-103',
        message: {
          id: 'msg-103',
          author: { role: 'user' },
          content: { parts: ['What about large files?'] },
          create_time: Date.now() - 86400000 + 5000,
        },
        children: ['msg-104'],
      },
      'msg-104': {
        id: 'msg-104',
        message: {
          id: 'msg-104',
          author: { role: 'assistant' },
          content: { 
            parts: ['For large files, use chunking:\n\n```python\nchunks = pd.read_csv("large.csv", chunksize=10000)\nfor chunk in chunks:\n    process(chunk)\n```'] 
          },
          create_time: Date.now() - 86400000 + 6000,
        },
        children: [],
      },
    },
    moderation_results: [],
    current_node: 'msg-104',
    plugin_ids: null,
    conversation_template_id: null,
    gizmo_id: null,
    is_archived: false,
  },
  {
    id: 'conv-003',
    title: 'Travel Planning - Japan',
    create_time: Date.now() - 172800000, // 2 days ago
    update_time: Date.now() - 172800000,
    mapping: {
      'msg-201': {
        id: 'msg-201',
        message: {
          id: 'msg-201',
          author: { role: 'user' },
          content: { parts: ['Help me plan a trip to Japan'] },
          create_time: Date.now() - 172800000,
        },
        children: ['msg-202'],
      },
      'msg-202': {
        id: 'msg-202',
        message: {
          id: 'msg-202',
          author: { role: 'assistant' },
          content: { 
            parts: ['Japan travel tips:\n\n- Get a JR Pass for intercity travel\n- Learn basic Japanese phrases\n- Carry cash - many places don\'t accept cards\n- Visit during cherry blossom season (March-April)'] 
          },
          create_time: Date.now() - 172800000 + 1000,
        },
        children: [],
      },
    },
    moderation_results: [],
    current_node: 'msg-202',
    plugin_ids: null,
    conversation_template_id: null,
    gizmo_id: null,
    is_archived: false,
  },
];

/**
 * Inject mock data into extension storage
 */
export async function injectMockData(page: any, pin: string): Promise<void> {
  await page.evaluate(async ({ conversations, pin }: { conversations: Conversation[], pin: string }) => {
    // Import crypto functions dynamically
    const { initializeArchive, saveConversations } = await import('../../src/utils/storage.js');
    
    // Initialize with PIN
    await initializeArchive(pin);
    
    // Save conversations
    await saveConversations(conversations);
  }, { conversations: mockConversations, pin });
}

/**
 * Wait for a file download
 */
export async function waitForDownload(page: any, trigger: () => Promise<void>): Promise<string> {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    trigger(),
  ]);
  
  const path = await download.path();
  return path;
}

/**
 * Read downloaded file content
 */
export async function readDownloadedFile(path: string): Promise<string> {
  const fs = await import('fs');
  return fs.readFileSync(path, 'utf-8');
}
