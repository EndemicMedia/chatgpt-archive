/**
 * Storage Module - Encrypted, compressed storage for ChatGPT Archive
 * 
 * Combines browser.storage.local with pako compression and AES encryption
 */

import pako from 'pako';
import {
  encryptWithPIN,
  decryptWithPIN,
  generateDataKey,
  wrapDataKey,
  unwrapDataKey,
  encryptWithKey,
  decryptWithKey,
  EncryptedData,
  PINHash,
  hashPIN,
  verifyPIN
} from '@/utils/crypto';
import { Conversation, Category, ArchiveMetadata, VisibilitySettings } from '@/utils/types';

// Storage keys
const STORAGE_KEYS = {
  PIN_HASH: 'archive_pin_hash',
  WRAPPED_KEY: 'archive_wrapped_key',
  METADATA: 'archive_metadata',
  CONVERSATIONS: 'archive_conversations',
  CATEGORIES: 'archive_categories',
  VISIBILITY: 'archive_visibility',
  SEARCH_INDEX: 'archive_search_index',
  SETTINGS: 'archive_settings'
} as const;

// Default categories matching browser tab groups
export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-blue', name: 'Work', color: '#4285f4', icon: 'briefcase' },
  { id: 'cat-red', name: 'Personal', color: '#ea4335', icon: 'user' },
  { id: 'cat-yellow', name: 'Ideas', color: '#fbbc04', icon: 'lightbulb' },
  { id: 'cat-green', name: 'Learning', color: '#34a853', icon: 'book' },
  { id: 'cat-pink', name: 'Projects', color: '#ff6d6d', icon: 'folder' },
  { id: 'cat-purple', name: 'Research', color: '#a142f4', icon: 'search' },
  { id: 'cat-cyan', name: 'Code', color: '#24c1e0', icon: 'code' },
  { id: 'cat-orange', name: 'Misc', color: '#fa903e', icon: 'tag' }
];

interface StorageContext {
  dataKey: CryptoKey | null;
  pinVerified: boolean;
}

// In-memory context (key is not persisted)
let storageContext: StorageContext = {
  dataKey: null,
  pinVerified: false
};

/**
 * Convert string to Uint8Array
 */
function stringToUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Convert Uint8Array to string
 */
function uint8ArrayToString(arr: Uint8Array): string {
  return new TextDecoder().decode(arr);
}

/**
 * Convert Uint8Array to Base64
 */
function uint8ArrayToBase64(arr: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < arr.length; i++) {
    binary += String.fromCharCode(arr[i]);
  }
  return btoa(binary);
}

/**
 * Convert Base64 to Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    arr[i] = binary.charCodeAt(i);
  }
  return arr;
}

/**
 * Check if archive is initialized (PIN set up)
 */
export async function isArchiveInitialized(): Promise<boolean> {
  const result = await browser.storage.local.get(STORAGE_KEYS.PIN_HASH);
  return !!result[STORAGE_KEYS.PIN_HASH];
}

/**
 * Initialize archive with a PIN
 */
export async function initializeArchive(pin: string): Promise<void> {
  // Hash the PIN for verification
  const pinHash = await hashPIN(pin);
  
  // Generate a data key for encrypting conversations
  const dataKey = await generateDataKey();
  
  // Wrap (encrypt) the data key with the PIN
  const wrappedKey = await wrapDataKey(dataKey, pin);
  
  // Create initial metadata
  const metadata: ArchiveMetadata = {
    version: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    conversationCount: 0,
    totalSize: 0,
    lastBackupAt: null,
    encryptionVersion: 1
  };
  
  // Store everything
  await browser.storage.local.set({
    [STORAGE_KEYS.PIN_HASH]: pinHash,
    [STORAGE_KEYS.WRAPPED_KEY]: wrappedKey,
    [STORAGE_KEYS.METADATA]: metadata,
    [STORAGE_KEYS.CATEGORIES]: DEFAULT_CATEGORIES,
    [STORAGE_KEYS.VISIBILITY]: {},
    [STORAGE_KEYS.CONVERSATIONS]: null // Will be encrypted blob
  });
  
  // Set context
  storageContext.dataKey = dataKey;
  storageContext.pinVerified = true;
}

/**
 * Verify PIN and unlock archive
 */
