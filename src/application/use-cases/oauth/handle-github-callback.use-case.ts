import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GitHubOAuthProvider } from '@/infrastructure/oauth/github/github-oauth.provider';
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

export interface HandleGitHubCallbackInput {
  code: string;
  state: string;
}

export interface HandleGitHubCallbackOutput {
  redirectUrl: string;
  isNewConnection: boolean;
}

@Injectable()
export class HandleGitHubCallbackUseCase {
  private readonly hmacKey: string;

  constructor(
    private gitHubOAuthProvider: GitHubOAuthProvider,
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
    input: HandleGitHubCallbackInput,
  ): Promise<HandleGitHubCallbackOutput> {
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
    const tokenResponse = await this.gitHubOAuthProvider.exchangeCodeForToken(
      input.code,
    );

    // 3: Fetch authenticated GitHub user to get their provider ID
    const gitHubUser = await this.gitHubOAuthProvider.getAuthenticatedUser(
      tokenResponse.access_token,
    );

    // 4: Encrypt access token before persisting (GitHub tokens do not expire, no refresh token)
    const encryptedAccessToken = this.encryptionService.encrypt(
      tokenResponse.access_token,
    );

    const scopes = tokenResponse.scope ? tokenResponse.scope.split(',') : [];

    // 5: Check if connection already exists (re-authorization)
    const existing = await this.oAuthConnectionRepository.findByUserAndProvider(
      userId,
      OAuthProvider.GITHUB,
    );

    let isNewConnection: boolean;

    if (existing) {
      // Update tokens on existing connection
      const updated = existing.withUpdatedTokens(
        encryptedAccessToken,
        null,
        null,
      );
      await this.oAuthConnectionRepository.save(updated);
      isNewConnection = false;
    } else {
      // Create new connection
      const newConnection = OAuthConnectionEntity.create(
        this.idGenerator.generate(),
        userId,
        OAuthProvider.GITHUB,
        String(gitHubUser.id),
        encryptedAccessToken,
        null,
        null,
        scopes,
      );
      await this.oAuthConnectionRepository.save(newConnection);
      isNewConnection = true;
    }

    return { redirectUrl, isNewConnection };
  }
}
