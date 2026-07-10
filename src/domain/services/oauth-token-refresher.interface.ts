import { OAuthProvider } from '@/domain/value-objects/oauth-provider.vo';

export interface OAuthTokenRefreshResult {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number | null;
}

export interface IOAuthTokenRefresher {
  refreshAccessToken(refreshToken: string): Promise<OAuthTokenRefreshResult>;
}

// Resolves the token refresher for a given OAuth provider (GitLab vs GitHub).
export interface IOAuthTokenRefresherRegistry {
  getRefresher(provider: OAuthProvider): IOAuthTokenRefresher;
}

export const OAUTH_TOKEN_REFRESHER_REGISTRY = Symbol(
  'OAUTH_TOKEN_REFRESHER_REGISTRY',
);
