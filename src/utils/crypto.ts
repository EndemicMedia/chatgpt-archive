/**
 * Crypto Module - PIN-based encryption for ChatGPT Archive
 * 
 * Uses Web Crypto API with PBKDF2 for key derivation
 * and AES-256-GCM for encryption.
 */

export interface EncryptedData {
  ciphertext: string;      // Base64 encoded encrypted data
  iv: string;              // Base64 encoded initialization vector
  salt: string;            // Base64 encoded salt for PBKDF2
  version: number;         // Encryption version for future migrations
}

export interface PINHash {
  hash: string;            // Base64 encoded SHA-256 hash
  salt: string;            // Base64 encoded salt
  iterations: number;      // PBKDF2 iterations used
}

const ENCRYPTION_VERSION = 1;
const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH = 256; // bits
const IV_LENGTH = 12;   // bytes for GCM
const SALT_LENGTH = 16; // bytes

/**
 * Generate a random salt for key derivation
 */
function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

/**
 * Generate a random IV for encryption
 */
function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(IV_LENGTH));
}

/**
 * Convert ArrayBuffer to Base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Base64 string to Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Derive an encryption key from a PIN using PBKDF2
 */
export async function deriveKeyFromPIN(
  pin: string, 
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const pinData = encoder.encode(pin);
  
  // Import PIN as raw key material
  const pinKey = await crypto.subtle.importKey(
    'raw',
    pinData,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  
  // Derive AES-GCM key using PBKDF2
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    pinKey,
    {
      name: 'AES-GCM',
      length: KEY_LENGTH
    },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Hash a PIN for verification (not for encryption)
 * Uses PBKDF2 with high iteration count
 */
export async function hashPIN(pin: string): Promise<PINHash> {
  const salt = generateSalt();
  const encoder = new TextEncoder();
  const pinData = encoder.encode(pin);
  
  // Import PIN as raw key material
  const pinKey = await crypto.subtle.importKey(
    'raw',
    pinData,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  
  // Derive bits using PBKDF2
  const hash = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    pinKey,
    KEY_LENGTH
  );
  
  return {
    hash: arrayBufferToBase64(hash),
    salt: arrayBufferToBase64(salt.buffer as ArrayBuffer),
    iterations: PBKDF2_ITERATIONS
  };
}

/**
 * Verify a PIN against a stored hash
 */
export async function verifyPIN(pin: string, storedHash: PINHash): Promise<boolean> {
  try {
    const salt = base64ToUint8Array(storedHash.salt);
    const encoder = new TextEncoder();
    const pinData = encoder.encode(pin);
    
    const pinKey = await crypto.subtle.importKey(
      'raw',
      pinData,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    
    const hash = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: storedHash.iterations,
        hash: 'SHA-256'
      },
      pinKey,
      KEY_LENGTH
    );
    
    const computedHash = arrayBufferToBase64(hash);
    
    // Constant-time comparison to prevent timing attacks
    if (computedHash.length !== storedHash.hash.length) {
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < computedHash.length; i++) {
      result |= computedHash.charCodeAt(i) ^ storedHash.hash.charCodeAt(i);
    }
    
    return result === 0;
  } catch (error) {
    console.error('PIN verification error:', error);
    return false;
  }
}

/**
 * Encrypt data with a PIN-derived key
 */
export async function encryptWithPIN(
  data: string, 
  pin: string
): Promise<EncryptedData> {
  const salt = generateSalt();
  const iv = generateIV();
  const key = await deriveKeyFromPIN(pin, salt);
  
  const encoder = new TextEncoder();
  const plaintext = encoder.encode(data);
  
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    plaintext
  );
  
  return {
    ciphertext: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv.buffer as ArrayBuffer),
    salt: arrayBufferToBase64(salt.buffer as ArrayBuffer),
    version: ENCRYPTION_VERSION
  };
}

/**
 * Decrypt data with a PIN-derived key
 */
export async function decryptWithPIN(
  encryptedData: EncryptedData, 
  pin: string
): Promise<string> {
  try {
    const salt = base64ToUint8Array(encryptedData.salt);
    const iv = base64ToUint8Array(encryptedData.iv);
    const ciphertext = base64ToUint8Array(encryptedData.ciphertext);
    
    const key = await deriveKeyFromPIN(pin, salt);
    
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      ciphertext
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    // Decryption failed - likely wrong PIN
    throw new Error('Decryption failed: Invalid PIN or corrupted data');
  }
}

/**
 * Generate a random encryption key (for data encryption, not PIN-based)
 * This key itself will be encrypted with the PIN
 */
export async function generateDataKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: KEY_LENGTH
    },
    true, // extractable - we need to wrap this key
    ['encrypt', 'decrypt']
  );
}

/**
 * Wrap (encrypt) a data key with a PIN-derived key
 */
export async function wrapDataKey(
  dataKey: CryptoKey, 
  pin: string
): Promise<EncryptedData> {
  const salt = generateSalt();
  const iv = generateIV();
  const wrappingKey = await deriveKeyFromPIN(pin, salt);
  
  // Export the data key as raw bytes
  const exportedKey = await crypto.subtle.exportKey('raw', dataKey);
  
  // Wrap (encrypt) the exported key
  const wrapped = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    wrappingKey,
    exportedKey
  );
  
  return {
    ciphertext: arrayBufferToBase64(wrapped),
    iv: arrayBufferToBase64(iv.buffer as ArrayBuffer),
    salt: arrayBufferToBase64(salt.buffer as ArrayBuffer),
    version: ENCRYPTION_VERSION
  };
}

/**
 * Unwrap (decrypt) a data key with a PIN-derived key
 */
export async function unwrapDataKey(
  wrappedKey: EncryptedData, 
  pin: string
): Promise<CryptoKey> {
  const salt = base64ToUint8Array(wrappedKey.salt);
  const iv = base64ToUint8Array(wrappedKey.iv);
  const ciphertext = base64ToUint8Array(wrappedKey.ciphertext);
  
  const wrappingKey = await deriveKeyFromPIN(pin, salt);
  
  // Decrypt the wrapped key
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    wrappingKey,
    ciphertext
  );
  
  // Import the decrypted key
  return crypto.subtle.importKey(
    'raw',
    decrypted,
    {
      name: 'AES-GCM',
      length: KEY_LENGTH
    },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data using a data key (for bulk encryption)
 */
export async function encryptWithKey(
  data: string, 
  key: CryptoKey
): Promise<EncryptedData> {
  const iv = generateIV();
  const encoder = new TextEncoder();
  const plaintext = encoder.encode(data);
  
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    plaintext
  );
  
  return {
    ciphertext: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv.buffer as ArrayBuffer),
    salt: '', // Not used for direct key encryption
    version: ENCRYPTION_VERSION
  };
}

/**
 * Decrypt data using a data key
 */
export async function decryptWithKey(
  encryptedData: EncryptedData, 
  key: CryptoKey
): Promise<string> {
  const iv = base64ToUint8Array(encryptedData.iv);
  const ciphertext = base64ToUint8Array(encryptedData.ciphertext);
  
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    ciphertext
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}