export async function unlockArchive(pin: string): Promise<boolean> {
  try {
    // Get stored PIN hash
    const result = await browser.storage.local.get(STORAGE_KEYS.PIN_HASH);
    const pinHash: PINHash = result[STORAGE_KEYS.PIN_HASH];
    
    if (!pinHash) {
      return false;
    }
    
    // Verify PIN
    const isValid = await verifyPIN(pin, pinHash);
    
    if (!isValid) {
      return false;
    }
    
    // Get wrapped key
    const keyResult = await browser.storage.local.get(STORAGE_KEYS.WRAPPED_KEY);
    const wrappedKey: EncryptedData = keyResult[STORAGE_KEYS.WRAPPED_KEY];
    
    // Unwrap the data key
    const dataKey = await unwrapDataKey(wrappedKey, pin);
    
    // Set context
    storageContext.dataKey = dataKey;
    storageContext.pinVerified = true;
    
    return true;
  } catch (error) {
    console.error('Failed to unlock archive:', error);
    return false;
  }
}

/**
 * Check if archive is unlocked
 */
export function isArchiveUnlocked(): boolean {
  return storageContext.pinVerified && storageContext.dataKey !== null;
}

/**
 * Lock the archive (clear in-memory key)
 */
export function lockArchive(): void {
  storageContext.dataKey = null;
  storageContext.pinVerified = false;
}

/**
 * Change PIN
 */
export async function changePIN(oldPin: string, newPin: string): Promise<boolean> {
  try {
    // Verify old PIN first
    const isValid = await unlockArchive(oldPin);
    if (!isValid) {
      return false;
    }
    
    // Get current data key
    const dataKey = storageContext.dataKey;
    if (!dataKey) {
      return false;
    }
    
    // Hash new PIN
    const newPinHash = await hashPIN(newPin);
    
    // Rewrap data key with new PIN
    const newWrappedKey = await wrapDataKey(dataKey, newPin);
    
    // Update storage
    await browser.storage.local.set({
      [STORAGE_KEYS.PIN_HASH]: newPinHash,
      [STORAGE_KEYS.WRAPPED_KEY]: newWrappedKey
    });
    
    return true;
  } catch (error) {
    console.error('Failed to change PIN:', error);
    return false;
  }
}

/**
 * Compress and encrypt data
 */
async function compressAndEncrypt(data: unknown): Promise<EncryptedData> {
  if (!storageContext.dataKey) {
    throw new Error('Archive is locked');
  }
  
  // Serialize to JSON
  const jsonString = JSON.stringify(data);
  
  // Compress
  const compressed = pako.compress(stringToUint8Array(jsonString));
  
  // Encrypt
  const encrypted = await encryptWithKey(uint8ArrayToBase64(compressed), storageContext.dataKey);
  
  return encrypted;
}

/**
 * Decrypt and decompress data
 */
async function decryptAndDecompress(encrypted: EncryptedData): Promise<unknown> {
  if (!storageContext.dataKey) {
    throw new Error('Archive is locked');
  }
  
  // Decrypt
  const decryptedBase64 = await decryptWithKey(encrypted, storageContext.dataKey);
  
  // Decompress
  const compressed = base64ToUint8Array(decryptedBase64);
  const decompressed = pako.decompress(compressed);
  
  // Parse JSON
  return JSON.parse(uint8ArrayToString(decompressed));
}

/**
 * Save conversations to storage
 */
export async function saveConversations(conversations: Conversation[]): Promise<void> {
  const encrypted = await compressAndEncrypt(conversations);
  
  // Update metadata
  const metadata = await getMetadata();
  metadata.conversationCount = conversations.length;
  metadata.updatedAt = Date.now();
  
  // Estimate size (approximate)
  const sizeEstimate = JSON.stringify(conversations).length;
  metadata.totalSize = sizeEstimate;
  
  await browser.storage.local.set({
    [STORAGE_KEYS.CONVERSATIONS]: encrypted,
    [STORAGE_KEYS.METADATA]: metadata
  });
}

/**
 * Get all conversations from storage
 */
export async function getConversations(): Promise<Conversation[]> {
  const result = await browser.storage.local.get(STORAGE_KEYS.CONVERSATIONS);
  const encrypted: EncryptedData | null = result[STORAGE_KEYS.CONVERSATIONS];
  
  if (!encrypted) {
    return [];
  }
  
  return decryptAndDecompress(encrypted) as Promise<Conversation[]>;
}

/**
 * Get metadata (unencrypted)
 */
