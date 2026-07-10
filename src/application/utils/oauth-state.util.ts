import { createHmac } from 'crypto';

export interface OAuthState {
  userId: string;
  redirectUrl: string;
}

// Internal payload includes a timestamp for expiry validation
interface OAuthStatePayload extends OAuthState {
  iat: number;
}

// Maximum age for a valid OAuth state (10 minutes)
const MAX_STATE_AGE_MS = 10 * 60 * 1000;

// Signs the OAuth state with HMAC-SHA256: base64url(JSON), a dot, then the hmac signature
export function encodeOAuthState(state: OAuthState, hmacKey: string): string {
  const payload: OAuthStatePayload = {
    ...state,
    iat: Date.now(),
  };

  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', hmacKey)
    .update(data)
    .digest('base64url');

  return `${data}.${signature}`;
}

// Decodes and verifies an HMAC-signed OAuth state; rejects tampered or expired states.
export function decodeOAuthState(encoded: string, hmacKey: string): OAuthState {
  const dotIndex = encoded.indexOf('.');
  if (dotIndex === -1) {
    throw new Error('Invalid OAuth state format');
  }

  const data = encoded.substring(0, dotIndex);
  const signature = encoded.substring(dotIndex + 1);

  // Verify HMAC signature
  const expectedSignature = createHmac('sha256', hmacKey)
    .update(data)
    .digest('base64url');

  if (signature !== expectedSignature) {
    throw new Error('Invalid OAuth state signature');
  }

  // Parse payload
  let payload: OAuthStatePayload;
  try {
    const decoded = Buffer.from(data, 'base64url').toString('utf8');
    payload = JSON.parse(decoded) as OAuthStatePayload;
  } catch {
    throw new Error('Invalid OAuth state payload');
  }

  // Validate timestamp: reject states older than 10 minutes
  const age = Date.now() - payload.iat;
  if (!payload.iat || age > MAX_STATE_AGE_MS || age < 0) {
    throw new Error('OAuth state has expired');
  }

  return {
    userId: payload.userId,
    redirectUrl: payload.redirectUrl,
  };
}
