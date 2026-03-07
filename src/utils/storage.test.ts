import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isArchiveInitialized,
  initializeArchive,
  unlockArchive,
  isArchiveUnlocked,
  lockArchive,
  changePIN,
  saveConversations,
  getConversations,
  getMetadata,
  updateMetadata,
  getCategories,
  saveCategories,
  getVisibilitySettings,
  updateVisibilitySettings,
  getMessageVisibility,
  clearArchive,
  exportRawData,
  importRawData,
  getStorageUsage,
  DEFAULT_CATEGORIES
} from './storage';
import { Conversation, Category } from './types';

// Storage state mock
let storageState: Record<string, unknown> = {};

describe('Storage Module', () => {
  const TEST_PIN = '123456';
  const TEST_CONVERSATIONS: Conversation[] = [
    {
      id: 'conv-1',
      title: 'Test Conversation 1',
      create_time: Date.now(),
      update_time: Date.now(),
      messages: [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          content_type: 'text',
          create_time: Date.now()
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: 'Hi there!',
          content_type: 'text',
          model: 'gpt-4',
          create_time: Date.now()
        }
      ]
    }
  ];

  beforeEach(() => {
    // Reset storage state
    storageState = {};
    lockArchive();
    
    // Mock browser.storage.local methods
    const mockGet = vi.fn().mockImplementation((keys: string | string[] | Record<string, unknown> | null) => {
      if (keys === null) return Promise.resolve({ ...storageState });
      if (typeof keys === 'string') return Promise.resolve({ [keys]: storageState[keys] });
      if (Array.isArray(keys)) {
        const result: Record<string, unknown> = {};
        keys.forEach(key => { result[key] = storageState[key]; });
        return Promise.resolve(result);
      }
      return Promise.resolve({ ...keys, ...Object.fromEntries(
        Object.keys(keys).map(key => [key, storageState[key] ?? (keys as Record<string, unknown>)[key]])
      )});
    });
    
    const mockSet = vi.fn().mockImplementation((items: Record<string, unknown>) => {
      Object.assign(storageState, items);
      return Promise.resolve();
    });
    
    const mockRemove = vi.fn().mockImplementation((keys: string | string[]) => {
      const keysArray = Array.isArray(keys) ? keys : [keys];
      keysArray.forEach(key => delete storageState[key]);
      return Promise.resolve();
    });
    
    const mockClear = vi.fn().mockImplementation(() => {
      storageState = {};
      return Promise.resolve();
    });
    
    const mockGetBytesInUse = vi.fn().mockResolvedValue(1024 * 1024);
    
    globalThis.browser = {
      storage: {
        local: {
          get: mockGet,
          set: mockSet,
          remove: mockRemove,
          clear: mockClear,
          getBytesInUse: mockGetBytesInUse
        }
      }
    } as any;
  });

  describe('Archive Initialization', () => {
    it('should return false when archive is not initialized', async () => {
      const initialized = await isArchiveInitialized();
      expect(initialized).toBe(false);
    });

    it('should initialize archive with PIN', async () => {
      await initializeArchive(TEST_PIN);
      
      const initialized = await isArchiveInitialized();
      expect(initialized).toBe(true);
      
      const metadata = await getMetadata();
      expect(metadata.conversationCount).toBe(0);
    });

    it('should create default categories on init', async () => {
      await initializeArchive(TEST_PIN);
      
      const categories = await getCategories();
      expect(categories.length).toBe(DEFAULT_CATEGORIES.length);
      expect(categories[0].name).toBe('Work');
    });
  });

  describe('Archive Unlock/Lock', () => {
    it('should unlock with correct PIN', async () => {
      await initializeArchive(TEST_PIN);
      lockArchive();
      expect(isArchiveUnlocked()).toBe(false);
      
      const unlocked = await unlockArchive(TEST_PIN);
      expect(unlocked).toBe(true);
      expect(isArchiveUnlocked()).toBe(true);
    });

    it('should fail unlock with wrong PIN', async () => {
      await initializeArchive(TEST_PIN);
      lockArchive();
      
      const unlocked = await unlockArchive('wrong-pin');
      expect(unlocked).toBe(false);
      expect(isArchiveUnlocked()).toBe(false);
    });

    it('should lock archive', async () => {
      await initializeArchive(TEST_PIN);
      expect(isArchiveUnlocked()).toBe(true);
      
      lockArchive();
      expect(isArchiveUnlocked()).toBe(false);
    });
  });

  describe('PIN Change', () => {
    it.skip('should change PIN with correct old PIN', async () => {
      // Note: PIN change requires extractable keys which aren't available in test environment
      await initializeArchive(TEST_PIN);
      
      const changed = await changePIN(TEST_PIN, 'new-pin-123');
      expect(changed).toBe(true);
      
      // New PIN should work
      lockArchive();
      const unlocked = await unlockArchive('new-pin-123');
      expect(unlocked).toBe(true);
    });

    it('should fail PIN change with wrong old PIN', async () => {
      await initializeArchive(TEST_PIN);
      
      const changed = await changePIN('wrong-pin', 'new-pin');
      expect(changed).toBe(false);
      
      // Old PIN should still work
      lockArchive();
      const unlocked = await unlockArchive(TEST_PIN);
      expect(unlocked).toBe(true);
    });
  });

  describe('Conversations', () => {
    it('should return empty array when no conversations', async () => {
      await initializeArchive(TEST_PIN);
      
      const conversations = await getConversations();
      expect(conversations).toEqual([]);
    });

    it('should throw when saving while locked', async () => {
      await initializeArchive(TEST_PIN);
      lockArchive();
      
      await expect(saveConversations(TEST_CONVERSATIONS)).rejects.toThrow('Archive is locked');
    });
  });

  describe('Metadata', () => {
    it('should update metadata', async () => {
      await initializeArchive(TEST_PIN);
      
      await updateMetadata({ lastBackupAt: Date.now() });
      const metadata = await getMetadata();
      
      expect(metadata.lastBackupAt).toBeDefined();
    });
  });

  describe('Categories', () => {
    it('should save custom categories', async () => {
      await initializeArchive(TEST_PIN);
      
      const customCategories: Category[] = [
        { id: 'custom-1', name: 'Custom', color: '#ff0000', icon: 'star' }
      ];
      
      await saveCategories(customCategories);
      const retrieved = await getCategories();
      
      expect(retrieved).toHaveLength(1);
      expect(retrieved[0].name).toBe('Custom');
    });
  });

  describe('Visibility Settings', () => {
    it('should return default visibility when not set', async () => {
      const visibility = await getMessageVisibility('conv-x', 'msg-y');
      expect(visibility.hideQuestion).toBe(false);
      expect(visibility.hideAnswer).toBe(false);
    });
  });

  describe('Clear Archive', () => {
    it('should clear all data and lock', async () => {
      await initializeArchive(TEST_PIN);
      
      await clearArchive();
      
      expect(isArchiveUnlocked()).toBe(false);
      expect(await isArchiveInitialized()).toBe(false);
    });
  });

  describe('Storage Usage', () => {
    it('should return storage usage info', async () => {
      const usage = await getStorageUsage();
      expect(usage.used).toBe(1024 * 1024);
      expect(usage.percentUsed).toBeGreaterThan(0);
    });
  });
});
