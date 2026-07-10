import { ConfigService } from '@nestjs/config';
import {
  GitLabOAuthProvider,
  type GitLabTokenResponse,
  type GitLabUser,
  type GitLabProjectMember,
  GITLAB_ACCESS_LEVEL,
} from './gitlab-oauth.provider';
import { UnrecoverableTokenRefreshError } from '@/domain/services/oauth-token-refresh.error';

const mockFetchResponse = (
  body: unknown,
  options: { ok?: boolean; status?: number; statusText?: string } = {},
): Response => {
  const { ok = true, status = 200, statusText = 'OK' } = options;
  return {
    ok,
    status,
    statusText,
    json: jest.fn().mockResolvedValue(body),
    text: jest
      .fn()
      .mockResolvedValue(
        typeof body === 'string' ? body : JSON.stringify(body),
      ),
  } as unknown as Response;
};

describe('GitLabOAuthProvider', () => {
  let provider: GitLabOAuthProvider;
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    const mockConfigService = {
      getOrThrow: jest.fn((key: string) => {
        const config: Record<string, string> = {
          GITLAB_CLIENT_ID: 'test-client-id',
          GITLAB_CLIENT_SECRET: 'test-client-secret',
          GITLAB_CALLBACK_URL:
            'https://auth.myapp.com/auth/oauth/gitlab/callback',
        };
        const value = config[key];
        if (!value) throw new Error(`Config key ${key} not found`);
        return value;
      }),
    } as unknown as ConfigService;

    provider = new GitLabOAuthProvider(mockConfigService);
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe('buildAuthorizationUrl', () => {
    it('should build a valid GitLab OAuth authorization URL', () => {
      const url = provider.buildAuthorizationUrl('encoded-state-xyz');

      expect(url).toContain('https://gitlab.com/oauth/authorize');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('response_type=code');
      expect(url).toContain('state=encoded-state-xyz');
    });

    it('should include the read_user and read_api scopes', () => {
      const url = provider.buildAuthorizationUrl('state');

      // scopes are URL encoded as "read_user+read_api" or "read_user%20read_api"
      expect(url).toMatch(/scope=read_user[+%20]read_api/);
    });

    it('should include the configured redirect URI', () => {
      const url = provider.buildAuthorizationUrl('state');

      expect(url).toContain(
        encodeURIComponent('https://auth.myapp.com/auth/oauth/gitlab/callback'),
      );
    });

    it('should produce different URLs for different states', () => {
      const url1 = provider.buildAuthorizationUrl('state-user-a');
      const url2 = provider.buildAuthorizationUrl('state-user-b');

      expect(url1).not.toBe(url2);
    });

    it('should not make any HTTP calls', () => {
      provider.buildAuthorizationUrl('state');

      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('exchangeCodeForToken', () => {
    const mockTokenResponse: GitLabTokenResponse = {
      access_token: 'glpat-xxxxxxxxxxxxxxxx',
      refresh_token: null,
      expires_in: null,
      scope: 'read_user read_api',
      token_type: 'Bearer',
    };

    it('should POST to the GitLab token endpoint with correct body', async () => {
      // Arrange
      fetchSpy.mockResolvedValue(mockFetchResponse(mockTokenResponse));

      // Act
      await provider.exchangeCodeForToken('auth-code-123');

      // Assert
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://gitlab.com/oauth/token',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      const callBody = JSON.parse(
        (fetchSpy.mock.calls[0] as [string, RequestInit])[1].body as string,
      ) as Record<string, string>;
      expect(callBody.client_id).toBe('test-client-id');
      expect(callBody.client_secret).toBe('test-client-secret');
      expect(callBody.code).toBe('auth-code-123');
      expect(callBody.grant_type).toBe('authorization_code');
      expect(callBody.redirect_uri).toBe(
        'https://auth.myapp.com/auth/oauth/gitlab/callback',
      );
    });

    it('should return the parsed token response', async () => {
      // Arrange
      fetchSpy.mockResolvedValue(mockFetchResponse(mockTokenResponse));

      // Act
      const result = await provider.exchangeCodeForToken('auth-code-123');

      // Assert
      expect(result).toEqual(mockTokenResponse);
    });

    it('should return token response with refresh_token when provided', async () => {
      // Arrange
      const responseWithRefresh: GitLabTokenResponse = {
        ...mockTokenResponse,
        refresh_token: 'refresh-token-xyz',
        expires_in: 7200,
      };
      fetchSpy.mockResolvedValue(mockFetchResponse(responseWithRefresh));

      // Act
      const result = await provider.exchangeCodeForToken('auth-code-123');

      // Assert
      expect(result.refresh_token).toBe('refresh-token-xyz');
      expect(result.expires_in).toBe(7200);
    });

    it('should throw when GitLab responds with a non-OK status', async () => {
      // Arrange
      fetchSpy.mockResolvedValue(
        mockFetchResponse(
          { error: 'invalid_grant' },
          { ok: false, status: 401, statusText: 'Unauthorized' },
        ),
      );

      // Act and Assert
      await expect(provider.exchangeCodeForToken('bad-code')).rejects.toThrow(
        'GitLab token exchange failed: 401 Unauthorized',
      );
    });

    it('should throw when GitLab responds with 400 Bad Request', async () => {
      // Arrange
      fetchSpy.mockResolvedValue(
        mockFetchResponse(
          { error: 'invalid_client' },
          { ok: false, status: 400, statusText: 'Bad Request' },
        ),
      );

      // Act and Assert
      await expect(
        provider.exchangeCodeForToken('expired-code'),
      ).rejects.toThrow('GitLab token exchange failed: 400 Bad Request');
    });
  });

  describe('getAuthenticatedUser', () => {
    const mockUser: GitLabUser = {
      id: 12345678,
      username: 'aragorn',
      email: 'aragorn@gondor.me',
      name: 'Aragorn, King of Gondor',
    };

    it('should GET /api/v4/user with Bearer token in Authorization header', async () => {
      // Arrange
      fetchSpy.mockResolvedValue(mockFetchResponse(mockUser));

      // Act
      await provider.getAuthenticatedUser('glpat-valid-token');

      // Assert
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://gitlab.com/api/v4/user',
        expect.objectContaining({
          headers: { Authorization: 'Bearer glpat-valid-token' },
        }),
      );
    });

    it('should return the parsed GitLab user', async () => {
      // Arrange
      fetchSpy.mockResolvedValue(mockFetchResponse(mockUser));

      // Act
      const result = await provider.getAuthenticatedUser('glpat-valid-token');

      // Assert
      expect(result.id).toBe(12345678);
      expect(result.username).toBe('aragorn');
      expect(result.email).toBe('aragorn@gondor.me');
    });

    it('should throw when GitLab responds with 401', async () => {
      // Arrange
      fetchSpy.mockResolvedValue(
        mockFetchResponse(
          { message: '401 Unauthorized' },
          { ok: false, status: 401, statusText: 'Unauthorized' },
        ),
      );

      // Act and Assert
      await expect(
        provider.getAuthenticatedUser('glpat-bad-token'),
      ).rejects.toThrow('GitLab user fetch failed: 401 Unauthorized');
    });

    it('should throw when GitLab responds with 403', async () => {
      // Arrange
      fetchSpy.mockResolvedValue(
        mockFetchResponse(
          { message: '403 Forbidden' },
          { ok: false, status: 403, statusText: 'Forbidden' },
        ),
      );

      // Act and Assert
      await expect(
        provider.getAuthenticatedUser('glpat-limited-scope-token'),
      ).rejects.toThrow('GitLab user fetch failed: 403 Forbidden');
    });
  });

  describe('getProjectMember', () => {
    const mockMaintainer: GitLabProjectMember = {
      id: 12345678,
      access_level: GITLAB_ACCESS_LEVEL.MAINTAINER,
    };

    const mockOwner: GitLabProjectMember = {
      id: 99999999,
      access_level: GITLAB_ACCESS_LEVEL.OWNER,
    };

    it('should GET the correct endpoint with the token', async () => {
      // Arrange
      fetchSpy.mockResolvedValue(mockFetchResponse(mockMaintainer));

      // Act
      await provider.getProjectMember('glpat-token', 987654321, 12345678);

      // Assert
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://gitlab.com/api/v4/projects/987654321/members/all/12345678',
        expect.objectContaining({
          headers: { Authorization: 'Bearer glpat-token' },
        }),
      );
    });

    it('should return the member when user is a maintainer (access_level 40)', async () => {
      // Arrange
      fetchSpy.mockResolvedValue(mockFetchResponse(mockMaintainer));

      // Act
      const result = await provider.getProjectMember(
        'glpat-token',
        123,
        12345678,
      );

      // Assert
      expect(result).not.toBeNull();
      expect(result!.access_level).toBe(GITLAB_ACCESS_LEVEL.MAINTAINER);
    });

    it('should return the member when user is an owner (access_level 50)', async () => {
      // Arrange
      fetchSpy.mockResolvedValue(mockFetchResponse(mockOwner));

      // Act
      const result = await provider.getProjectMember(
        'glpat-token',
        123,
        99999999,
      );

      // Assert
      expect(result).not.toBeNull();
      expect(result!.access_level).toBe(GITLAB_ACCESS_LEVEL.OWNER);
    });

    it('should return null when user is not a member of the project (404)', async () => {
      // Arrange
      fetchSpy.mockResolvedValue(
        mockFetchResponse(
          { message: '404 Not found' },
          { ok: false, status: 404, statusText: 'Not Found' },
        ),
      );

      // Act
      const result = await provider.getProjectMember('glpat-token', 123, 99999);

      // Assert
      expect(result).toBeNull();
    });

    it('should throw for non-404 errors', async () => {
      // Arrange
      fetchSpy.mockResolvedValue(
        mockFetchResponse(
          { message: '401 Unauthorized' },
          { ok: false, status: 401, statusText: 'Unauthorized' },
        ),
      );

      // Act and Assert
      await expect(
        provider.getProjectMember('glpat-revoked-token', 123, 456),
      ).rejects.toThrow('GitLab member fetch failed: 401 Unauthorized');
    });

    it('should throw for 403 errors', async () => {
      // Arrange
      fetchSpy.mockResolvedValue(
        mockFetchResponse(
          { message: '403 Forbidden' },
          { ok: false, status: 403, statusText: 'Forbidden' },
        ),
      );

      // Act and Assert
      await expect(
        provider.getProjectMember('glpat-limited-token', 123, 456),
      ).rejects.toThrow('GitLab member fetch failed: 403 Forbidden');
    });

    it('should expose access_level constant values correctly', () => {
      expect(GITLAB_ACCESS_LEVEL.MAINTAINER).toBe(40);
      expect(GITLAB_ACCESS_LEVEL.OWNER).toBe(50);
    });
  });

  describe('refreshAccessToken', () => {
    const mockRefreshResponse: GitLabTokenResponse = {
      access_token: 'glpat-new-access-token',
      refresh_token: 'new-refresh-token',
      expires_in: 7200,
      scope: 'read_user read_api',
      token_type: 'Bearer',
    };

    it('should POST to the GitLab token endpoint with refresh_token grant', async () => {
      // Arrange
      fetchSpy.mockResolvedValue(mockFetchResponse(mockRefreshResponse));

      // Act
      await provider.refreshAccessToken('old-refresh-token');

      // Assert
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://gitlab.com/oauth/token',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      const callBody = JSON.parse(
        (fetchSpy.mock.calls[0] as [string, RequestInit])[1].body as string,
      ) as Record<string, string>;
      expect(callBody.client_id).toBe('test-client-id');
      expect(callBody.client_secret).toBe('test-client-secret');
      expect(callBody.refresh_token).toBe('old-refresh-token');
      expect(callBody.grant_type).toBe('refresh_token');
    });

    it('should return mapped OAuthTokenRefreshResult on success', async () => {
      // Arrange
      fetchSpy.mockResolvedValue(mockFetchResponse(mockRefreshResponse));

      // Act
      const result = await provider.refreshAccessToken('old-refresh-token');

      // Assert
      expect(result).toEqual({
        accessToken: 'glpat-new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 7200,
      });
    });

    it('should handle null refresh_token and expires_in in response', async () => {
      // Arrange
      const responseWithNulls: GitLabTokenResponse = {
        ...mockRefreshResponse,
        refresh_token: null,
        expires_in: null,
      };
      fetchSpy.mockResolvedValue(mockFetchResponse(responseWithNulls));

      // Act
      const result = await provider.refreshAccessToken('old-refresh-token');

      // Assert
      expect(result.refreshToken).toBeNull();
      expect(result.expiresIn).toBeNull();
    });

    it('should throw UnrecoverableTokenRefreshError on 401 invalid_grant', async () => {
      // Arrange
      fetchSpy.mockResolvedValue(
        mockFetchResponse(
          { error: 'invalid_grant' },
          { ok: false, status: 401, statusText: 'Unauthorized' },
        ),
      );

      // Act and Assert: revoked refresh token is unrecoverable
      await expect(
        provider.refreshAccessToken('revoked-refresh-token'),
      ).rejects.toThrow(UnrecoverableTokenRefreshError);
      await expect(
        provider.refreshAccessToken('revoked-refresh-token'),
      ).rejects.toThrow('GitLab token refresh failed: 401 Unauthorized');
    });

    it('should throw UnrecoverableTokenRefreshError on 400 invalid_grant', async () => {
      // Arrange
      fetchSpy.mockResolvedValue(
        mockFetchResponse(
          { error: 'invalid_grant' },
          { ok: false, status: 400, statusText: 'Bad Request' },
        ),
      );

      // Act and Assert: consumed/expired refresh token is unrecoverable
      await expect(
        provider.refreshAccessToken('expired-refresh-token'),
      ).rejects.toThrow(UnrecoverableTokenRefreshError);
      await expect(
        provider.refreshAccessToken('expired-refresh-token'),
      ).rejects.toThrow('invalid_grant');
    });

    it('should throw a transient (non-unrecoverable) error on 5xx', async () => {
      // Arrange: a server-side blip must NOT be treated as unrecoverable
      fetchSpy.mockResolvedValue(
        mockFetchResponse(
          { error: 'server_error' },
          { ok: false, status: 503, statusText: 'Service Unavailable' },
        ),
      );

      // Act and Assert
      const error = await provider
        .refreshAccessToken('still-valid-refresh-token')
        .catch((e: unknown) => e);
      expect(error).toBeInstanceOf(Error);
      expect(error).not.toBeInstanceOf(UnrecoverableTokenRefreshError);
      expect((error as Error).message).toContain(
        'GitLab token refresh failed: 503 Service Unavailable',
      );
    });

    it('should throw when a network failure occurs', async () => {
      // Arrange
      fetchSpy.mockRejectedValue(new TypeError('fetch failed'));

      // Act and Assert
      await expect(
        provider.refreshAccessToken('any-refresh-token'),
      ).rejects.toThrow('fetch failed');
    });
  });
});
