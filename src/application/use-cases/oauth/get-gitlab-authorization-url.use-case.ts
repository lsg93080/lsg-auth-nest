import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GitLabOAuthProvider } from '@/infrastructure/oauth/gitlab/gitlab-oauth.provider';
import { encodeOAuthState } from '@/application/utils/oauth-state.util';

export interface GetGitLabAuthorizationUrlInput {
  userId: string;
  redirectUrl: string;
}

export interface GetGitLabAuthorizationUrlOutput {
  authorizationUrl: string;
}

@Injectable()
export class GetGitLabAuthorizationUrlUseCase {
  private readonly hmacKey: string;

  constructor(
    private gitLabOAuthProvider: GitLabOAuthProvider,
    configService: ConfigService,
  ) {
    this.hmacKey = configService.get<string>('ENCRYPTION_KEY')!;
  }

  execute(
    input: GetGitLabAuthorizationUrlInput,
  ): GetGitLabAuthorizationUrlOutput {
    const state = encodeOAuthState(
      {
        userId: input.userId,
        redirectUrl: input.redirectUrl,
      },
      this.hmacKey,
    );

    const authorizationUrl =
      this.gitLabOAuthProvider.buildAuthorizationUrl(state);

    return { authorizationUrl };
  }
}
