import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { encrypt, decrypt } from '@/lib/encryption';

const VALID_KEY = 'a'.repeat(64); // 64 valid hex chars

describe('encryption', () => {
  const originalKey = process.env.ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = VALID_KEY;
  });

  afterEach(() => {
    process.env.ENCRYPTION_KEY = originalKey;
  });

  describe('round-trip', () => {
    it('encrypts and decrypts to original plaintext', () => {
      const plaintext = 'Hello, 世界! This is a secret.';
      expect(decrypt(encrypt(plaintext))).toBe(plaintext);
    });

    it('handles empty string', () => {
      expect(decrypt(encrypt(''))).toBe('');
    });

    it('handles unicode and emoji', () => {
      const text = '🔐 top secret 機密';
      expect(decrypt(encrypt(text))).toBe(text);
    });
  });

  describe('random IV', () => {
    it('two encryptions of same plaintext produce different ciphertexts', () => {
      const c1 = encrypt('same input');
      const c2 = encrypt('same input');
      expect(c1).not.toBe(c2);
    });

    it('ciphertext has iv:authTag:encrypted format with correct lengths', () => {
      const parts = encrypt('test').split(':');
      expect(parts).toHaveLength(3);
      expect(parts[0]).toHaveLength(32); // 16-byte IV → 32 hex chars
      expect(parts[1]).toHaveLength(32); // 16-byte auth tag → 32 hex chars
    });
  });

  describe('tamper detection', () => {
    it('throws when auth tag is corrupted', () => {
      const parts = encrypt('secret').split(':');
      parts[1] = (parts[1][0] === 'a' ? 'b' : 'a') + parts[1].slice(1);
      expect(() => decrypt(parts.join(':'))).toThrow();
    });

    it('throws when encrypted body is corrupted', () => {
      const parts = encrypt('secret').split(':');
      parts[2] = parts[2].split('').reverse().join('');
      expect(() => decrypt(parts.join(':'))).toThrow();
    });

    it('throws on invalid format (missing colons)', () => {
      expect(() => decrypt('notvalidformat')).toThrow('Invalid encrypted data format');
    });
  });

  describe('wrong key', () => {
    it('throws when decrypting with a different key', () => {
      const ciphertext = encrypt('secret');
      process.env.ENCRYPTION_KEY = 'b'.repeat(64);
      expect(() => decrypt(ciphertext)).toThrow();
    });
  });

  describe('ENCRYPTION_KEY validation', () => {
    it('throws when ENCRYPTION_KEY is missing', () => {
      delete process.env.ENCRYPTION_KEY;
      expect(() => encrypt('x')).toThrow('ENCRYPTION_KEY must be exactly 64 hex characters');
    });

    it('throws when ENCRYPTION_KEY is too short', () => {
      process.env.ENCRYPTION_KEY = 'a'.repeat(32);
      expect(() => encrypt('x')).toThrow('ENCRYPTION_KEY must be exactly 64 hex characters');
    });

    it('throws when ENCRYPTION_KEY contains non-hex characters', () => {
      process.env.ENCRYPTION_KEY = 'z'.repeat(64); // z is not a hex digit
      expect(() => encrypt('x')).toThrow('ENCRYPTION_KEY must contain only hexadecimal characters');
    });
  });
});
