import { Injectable } from '@nestjs/common';
import {
  type IOAuthTokenRefresher,
  type IOAuthTokenRefresherRegistry,
} from '@/domain/services/oauth-token-refresher.interface';
import { OAuthProvider } from '@/domain/value-objects/oauth-provider.vo';
import { GitLabOAuthProvider } from './gitlab/gitlab-oauth.provider';
import { GitHubOAuthProvider } from './github/github-oauth.provider';

// Maps each OAuth provider to its own token refresher (GitLab vs GitHub).
@Injectable()
export class OAuthTokenRefresherRegistry implements IOAuthTokenRefresherRegistry {
  private readonly refreshers: Record<OAuthProvider, IOAuthTokenRefresher>;

  constructor(
    gitLabOAuthProvider: GitLabOAuthProvider,
    gitHubOAuthProvider: GitHubOAuthProvider,
  ) {
    this.refreshers = {
      [OAuthProvider.GITLAB]: gitLabOAuthProvider,
      [OAuthProvider.GITHUB]: gitHubOAuthProvider,
    };
  }

  getRefresher(provider: OAuthProvider): IOAuthTokenRefresher {
    return this.refreshers[provider];
  }
}
