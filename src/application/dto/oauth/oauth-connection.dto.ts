import { OAuthProvider } from '@/domain/value-objects/oauth-provider.vo';

// Note: tokens are never exposed in DTOs
export class OAuthConnectionDto {
  id: string;
  userId: string;
  provider: OAuthProvider;
  providerUserId: string;
  scopes: string[];
  tokenExpiresAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}
