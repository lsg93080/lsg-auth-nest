import { Module } from '@nestjs/common';
import { GitLabOAuthProvider } from './gitlab/gitlab-oauth.provider';
import { GitHubOAuthProvider } from './github/github-oauth.provider';
import { OAuthTokenRefresherRegistry } from './oauth-token-refresher.registry';
import { OAUTH_TOKEN_REFRESHER_REGISTRY } from '@/domain/services/oauth-token-refresher.interface';

@Module({
  providers: [
    GitLabOAuthProvider,
    GitHubOAuthProvider,
    {
      provide: OAUTH_TOKEN_REFRESHER_REGISTRY,
      useClass: OAuthTokenRefresherRegistry,
    },
  ],
  exports: [
    GitLabOAuthProvider,
    GitHubOAuthProvider,
    OAUTH_TOKEN_REFRESHER_REGISTRY,
  ],
})
export class OAuthProvidersModule {}
