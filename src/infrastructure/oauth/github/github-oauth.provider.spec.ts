import { ConfigService } from '@nestjs/config';
import { GitHubOAuthProvider } from './github-oauth.provider';
import { UnrecoverableTokenRefreshError } from '@/domain/services/oauth-token-refresh.error';

describe('GitHubOAuthProvider', () => {
  let provider: GitHubOAuthProvider;

  beforeEach(() => {
    const mockConfigService = {
      getOrThrow: jest.fn((key: string) => {
        const config: Record<string, string> = {
          GITHUB_CLIENT_ID: 'test-client-id',
          GITHUB_CLIENT_SECRET: 'test-client-secret',
          GITHUB_CALLBACK_URL:
            'https://auth.myapp.com/auth/oauth/github/callback',
        };
        const value = config[key];
        if (!value) throw new Error(`Config key ${key} not found`);
        return value;
      }),
    } as unknown as ConfigService;

    provider = new GitHubOAuthProvider(mockConfigService);
  });

  describe('refreshAccessToken', () => {
    it('should reject with UnrecoverableTokenRefreshError (tokens cannot be refreshed)', async () => {
      await expect(
        provider.refreshAccessToken('any-refresh-token'),
      ).rejects.toThrow(UnrecoverableTokenRefreshError);

      await expect(
        provider.refreshAccessToken('any-refresh-token'),
      ).rejects.toThrow('do not support refresh');
    });

    it('should not perform any network call', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch');

      await provider.refreshAccessToken('any-refresh-token').catch(() => null);

      expect(fetchSpy).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
    });
  });
});
