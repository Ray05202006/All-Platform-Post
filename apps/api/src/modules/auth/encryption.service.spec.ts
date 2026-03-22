import { EncryptionService } from '../../common/services/encryption.service';

const VALID_KEY = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';

function makeService(key: string): EncryptionService {
  const configService = { get: jest.fn().mockReturnValue(key) } as any;
  return new EncryptionService(configService);
}

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(() => {
    service = makeService(VALID_KEY);
  });

  describe('encrypt/decrypt round-trip', () => {
    it('should encrypt and decrypt a simple string', () => {
      const plaintext = 'hello world';
      expect(service.decrypt(service.encrypt(plaintext))).toBe(plaintext);
    });

    it('should encrypt and decrypt an OAuth token', () => {
      const token = 'EAABwzLixnjYBALong_oauth_token_123456789';
      expect(service.decrypt(service.encrypt(token))).toBe(token);
    });

    it('should encrypt and decrypt special characters', () => {
      const special = '!@#$%^&*()_+-=[]{}|;\':",.<>?/`~';
      expect(service.decrypt(service.encrypt(special))).toBe(special);
    });

    it('should produce different ciphertext for the same input (random IV)', () => {
      const plaintext = 'same input';
      const enc1 = service.encrypt(plaintext);
      const enc2 = service.encrypt(plaintext);
      expect(enc1).not.toBe(enc2);
    });

    it('encrypted output should be in iv:authTag:ciphertext format', () => {
      const encrypted = service.encrypt('test');
      const parts = encrypted.split(':');
      expect(parts).toHaveLength(3);
      // iv = 16 bytes = 32 hex chars
      expect(parts[0]).toHaveLength(32);
      // authTag = 16 bytes = 32 hex chars
      expect(parts[1]).toHaveLength(32);
    });
  });

  describe('decrypt - error cases', () => {
    it('should throw on invalid format (no colons)', () => {
      expect(() => service.decrypt('invalid')).toThrow('Invalid encrypted data format');
    });

    it('should throw on corrupted auth tag', () => {
      const encrypted = service.encrypt('secret');
      const parts = encrypted.split(':');
      // corrupt the auth tag
      parts[1] = '0'.repeat(32);
      expect(() => service.decrypt(parts.join(':'))).toThrow();
    });

    it('should throw on corrupted ciphertext', () => {
      const encrypted = service.encrypt('secret');
      const parts = encrypted.split(':');
      // corrupt the ciphertext
      parts[2] = '00' + parts[2].slice(2);
      expect(() => service.decrypt(parts.join(':'))).toThrow();
    });

    it('should throw when decrypting with a wrong key', () => {
      const ciphertext = service.encrypt('top secret');
      const wrongKey = 'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3';
      const wrongKeyService = makeService(wrongKey);
      expect(() => wrongKeyService.decrypt(ciphertext)).toThrow();
    });
  });

  describe('constructor validation', () => {
    it('should throw when ENCRYPTION_KEY is missing', () => {
      const configService = { get: jest.fn().mockReturnValue(undefined) } as any;
      expect(() => new EncryptionService(configService)).toThrow('ENCRYPTION_KEY');
    });

    it('should throw when ENCRYPTION_KEY is not 64 characters', () => {
      const configService = { get: jest.fn().mockReturnValue('abc123') } as any;
      expect(() => new EncryptionService(configService)).toThrow();
    });

    it('should throw when ENCRYPTION_KEY contains non-hex characters', () => {
      const configService = { get: jest.fn().mockReturnValue('z'.repeat(64)) } as any;
      expect(() => new EncryptionService(configService)).toThrow();
    });
  });
});
