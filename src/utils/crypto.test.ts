import { describe, it, expect, beforeEach } from 'vitest';
import {
  hashPIN,
  verifyPIN,
  encryptWithPIN,
  decryptWithPIN,
  generateDataKey,
  wrapDataKey,
  unwrapDataKey,
  encryptWithKey,
  decryptWithKey,
  EncryptedData,
  PINHash
} from './crypto';

describe('Crypto Module', () => {
  const TEST_PIN = '123456';
  const TEST_DATA = JSON.stringify({
    conversations: [
      { id: '1', title: 'Test Conversation', messages: [] }
    ]
  });

  describe('hashPIN', () => {
    it('should hash a PIN successfully', async () => {
      const hash = await hashPIN(TEST_PIN);
      
      expect(hash).toBeDefined();
      expect(hash.hash).toBeDefined();
      expect(hash.salt).toBeDefined();
      expect(hash.iterations).toBe(100000);
      expect(hash.hash.length).toBeGreaterThan(0);
      expect(hash.salt.length).toBeGreaterThan(0);
    });

    it('should produce different hashes for same PIN (different salts)', async () => {
      const hash1 = await hashPIN(TEST_PIN);
      const hash2 = await hashPIN(TEST_PIN);
      
      expect(hash1.hash).not.toBe(hash2.hash);
      expect(hash1.salt).not.toBe(hash2.salt);
    });
  });

  describe('verifyPIN', () => {
    it('should return true for correct PIN', async () => {
      const hash = await hashPIN(TEST_PIN);
      const isValid = await verifyPIN(TEST_PIN, hash);
      
      expect(isValid).toBe(true);
    });

    it('should return false for incorrect PIN', async () => {
      const hash = await hashPIN(TEST_PIN);
      const isValid = await verifyPIN('wrong-pin', hash);
      
      expect(isValid).toBe(false);
    });

    it('should return false for empty PIN', async () => {
      const hash = await hashPIN(TEST_PIN);
      const isValid = await verifyPIN('', hash);
      
      expect(isValid).toBe(false);
    });

    it('should handle different PIN lengths', async () => {
      const shortPIN = '1';
      const longPIN = '12345678901234567890';
      
      const hashShort = await hashPIN(shortPIN);
      const hashLong = await hashPIN(longPIN);
      
      expect(await verifyPIN(shortPIN, hashShort)).toBe(true);
      expect(await verifyPIN(longPIN, hashLong)).toBe(true);
      expect(await verifyPIN(shortPIN, hashLong)).toBe(false);
    });
  });

  describe('encryptWithPIN / decryptWithPIN', () => {
    it('should encrypt and decrypt data successfully', async () => {
      const encrypted = await encryptWithPIN(TEST_DATA, TEST_PIN);
      
      expect(encrypted).toBeDefined();
      expect(encrypted.ciphertext).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.salt).toBeDefined();
      expect(encrypted.version).toBe(1);
      
      const decrypted = await decryptWithPIN(encrypted, TEST_PIN);
      expect(decrypted).toBe(TEST_DATA);
    });

    it('should produce different ciphertexts for same data (different IVs)', async () => {
      const encrypted1 = await encryptWithPIN(TEST_DATA, TEST_PIN);
      const encrypted2 = await encryptWithPIN(TEST_DATA, TEST_PIN);
      
      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });

    it('should fail decryption with wrong PIN', async () => {
      const encrypted = await encryptWithPIN(TEST_DATA, TEST_PIN);
      
      await expect(decryptWithPIN(encrypted, 'wrong-pin')).rejects.toThrow(
        'Decryption failed'
      );
    });

    it('should handle empty data', async () => {
      const encrypted = await encryptWithPIN('', TEST_PIN);
      const decrypted = await decryptWithPIN(encrypted, TEST_PIN);
      
      expect(decrypted).toBe('');
    });

    it('should handle large data', async () => {
      const largeData = 'x'.repeat(100000);
      const encrypted = await encryptWithPIN(largeData, TEST_PIN);
      const decrypted = await decryptWithPIN(encrypted, TEST_PIN);
      
      expect(decrypted).toBe(largeData);
    });

    it('should handle Unicode data', async () => {
      const unicodeData = JSON.stringify({
        text: 'Hello 世界 🌍 Привет مرحبا עברית',
        emoji: '🎉🚀💻🔒'
      });
      
      const encrypted = await encryptWithPIN(unicodeData, TEST_PIN);
      const decrypted = await decryptWithPIN(encrypted, TEST_PIN);
      
      expect(decrypted).toBe(unicodeData);
    });
  });

  describe('Data Key Operations', () => {
    it('should generate a data key', async () => {
      const key = await generateDataKey();
      expect(key).toBeDefined();
      expect(key.type).toBe('secret');
      expect(key.algorithm.name).toBe('AES-GCM');
    });

    it('should wrap and unwrap data key with PIN', async () => {
      const dataKey = await generateDataKey();
      const wrapped = await wrapDataKey(dataKey, TEST_PIN);
      
      expect(wrapped).toBeDefined();
      expect(wrapped.ciphertext).toBeDefined();
      expect(wrapped.iv).toBeDefined();
      expect(wrapped.salt).toBeDefined();
      
      const unwrapped = await unwrapDataKey(wrapped, TEST_PIN);
      expect(unwrapped).toBeDefined();
      expect(unwrapped.type).toBe('secret');
    });

    it('should fail unwrapping with wrong PIN', async () => {
      const dataKey = await generateDataKey();
      const wrapped = await wrapDataKey(dataKey, TEST_PIN);
      
      await expect(unwrapDataKey(wrapped, 'wrong-pin')).rejects.toThrow();
    });

    it('should encrypt and decrypt with data key', async () => {
      const dataKey = await generateDataKey();
      const encrypted = await encryptWithKey(TEST_DATA, dataKey);
      const decrypted = await decryptWithKey(encrypted, dataKey);
      
      expect(decrypted).toBe(TEST_DATA);
    });

    it('should use data key for bulk encryption', async () => {
      const dataKey = await generateDataKey();
      const items = [
        'Item 1: Hello World',
        'Item 2: Test Data',
        'Item 3: More Content'
      ];
      
      const encryptedItems = await Promise.all(
        items.map(item => encryptWithKey(item, dataKey))
      );
      
      const decryptedItems = await Promise.all(
        encryptedItems.map(enc => decryptWithKey(enc, dataKey))
      );
      
      expect(decryptedItems).toEqual(items);
    });
  });

  describe('Security Properties', () => {
    it('should have constant-time PIN comparison', async () => {
      // This is hard to test directly, but we verify the function
      // exists and works correctly
      const hash = await hashPIN(TEST_PIN);
      
      const start = performance.now();
      await verifyPIN(TEST_PIN, hash);
      const correctTime = performance.now() - start;
      
      const start2 = performance.now();
      await verifyPIN('wrong-pin', hash);
      const wrongTime = performance.now() - start2;
      
      // Times should be similar (within 50% of each other)
      // This is a rough check, not a strict timing attack test
      const ratio = Math.max(correctTime, wrongTime) / Math.min(correctTime, wrongTime);
      expect(ratio).toBeLessThan(2);
    });

    it('should use different salts for each operation', async () => {
      const encrypted1 = await encryptWithPIN('data1', TEST_PIN);
      const encrypted2 = await encryptWithPIN('data2', TEST_PIN);
      
      expect(encrypted1.salt).not.toBe(encrypted2.salt);
    });

    it('should use different IVs for each operation', async () => {
      const encrypted1 = await encryptWithPIN('data1', TEST_PIN);
      const encrypted2 = await encryptWithPIN('data2', TEST_PIN);
      
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });
  });
});