export async function getMetadata(): Promise<ArchiveMetadata> {
  const result = await browser.storage.local.get(STORAGE_KEYS.METADATA);
  return (result[STORAGE_KEYS.METADATA] as ArchiveMetadata) || {
    version: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    conversationCount: 0,
    totalMessages: 0,
    categoryCount: 0
  };
}

/**
 * Update metadata
 */
export async function updateMetadata(updates: Partial<ArchiveMetadata>): Promise<void> {
  const metadata = await getMetadata();
  Object.assign(metadata, updates);
  metadata.updatedAt = Date.now();
  await browser.storage.local.set({ [STORAGE_KEYS.METADATA]: metadata });
}

/**
 * Get categories
 */
export async function getCategories(): Promise<Category[]> {
  const result = await browser.storage.local.get(STORAGE_KEYS.CATEGORIES);
  return result[STORAGE_KEYS.CATEGORIES] as Category[] || DEFAULT_CATEGORIES;
}

/**
 * Save categories
 */
export async function saveCategories(categories: Category[]): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEYS.CATEGORIES]: categories });
}

/**
 * Get visibility settings
 */
export async function getVisibilitySettings(): Promise<VisibilitySettings> {
  const result = await browser.storage.local.get(STORAGE_KEYS.VISIBILITY);
  return result[STORAGE_KEYS.VISIBILITY] as VisibilitySettings || {};
}

/**
 * Update visibility settings
 */
export async function updateVisibilitySettings(
  conversationId: string, 
  messageId: string, 
  hideQuestion: boolean, 
  hideAnswer: boolean
): Promise<void> {
  const settings = await getVisibilitySettings();
  
  if (!settings[conversationId]) {
    settings[conversationId] = {};
  }
  
  settings[conversationId][messageId] = { hideQuestion, hideAnswer };
  
  await browser.storage.local.set({ [STORAGE_KEYS.VISIBILITY]: settings });
}

/**
 * Get visibility for a specific message
 */
export async function getMessageVisibility(
  conversationId: string, 
  messageId: string
): Promise<{ hideQuestion: boolean; hideAnswer: boolean }> {
  const settings = await getVisibilitySettings();
  return settings[conversationId]?.[messageId] || { hideQuestion: false, hideAnswer: false };
}

/**
 * Clear all archive data
 */
export async function clearArchive(): Promise<void> {
  await browser.storage.local.remove([
    STORAGE_KEYS.PIN_HASH,
    STORAGE_KEYS.WRAPPED_KEY,
    STORAGE_KEYS.METADATA,
    STORAGE_KEYS.CONVERSATIONS,
    STORAGE_KEYS.CATEGORIES,
    STORAGE_KEYS.VISIBILITY,
    STORAGE_KEYS.SEARCH_INDEX,
    STORAGE_KEYS.SETTINGS
  ]);
  
  lockArchive();
}

/**
 * Export raw data for backup (decrypted, as JSON)
 */
export async function exportRawData(): Promise<{
  metadata: ArchiveMetadata;
  conversations: Conversation[];
  categories: Category[];
  visibility: VisibilitySettings;
}> {
  const [metadata, conversations, categories, visibility] = await Promise.all([
    getMetadata(),
    getConversations(),
    getCategories(),
    getVisibilitySettings()
  ]);
  
  return {
    metadata,
    conversations,
    categories,
    visibility
  };
}

/**
 * Import raw data (replaces existing data)
 */
export async function importRawData(data: {
  conversations: Conversation[];
  categories?: Category[];
  visibility?: VisibilitySettings;
}): Promise<void> {
  await Promise.all([
    saveConversations(data.conversations),
    data.categories ? saveCategories(data.categories) : Promise.resolve(),
    data.visibility ? browser.storage.local.set({ [STORAGE_KEYS.VISIBILITY]: data.visibility }) : Promise.resolve()
  ]);
}

/**
 * Get storage usage info
 */
export async function getStorageUsage(): Promise<{
  used: number;
  available: number;
  percentUsed: number;
}> {
  const bytesInUse = await browser.storage.local.getBytesInUse();
  // chrome.storage.local has ~5MB limit (actually more, but let's be conservative)
  const maxBytes = 5 * 1024 * 1024;
  
  return {
    used: bytesInUse,
    available: maxBytes - bytesInUse,
    percentUsed: (bytesInUse / maxBytes) * 100
  };
}
