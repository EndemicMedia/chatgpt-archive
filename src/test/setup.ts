/**
 * Test Setup - Browser API Mocks
 */

import { vi } from 'vitest';

// Mock pako compression
vi.mock('pako', () => ({
  compress: vi.fn((data: Uint8Array) => data),
  decompress: vi.fn((data: Uint8Array) => data)
}));

// Mock chrome/browser storage API
globalThis.browser = {
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
      getBytesInUse: vi.fn().mockResolvedValue(0)
    },
    sync: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined)
    }
  },
  runtime: {
    onInstalled: { addListener: vi.fn() },
    onMessage: { addListener: vi.fn() },
    sendMessage: vi.fn().mockResolvedValue({}),
    getManifest: vi.fn().mockReturnValue({ version: '1.0.0' }),
    id: 'test-extension-id'
  },
  tabs: {
    create: vi.fn().mockResolvedValue({}),
    query: vi.fn().mockResolvedValue([]),
    sendMessage: vi.fn().mockResolvedValue({})
  },
  downloads: {
    download: vi.fn().mockResolvedValue(1)
  },
  action: {
    onClicked: { addListener: vi.fn() },
    setBadgeText: vi.fn().mockResolvedValue(undefined),
    setBadgeBackgroundColor: vi.fn().mockResolvedValue(undefined)
  },
  sidePanel: {
    setOptions: vi.fn().mockResolvedValue(undefined)
  }
} as any;

globalThis.chrome = globalThis.browser;

// Mock fetch
globalThis.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: vi.fn().mockResolvedValue({}),
  text: vi.fn().mockResolvedValue(''),
  blob: vi.fn().mockResolvedValue(new Blob())
});

// Mock URL methods
globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
globalThis.URL.revokeObjectURL = vi.fn();

// Mock Element.scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Helper to reset mocks
export function resetBrowserMocks() {
  vi.clearAllMocks();
}
