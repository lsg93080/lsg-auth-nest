import { OAuthProvider } from '../value-objects/oauth-provider.vo';

export class OAuthConnectionEntity {
  constructor(
    public readonly id: string | null,
    public readonly userId: string,
    public readonly provider: OAuthProvider,
    public readonly providerUserId: string,
    public readonly accessToken: string,
    public readonly refreshToken: string | null,
    public readonly tokenExpiresAt: Date | null,
    public readonly scopes: string[],
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
  ) {}

  isExpired(): boolean {
    if (!this.tokenExpiresAt) return false;
    return new Date() > this.tokenExpiresAt;
  }

  isNewEntity(): boolean {
    return this.createdAt === undefined;
  }

  withUpdatedTokens(
    accessToken: string,
    refreshToken: string | null,
    tokenExpiresAt: Date | null,
  ): OAuthConnectionEntity {
    return new OAuthConnectionEntity(
      this.id,
      this.userId,
      this.provider,
      this.providerUserId,
      accessToken,
      refreshToken,
      tokenExpiresAt,
      this.scopes,
      this.createdAt,
      this.updatedAt,
    );
  }

  static create(
    id: string,
    userId: string,
    provider: OAuthProvider,
    providerUserId: string,
    accessToken: string,
    refreshToken: string | null,
    tokenExpiresAt: Date | null,
    scopes: string[],
  ): OAuthConnectionEntity {
    return new OAuthConnectionEntity(
      id,
      userId,
      provider,
      providerUserId,
      accessToken,
      refreshToken,
      tokenExpiresAt,
      scopes,
    );
  }
}
