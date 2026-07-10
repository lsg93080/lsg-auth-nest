import { GetGitLabAuthorizationUrlUseCase } from './get-gitlab-authorization-url.use-case';
import { GitLabOAuthProvider } from '@/infrastructure/oauth/gitlab/gitlab-oauth.provider';
import { ConfigService } from '@nestjs/config';
import { decodeOAuthState } from '@/application/utils/oauth-state.util';

const TEST_HMAC_KEY = 'test-hmac-secret-key-for-unit-tests';

describe('GetGitLabAuthorizationUrlUseCase', () => {
  let useCase: GetGitLabAuthorizationUrlUseCase;
  let mockGitLabOAuthProvider: jest.Mocked<
    Pick<GitLabOAuthProvider, 'buildAuthorizationUrl'>
  >;
  let mockConfigService: { get: jest.Mock };

  beforeEach(() => {
    mockGitLabOAuthProvider = {
      buildAuthorizationUrl: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn().mockReturnValue(TEST_HMAC_KEY),
    };

    useCase = new GetGitLabAuthorizationUrlUseCase(
      mockGitLabOAuthProvider as unknown as GitLabOAuthProvider,
      mockConfigService as unknown as ConfigService,
    );
  });

  describe('execute', () => {
    it('should return the authorization URL from the provider', () => {
      // Arrange
      const expectedUrl =
        'https://gitlab.com/oauth/authorize?client_id=abc&state=xyz';
      mockGitLabOAuthProvider.buildAuthorizationUrl.mockReturnValue(
        expectedUrl,
      );

      // Act
      const result = useCase.execute({
        userId: '550e8400-e29b-41d4-a716-446655440000',
        redirectUrl: 'https://vitrina.app/callback',
      });

      // Assert
      expect(result.authorizationUrl).toBe(expectedUrl);
    });

    it('should call buildAuthorizationUrl with a valid encoded state', () => {
      // Arrange
      mockGitLabOAuthProvider.buildAuthorizationUrl.mockReturnValue(
        'https://gitlab.com/...',
      );
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const redirectUrl = 'https://vitrina.app/callback';

      // Act
      useCase.execute({ userId, redirectUrl });

      // Assert
      const stateArg =
        mockGitLabOAuthProvider.buildAuthorizationUrl.mock.calls[0][0];
      const decodedState = decodeOAuthState(stateArg, TEST_HMAC_KEY);
      expect(decodedState.userId).toBe(userId);
      expect(decodedState.redirectUrl).toBe(redirectUrl);
    });

    it('should encode different states for different users', () => {
      // Arrange
      mockGitLabOAuthProvider.buildAuthorizationUrl.mockReturnValue(
        'https://gitlab.com/...',
      );

      // Act
      useCase.execute({
        userId: 'user-a',
        redirectUrl: 'https://vitrina.app/callback',
      });
      useCase.execute({
        userId: 'user-b',
        redirectUrl: 'https://vitrina.app/callback',
      });

      // Assert
      const stateA =
        mockGitLabOAuthProvider.buildAuthorizationUrl.mock.calls[0][0];
      const stateB =
        mockGitLabOAuthProvider.buildAuthorizationUrl.mock.calls[1][0];
      expect(stateA).not.toBe(stateB);
    });
  });
});
