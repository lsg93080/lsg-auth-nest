import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  OAUTH_CONNECTION_REPOSITORY,
  type IOAuthConnectionRepository,
} from '@/domain/repositories/oauth-connection.repository.interface';
import {
  ENCRYPTION_SERVICE,
  type IEncryptionService,
} from '@/domain/services/encryption.service.interface';
import {
  OAUTH_TOKEN_REFRESHER_REGISTRY,
  type IOAuthTokenRefresherRegistry,
} from '@/domain/services/oauth-token-refresher.interface';
import { UnrecoverableTokenRefreshError } from '@/domain/services/oauth-token-refresh.error';
import { ReconnectRequiredException } from '@/presentation/http/exceptions/reconnect-required.exception';
import { OAuthConnectionEntity } from '@/domain/entities/oauth-connection.entity';
import { OAuthProvider } from '@/domain/value-objects/oauth-provider.vo';

export interface GetOAuthTokenInput {
  userId: string;
  provider: OAuthProvider;
}

export interface GetOAuthTokenOutput {
  accessToken: string;
  provider: OAuthProvider;
  providerUserId: string;
}

@Injectable()
export class GetOAuthTokenUseCase {
  constructor(
    @Inject(OAUTH_CONNECTION_REPOSITORY)
    private oAuthConnectionRepository: IOAuthConnectionRepository,
    @Inject(ENCRYPTION_SERVICE)
    private encryptionService: IEncryptionService,
    @Inject(OAUTH_TOKEN_REFRESHER_REGISTRY)
    private oAuthTokenRefresherRegistry: IOAuthTokenRefresherRegistry,
  ) {}

  async execute(input: GetOAuthTokenInput): Promise<GetOAuthTokenOutput> {
    const connection =
      await this.oAuthConnectionRepository.findByUserAndProvider(
        input.userId,
        input.provider,
      );

    if (!connection) {
      throw new NotFoundException(
        `No ${input.provider} connection found for this user.`,
      );
    }

    if (connection.isExpired()) {
      // Expired with no refresh token: unrecoverable. Delete and ask to reconnect.
      if (!connection.refreshToken) {
        await this.deleteConnection(connection);
        throw new ReconnectRequiredException(connection.provider);
      }

      const decryptedRefreshToken = this.encryptionService.decrypt(
        connection.refreshToken,
      );

      // Refresh against the provider that owns this connection (GitLab vs GitHub).
      const refresher = this.oAuthTokenRefresherRegistry.getRefresher(
        connection.provider,
      );

      let refreshResult;
      try {
        refreshResult = await refresher.refreshAccessToken(
          decryptedRefreshToken,
        );
      } catch (err) {
        // Unrecoverable (invalid_grant, etc.) deletes and signals reconnect; transient errors just propagate.
        if (err instanceof UnrecoverableTokenRefreshError) {
          await this.deleteConnection(connection);
          throw new ReconnectRequiredException(connection.provider);
        }
        throw err;
      }

      const encryptedAccessToken = this.encryptionService.encrypt(
        refreshResult.accessToken,
      );
      const encryptedRefreshToken = refreshResult.refreshToken
        ? this.encryptionService.encrypt(refreshResult.refreshToken)
        : connection.refreshToken;

      const tokenExpiresAt = refreshResult.expiresIn
        ? new Date(Date.now() + refreshResult.expiresIn * 1000)
        : connection.tokenExpiresAt;

      const updatedConnection = connection.withUpdatedTokens(
        encryptedAccessToken,
        encryptedRefreshToken,
        tokenExpiresAt,
      );

      await this.oAuthConnectionRepository.save(updatedConnection);

      return {
        accessToken: refreshResult.accessToken,
        provider: connection.provider,
        providerUserId: connection.providerUserId,
      };
    }

    const accessToken = this.encryptionService.decrypt(connection.accessToken);

    return {
      accessToken,
      provider: connection.provider,
      providerUserId: connection.providerUserId,
    };
  }

  // Removes a dead connection; a no-op if it was never persisted.
  private async deleteConnection(
    connection: OAuthConnectionEntity,
  ): Promise<void> {
    if (!connection.id) return;
    await this.oAuthConnectionRepository.deleteConnection(
      connection.id,
      connection.userId,
    );
  }
}
