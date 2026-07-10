import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GitLabOAuthProvider } from '@/infrastructure/oauth/gitlab/gitlab-oauth.provider';
import {
  OAUTH_CONNECTION_REPOSITORY,
  type IOAuthConnectionRepository,
} from '@/domain/repositories/oauth-connection.repository.interface';
import {
  ENCRYPTION_SERVICE,
  type IEncryptionService,
} from '@/domain/services/encryption.service.interface';
import {
  ID_GENERATOR,
  type IIdGenerator,
} from '@/domain/services/id-generator.interface';
import { OAuthConnectionEntity } from '@/domain/entities/oauth-connection.entity';
import { OAuthProvider } from '@/domain/value-objects/oauth-provider.vo';
import { decodeOAuthState } from '@/application/utils/oauth-state.util';

export interface HandleGitLabCallbackInput {
  code: string;
  state: string;
}

export interface HandleGitLabCallbackOutput {
  redirectUrl: string;
  isNewConnection: boolean;
}

@Injectable()
export class HandleGitLabCallbackUseCase {
  private readonly hmacKey: string;

  constructor(
    private gitLabOAuthProvider: GitLabOAuthProvider,
    @Inject(OAUTH_CONNECTION_REPOSITORY)
    private oAuthConnectionRepository: IOAuthConnectionRepository,
    @Inject(ENCRYPTION_SERVICE)
    private encryptionService: IEncryptionService,
    @Inject(ID_GENERATOR)
    private idGenerator: IIdGenerator,
    configService: ConfigService,
  ) {
    this.hmacKey = configService.get<string>('ENCRYPTION_KEY')!;
  }

  async execute(
    input: HandleGitLabCallbackInput,
  ): Promise<HandleGitLabCallbackOutput> {
    // 1: Decode and verify state (HMAC and expiry)
    let userId: string;
    let redirectUrl: string;

    try {
      const state = decodeOAuthState(input.state, this.hmacKey);
      userId = state.userId;
      redirectUrl = state.redirectUrl;
    } catch {
      throw new BadRequestException('Invalid OAuth state parameter');
    }

    // 2: Exchange authorization code for access token
    const tokenResponse = await this.gitLabOAuthProvider.exchangeCodeForToken(
      input.code,
    );

    // 3: Fetch authenticated GitLab user to get their provider ID
    const gitLabUser = await this.gitLabOAuthProvider.getAuthenticatedUser(
      tokenResponse.access_token,
    );

    // 4: Encrypt tokens before persisting
    const encryptedAccessToken = this.encryptionService.encrypt(
      tokenResponse.access_token,
    );
    const encryptedRefreshToken = tokenResponse.refresh_token
      ? this.encryptionService.encrypt(tokenResponse.refresh_token)
      : null;

    const tokenExpiresAt = tokenResponse.expires_in
      ? new Date(Date.now() + tokenResponse.expires_in * 1000)
      : null;

    const scopes = tokenResponse.scope.split(' ');

    // 5: Check if connection already exists (re-authorization)
    const existing = await this.oAuthConnectionRepository.findByUserAndProvider(
      userId,
      OAuthProvider.GITLAB,
    );

    let isNewConnection: boolean;

    if (existing) {
      // Update tokens on existing connection
      const updated = existing.withUpdatedTokens(
        encryptedAccessToken,
        encryptedRefreshToken,
        tokenExpiresAt,
      );
      await this.oAuthConnectionRepository.save(updated);
      isNewConnection = false;
    } else {
      // Create new connection
      const newConnection = OAuthConnectionEntity.create(
        this.idGenerator.generate(),
        userId,
        OAuthProvider.GITLAB,
        String(gitLabUser.id),
        encryptedAccessToken,
        encryptedRefreshToken,
        tokenExpiresAt,
        scopes,
      );
      await this.oAuthConnectionRepository.save(newConnection);
      isNewConnection = true;
    }

    return { redirectUrl, isNewConnection };
  }
}
