import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OAuthController } from './oauth.controller';
import { GetGitLabAuthorizationUrlUseCase } from '@/application/use-cases/oauth/get-gitlab-authorization-url.use-case';
import { HandleGitLabCallbackUseCase } from '@/application/use-cases/oauth/handle-gitlab-callback.use-case';
import { GetGitHubAuthorizationUrlUseCase } from '@/application/use-cases/oauth/get-github-authorization-url.use-case';
import { HandleGitHubCallbackUseCase } from '@/application/use-cases/oauth/handle-github-callback.use-case';
import { GetOAuthConnectionsUseCase } from '@/application/use-cases/oauth/get-oauth-connections.use-case';
import { VerifyGitLabRepoOwnershipUseCase } from '@/application/use-cases/oauth/verify-gitlab-repo-ownership.use-case';
import { DeleteOAuthConnectionUseCase } from '@/application/use-cases/oauth/delete-oauth-connection.use-case';
import {
  BadRequestException,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { Role } from '@/domain/value-objects/role.vo';
import { OAuthProvider } from '@/domain/value-objects/oauth-provider.vo';
import type { CurrentUserData } from '../types/authenticated-request.interface';
import { encodeOAuthState } from '@/application/utils/oauth-state.util';

const TEST_HMAC_KEY = 'test-hmac-secret-key-for-unit-tests';

describe('OAuthController', () => {
  let controller: OAuthController;
  let mockGetGitLabAuthorizationUrlUseCase: {
    execute: jest.MockedFunction<GetGitLabAuthorizationUrlUseCase['execute']>;
  };
  let mockHandleGitLabCallbackUseCase: {
    execute: jest.MockedFunction<HandleGitLabCallbackUseCase['execute']>;
  };
  let mockGetGitHubAuthorizationUrlUseCase: {
    execute: jest.MockedFunction<GetGitHubAuthorizationUrlUseCase['execute']>;
  };
  let mockHandleGitHubCallbackUseCase: {
    execute: jest.MockedFunction<HandleGitHubCallbackUseCase['execute']>;
  };
  let mockGetOAuthConnectionsUseCase: {
    execute: jest.MockedFunction<GetOAuthConnectionsUseCase['execute']>;
  };
  let mockVerifyGitLabRepoOwnershipUseCase: {
    execute: jest.MockedFunction<VerifyGitLabRepoOwnershipUseCase['execute']>;
  };
  let mockDeleteOAuthConnectionUseCase: {
    execute: jest.MockedFunction<DeleteOAuthConnectionUseCase['execute']>;
  };

  const currentUser: CurrentUserData = {
    userId: '550e8400-e29b-41d4-a716-446655440000',
    email: 'user@example.com',
    roles: [Role.PLAYER],
  };

  beforeEach(async () => {
    mockGetGitLabAuthorizationUrlUseCase = { execute: jest.fn() };
    mockHandleGitLabCallbackUseCase = { execute: jest.fn() };
    mockGetGitHubAuthorizationUrlUseCase = { execute: jest.fn() };
    mockHandleGitHubCallbackUseCase = { execute: jest.fn() };
    mockGetOAuthConnectionsUseCase = { execute: jest.fn() };
    mockVerifyGitLabRepoOwnershipUseCase = { execute: jest.fn() };
    mockDeleteOAuthConnectionUseCase = { execute: jest.fn() };

    // Silence Logger output during tests. Errors in callback are expected behavior
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

    const module = await Test.createTestingModule({
      controllers: [OAuthController],
      providers: [
        {
          provide: GetGitLabAuthorizationUrlUseCase,
          useValue: mockGetGitLabAuthorizationUrlUseCase,
        },
        {
          provide: HandleGitLabCallbackUseCase,
          useValue: mockHandleGitLabCallbackUseCase,
        },
        {
          provide: GetGitHubAuthorizationUrlUseCase,
          useValue: mockGetGitHubAuthorizationUrlUseCase,
        },
        {
          provide: HandleGitHubCallbackUseCase,
          useValue: mockHandleGitHubCallbackUseCase,
        },
        {
          provide: GetOAuthConnectionsUseCase,
          useValue: mockGetOAuthConnectionsUseCase,
        },
        {
          provide: VerifyGitLabRepoOwnershipUseCase,
          useValue: mockVerifyGitLabRepoOwnershipUseCase,
        },
        {
          provide: DeleteOAuthConnectionUseCase,
          useValue: mockDeleteOAuthConnectionUseCase,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'ENCRYPTION_KEY') return TEST_HMAC_KEY;
              if (key === 'ALLOWED_REDIRECT_ORIGINS') return undefined;
              return undefined;
            }),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<OAuthController>(OAuthController);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getGitLabAuthorizationUrl', () => {
    it('should return the authorization URL', () => {
      // Arrange
      const expectedUrl =
        'https://gitlab.com/oauth/authorize?client_id=abc&state=xyz';
      mockGetGitLabAuthorizationUrlUseCase.execute.mockReturnValue({
        authorizationUrl: expectedUrl,
      });

      // Act
      const result = controller.getGitLabAuthorizationUrl(
        currentUser,
        'https://vitrina.app/callback',
      );

      // Assert
      expect(mockGetGitLabAuthorizationUrlUseCase.execute).toHaveBeenCalledWith(
        {
          userId: currentUser.userId,
          redirectUrl: 'https://vitrina.app/callback',
        },
      );
      expect(result.authorizationUrl).toBe(expectedUrl);
    });

    it('should throw BadRequestException when redirect_url is missing', () => {
      // Act and Assert
      expect(() =>
        controller.getGitLabAuthorizationUrl(currentUser, ''),
      ).toThrow(BadRequestException);

      expect(() =>
        controller.getGitLabAuthorizationUrl(currentUser, ''),
      ).toThrow('redirect_url query parameter is required');

      expect(
        mockGetGitLabAuthorizationUrlUseCase.execute,
      ).not.toHaveBeenCalled();
    });
  });

  describe('handleGitLabCallback', () => {
    it('should redirect to redirectUrl with success on happy path', async () => {
      // Arrange
      mockHandleGitLabCallbackUseCase.execute.mockResolvedValue({
        redirectUrl: 'http://localhost/vitrina/callback',
        isNewConnection: true,
      });

      const validState = encodeOAuthState(
        {
          userId: currentUser.userId,
          redirectUrl: 'http://localhost/vitrina/callback',
        },
        TEST_HMAC_KEY,
      );

      // Act
      const result = await controller.handleGitLabCallback(
        'auth-code',
        validState,
      );

      // Assert
      expect(result).toEqual({
        url: 'http://localhost/vitrina/callback?success=true&new_connection=true',
      });
    });

    it('should redirect with new_connection=false on re-authorization', async () => {
      // Arrange
      mockHandleGitLabCallbackUseCase.execute.mockResolvedValue({
        redirectUrl: 'http://localhost/vitrina/callback',
        isNewConnection: false,
      });

      const validState = encodeOAuthState(
        {
          userId: currentUser.userId,
          redirectUrl: 'http://localhost/vitrina/callback',
        },
        TEST_HMAC_KEY,
      );

      // Act
      const result = await controller.handleGitLabCallback(
        'auth-code',
        validState,
      );

      // Assert
      expect(result).toEqual({
        url: 'http://localhost/vitrina/callback?success=true&new_connection=false',
      });
    });

    it('should redirect with error when GitLab sends an error param', async () => {
      // Arrange
      const validState = encodeOAuthState(
        {
          userId: currentUser.userId,
          redirectUrl: 'http://localhost/vitrina/callback',
        },
        TEST_HMAC_KEY,
      );

      // Act: user denied authorization on GitLab
      const result = await controller.handleGitLabCallback(
        '',
        validState,
        'access_denied',
      );

      // Assert
      expect(result).toEqual({
        url: 'http://localhost/vitrina/callback?error=access_denied',
      });
      expect(mockHandleGitLabCallbackUseCase.execute).not.toHaveBeenCalled();
    });

    it('should redirect with error when use case throws', async () => {
      // Arrange
      mockHandleGitLabCallbackUseCase.execute.mockRejectedValue(
        new Error('GitLab API unreachable'),
      );

      const validState = encodeOAuthState(
        {
          userId: currentUser.userId,
          redirectUrl: 'http://localhost/vitrina/callback',
        },
        TEST_HMAC_KEY,
      );

      // Act
      const result = await controller.handleGitLabCallback(
        'auth-code',
        validState,
      );

      // Assert
      expect(result).toEqual({
        url: 'http://localhost/vitrina/callback?error=oauth_failed',
      });
    });

    it('should redirect to fallback / when state is invalid and error occurs', async () => {
      // Arrange
      mockHandleGitLabCallbackUseCase.execute.mockRejectedValue(
        new Error('Something went wrong'),
      );

      // Act: state is completely invalid
      const result = await controller.handleGitLabCallback(
        'auth-code',
        'not-valid-state-at-all',
      );

      // Assert
      expect(result?.url).toContain('?error=');
    });
  });

  describe('getConnections', () => {
    it('should return the list of connections for the current user', async () => {
      // Arrange
      const mockConnections = [
        {
          id: '661f8400-e29b-41d4-a716-446655440111',
          userId: currentUser.userId,
          provider: OAuthProvider.GITLAB,
          providerUserId: '12345678',
          scopes: ['read_user', 'read_api'],
          tokenExpiresAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockGetOAuthConnectionsUseCase.execute.mockResolvedValue(mockConnections);

      // Act
      const result = await controller.getConnections(currentUser);

      // Assert
      expect(mockGetOAuthConnectionsUseCase.execute).toHaveBeenCalledWith(
        currentUser.userId,
      );
      expect(result).toEqual(mockConnections);
    });

    it('should return an empty array when user has no connections', async () => {
      // Arrange
      mockGetOAuthConnectionsUseCase.execute.mockResolvedValue([]);

      // Act
      const result = await controller.getConnections(currentUser);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('verifyGitLabRepoOwnership', () => {
    it('should return verified true when user is owner or maintainer', async () => {
      // Arrange
      mockVerifyGitLabRepoOwnershipUseCase.execute.mockResolvedValue({
        verified: true,
        repoId: 11111111,
        accessLevel: 50,
      });

      // Act
      const result = await controller.verifyGitLabRepoOwnership(
        currentUser,
        11111111,
      );

      // Assert
      expect(mockVerifyGitLabRepoOwnershipUseCase.execute).toHaveBeenCalledWith(
        {
          userId: currentUser.userId,
          repoId: 11111111,
        },
      );
      expect(result.verified).toBe(true);
    });

    it('should propagate ForbiddenException when user lacks access', async () => {
      // Arrange
      mockVerifyGitLabRepoOwnershipUseCase.execute.mockRejectedValue(
        new ForbiddenException('User does not have maintainer or owner access'),
      );

      // Act and Assert
      await expect(
        controller.verifyGitLabRepoOwnership(currentUser, 11111111),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should propagate NotFoundException when user has no GitLab connection', async () => {
      // Arrange
      mockVerifyGitLabRepoOwnershipUseCase.execute.mockRejectedValue(
        new NotFoundException('No GitLab connection found for this user'),
      );

      // Act and Assert
      await expect(
        controller.verifyGitLabRepoOwnership(currentUser, 11111111),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteConnection', () => {
    const connectionId = '661f8400-e29b-41d4-a716-446655440111';

    it('should resolve with undefined (204) when connection is deleted successfully', async () => {
      // Arrange
      mockDeleteOAuthConnectionUseCase.execute.mockResolvedValue(undefined);

      // Act
      const result = await controller.deleteConnection(
        currentUser,
        connectionId,
      );

      // Assert
      expect(mockDeleteOAuthConnectionUseCase.execute).toHaveBeenCalledWith(
        connectionId,
        currentUser.userId,
      );
      expect(result).toBeUndefined();
    });

    it('should propagate NotFoundException when connection is not found', async () => {
      // Arrange
      mockDeleteOAuthConnectionUseCase.execute.mockRejectedValue(
        new NotFoundException('OAuth connection not found'),
      );

      // Act and Assert
      await expect(
        controller.deleteConnection(currentUser, connectionId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should pass the current user id to the use case for ownership validation', async () => {
      // Arrange
      mockDeleteOAuthConnectionUseCase.execute.mockResolvedValue(undefined);

      // Act
      await controller.deleteConnection(currentUser, connectionId);

      // Assert
      expect(mockDeleteOAuthConnectionUseCase.execute).toHaveBeenCalledWith(
        connectionId,
        currentUser.userId,
      );
    });
  });
});
