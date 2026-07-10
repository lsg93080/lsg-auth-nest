import { EncryptionService } from './encryption.service';
import { ConfigService } from '@nestjs/config';

// Valid 64-char hex key (32 bytes) for testing
const VALID_KEY = 'a'.repeat(64);

const createService = (key: string | undefined): EncryptionService => {
  const mockConfigService = {
    get: jest.fn().mockReturnValue(key),
  } as unknown as ConfigService;

  return new EncryptionService(mockConfigService);
};

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(() => {
    service = createService(VALID_KEY);
  });

  describe('constructor', () => {
    it('should throw when ENCRYPTION_KEY is not defined', () => {
      expect(() => createService(undefined)).toThrow(
        'ENCRYPTION_KEY is not defined in environment variables',
      );
    });

    it('should throw when ENCRYPTION_KEY is not 64 hex characters', () => {
      expect(() => createService('tooshort')).toThrow(
        'ENCRYPTION_KEY must be 64 hex characters (32 bytes for AES-256)',
      );
    });

    it('should instantiate correctly with a valid key', () => {
      expect(() => createService(VALID_KEY)).not.toThrow();
    });
  });

  describe('encrypt', () => {
    it('should return a non-empty string', () => {
      const result = service.encrypt('my-secret-token');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('should return a string with the iv:authTag:encrypted format', () => {
      const result = service.encrypt('my-secret-token');
      const parts = result.split(':');
      expect(parts).toHaveLength(3);
    });

    it('should produce different ciphertexts for the same input (random IV)', () => {
      const token = 'same-input-token';
      const first = service.encrypt(token);
      const second = service.encrypt(token);
      // Different IV each time means different ciphertext
      expect(first).not.toBe(second);
    });
  });

  describe('decrypt', () => {
    it('should recover the original plaintext after encrypt then decrypt', () => {
      const original = 'glpat-supersecret-gitlab-token';
      const encrypted = service.encrypt(original);
      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    it('should handle tokens with special characters', () => {
      const original = 'ghp_abc123!@#$%^&*()_+-=';
      const encrypted = service.encrypt(original);
      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    it('should throw when ciphertext format is invalid', () => {
      expect(() => service.decrypt('not-valid-format')).toThrow(
        'Invalid cipher text format',
      );
    });

    it('should throw when ciphertext has been tampered with (auth tag mismatch)', () => {
      const encrypted = service.encrypt('original-token');
      // Tamper with the encrypted data portion
      const parts = encrypted.split(':');
      parts[2] = 'ff'.repeat(parts[2].length / 2);
      const tampered = parts.join(':');

      expect(() => service.decrypt(tampered)).toThrow();
    });
  });
});
