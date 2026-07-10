import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GitHubOAuthProvider } from '@/infrastructure/oauth/github/github-oauth.provider';
import { encodeOAuthState } from '@/application/utils/oauth-state.util';

export interface GetGitHubAuthorizationUrlInput {
  userId: string;
  redirectUrl: string;
}

export interface GetGitHubAuthorizationUrlOutput {
  authorizationUrl: string;
}

@Injectable()
export class GetGitHubAuthorizationUrlUseCase {
  private readonly hmacKey: string;

  constructor(
    private gitHubOAuthProvider: GitHubOAuthProvider,
    configService: ConfigService,
  ) {
    this.hmacKey = configService.get<string>('ENCRYPTION_KEY')!;
  }

  execute(
    input: GetGitHubAuthorizationUrlInput,
  ): GetGitHubAuthorizationUrlOutput {
    const state = encodeOAuthState(
      {
        userId: input.userId,
        redirectUrl: input.redirectUrl,
      },
      this.hmacKey,
    );

    const authorizationUrl =
      this.gitHubOAuthProvider.buildAuthorizationUrl(state);

    return { authorizationUrl };
  }
}
