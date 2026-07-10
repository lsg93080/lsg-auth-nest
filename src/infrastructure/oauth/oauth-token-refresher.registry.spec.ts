import { OAuthTokenRefresherRegistry } from './oauth-token-refresher.registry';
import { OAuthProvider } from '@/domain/value-objects/oauth-provider.vo';
import type { GitLabOAuthProvider } from './gitlab/gitlab-oauth.provider';
import type { GitHubOAuthProvider } from './github/github-oauth.provider';

describe('OAuthTokenRefresherRegistry', () => {
  let registry: OAuthTokenRefresherRegistry;
  let gitLabProvider: GitLabOAuthProvider;
  let gitHubProvider: GitHubOAuthProvider;

  beforeEach(() => {
    gitLabProvider = {
      refreshAccessToken: jest.fn(),
    } as unknown as GitLabOAuthProvider;
    gitHubProvider = {
      refreshAccessToken: jest.fn(),
    } as unknown as GitHubOAuthProvider;

    registry = new OAuthTokenRefresherRegistry(gitLabProvider, gitHubProvider);
  });

  it('should return the GitLab provider for the gitlab provider', () => {
    expect(registry.getRefresher(OAuthProvider.GITLAB)).toBe(gitLabProvider);
  });

  it('should return the GitHub provider for the github provider', () => {
    expect(registry.getRefresher(OAuthProvider.GITHUB)).toBe(gitHubProvider);
  });
});
