import { encodeOAuthState, decodeOAuthState } from './oauth-state.util';
import type { OAuthState } from './oauth-state.util';

describe('OAuthState util', () => {
  const hmacKey = 'test-hmac-secret-key-for-unit-tests';

  const validState: OAuthState = {
    userId: '550e8400-e29b-41d4-a716-446655440000',
    redirectUrl: 'https://vitrina.app/oauth/callback',
  };

  describe('encodeOAuthState', () => {
    it('should return a non-empty string', () => {
      const result = encodeOAuthState(validState, hmacKey);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('should produce a valid base64url string (no +, /, or = characters)', () => {
      const result = encodeOAuthState(validState, hmacKey);
      expect(result).not.toMatch(/[+/=]/);
    });

    it('should produce different outputs for different inputs', () => {
      const stateA = encodeOAuthState(
        {
          userId: 'user-a',
          redirectUrl: 'https://a.com',
        },
        hmacKey,
      );
      const stateB = encodeOAuthState(
        {
          userId: 'user-b',
          redirectUrl: 'https://b.com',
        },
        hmacKey,
      );
      expect(stateA).not.toBe(stateB);
    });
  });

  describe('decodeOAuthState', () => {
    it('should recover the original state after encode then decode', () => {
      const encoded = encodeOAuthState(validState, hmacKey);
      const decoded = decodeOAuthState(encoded, hmacKey);
      expect(decoded).toEqual(validState);
    });

    it('should recover userId correctly', () => {
      const encoded = encodeOAuthState(validState, hmacKey);
      const decoded = decodeOAuthState(encoded, hmacKey);
      expect(decoded.userId).toBe(validState.userId);
    });

    it('should recover redirectUrl correctly', () => {
      const encoded = encodeOAuthState(validState, hmacKey);
      const decoded = decodeOAuthState(encoded, hmacKey);
      expect(decoded.redirectUrl).toBe(validState.redirectUrl);
    });

    it('should throw when encoded string is not valid base64url JSON', () => {
      expect(() => decodeOAuthState('not-valid-base64url', hmacKey)).toThrow();
    });

    it('should throw when encoded string is empty', () => {
      expect(() => decodeOAuthState('', hmacKey)).toThrow();
    });

    it('should throw when signature is invalid (tampered data)', () => {
      const encoded = encodeOAuthState(validState, hmacKey);
      const tampered = encoded.replace(/.$/, 'X'); // alter last char
      expect(() => decodeOAuthState(tampered, hmacKey)).toThrow();
    });

    it('should throw when decoded with a different key', () => {
      const encoded = encodeOAuthState(validState, hmacKey);
      expect(() => decodeOAuthState(encoded, 'wrong-key')).toThrow(
        'Invalid OAuth state signature',
      );
    });

    it('should handle redirectUrls with special characters', () => {
      const stateWithComplexUrl: OAuthState = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        redirectUrl: 'https://vitrina.app/callback?foo=bar&baz=qux',
      };
      const encoded = encodeOAuthState(stateWithComplexUrl, hmacKey);
      const decoded = decodeOAuthState(encoded, hmacKey);
      expect(decoded.redirectUrl).toBe(stateWithComplexUrl.redirectUrl);
    });
  });
});
