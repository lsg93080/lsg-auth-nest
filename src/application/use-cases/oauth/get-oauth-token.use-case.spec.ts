import { Test } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { GetOAuthTokenUseCase } from './get-oauth-token.use-case';
import { UnrecoverableTokenRefreshError } from '@/domain/services/oauth-token-refresh.error';
import type { IOAuthConnectionRepository } from '@/domain/repositories/oauth-connection.repository.interface';
import { OAUTH_CONNECTION_REPOSITORY } from '@/domain/repositories/oauth-connection.repository.interface';
import type { IEncryptionService } from '@/domain/services/encryption.service.interface';
import { ENCRYPTION_SERVICE } from '@/domain/services/encryption.service.interface';
import type {
  IOAuthTokenRefresher,
  IOAuthTokenRefresherRegistry,
} from '@/domain/services/oauth-token-refresher.interface';
import { OAUTH_TOKEN_REFRESHER_REGISTRY } from '@/domain/services/oauth-token-refresher.interface';
import { OAuthConnectionEntity } from '@/domain/entities/oauth-connection.entity';
import { OAuthProvider } from '@/domain/value-objects/oauth-provider.vo';
import type { MockedInterface } from 'test/test-utils';

describe('GetOAuthTokenUseCase', () => {
  let useCase: GetOAuthTokenUseCase;
  let mockOAuthConnectionRepository: MockedInterface<IOAuthConnectionRepository>;
  let mockEncryptionService: jest.Mocked<IEncryptionService>;
  let mockTokenRefresher: jest.Mocked<IOAuthTokenRefresher>;
  let mockTokenRefresherRegistry: jest.Mocked<IOAuthTokenRefresherRegistry>;

  const userId = '550e8400-e29b-41d4-a716-446655440000';

  const gitlabConnection = new OAuthConnectionEntity(
    '661f8400-e29b-41d4-a716-446655440111',
    userId,
    OAuthProvider.GITLAB,
    '12345678',
    'encrypted-access-token',
    null,
    null,
    ['read_user', 'read_api'],
    new Date(),
    new Date(),
  );

  beforeEach(async () => {
    mockOAuthConnectionRepository = {
      findById: jest.fn(),
      findByUserAndProvider: jest.fn(),
      findAllByUser: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      deleteConnection: jest.fn().mockResolvedValue(true),
    };
    mockEncryptionService = { encrypt: jest.fn(), decrypt: jest.fn() };
    mockTokenRefresher = { refreshAccessToken: jest.fn() };
    mockTokenRefresherRegistry = {
      getRefresher: jest.fn().mockReturnValue(mockTokenRefresher),
    };

    const module = await Test.createTestingModule({
      providers: [
        GetOAuthTokenUseCase,
        {
          provide: OAUTH_CONNECTION_REPOSITORY,
          useValue: mockOAuthConnectionRepository,
        },
        { provide: ENCRYPTION_SERVICE, useValue: mockEncryptionService },
        {
          provide: OAUTH_TOKEN_REFRESHER_REGISTRY,
          useValue: mockTokenRefresherRegistry,
        },
      ],
    }).compile();

    useCase = module.get<GetOAuthTokenUseCase>(GetOAuthTokenUseCase);
  });

  describe('execute', () => {
    it('should return the decrypted access token for the user', async () => {
      // Arrange
      mockOAuthConnectionRepository.findByUserAndProvider.mockResolvedValue(
        gitlabConnection,
      );
      mockEncryptionService.decrypt.mockReturnValue('glpat-raw-token');

      // Act
      const result = await useCase.execute({
        userId,
        provider: OAuthProvider.GITLAB,
      });

      // Assert
      expect(result.accessToken).toBe('glpat-raw-token');
      expect(result.provider).toBe(OAuthProvider.GITLAB);
      expect(result.providerUserId).toBe('12345678');
    });

    it('should decrypt using the encrypted token stored in the connection', async () => {
      // Arrange
      mockOAuthConnectionRepository.findByUserAndProvider.mockResolvedValue(
        gitlabConnection,
      );
      mockEncryptionService.decrypt.mockReturnValue('glpat-raw-token');

      // Act
      await useCase.execute({ userId, provider: OAuthProvider.GITLAB });

      // Assert
      expect(mockEncryptionService.decrypt).toHaveBeenCalledWith(
        'encrypted-access-token',
      );
    });

    it('should throw NotFoundException when no connection exists for the user and provider', async () => {
      // Arrange
      mockOAuthConnectionRepository.findByUserAndProvider.mockResolvedValue(
        null,
      );

      // Act and Assert
      await expect(
        useCase.execute({ userId, provider: OAuthProvider.GITLAB }),
      ).rejects.toThrow(NotFoundException);

      await expect(
        useCase.execute({ userId, provider: OAuthProvider.GITLAB }),
      ).rejects.toThrow('No gitlab connection found for this user');
    });

    it('should not call decrypt when connection is not found', async () => {
      // Arrange
      mockOAuthConnectionRepository.findByUserAndProvider.mockResolvedValue(
        null,
      );

      // Act
      await useCase
        .execute({ userId, provider: OAuthProvider.GITLAB })
        .catch(() => null);

      // Assert
      expect(mockEncryptionService.decrypt).not.toHaveBeenCalled();
    });

    it('should work for any valid provider', async () => {
      // Arrange
      const githubConnection = new OAuthConnectionEntity(
        '772f9511-f3ac-52e5-b827-557766551222',
        userId,
        OAuthProvider.GITHUB,
        '87654321',
        'encrypted-github-token',
        null,
        null,
        ['read:user'],
        new Date(),
        new Date(),
      );
      mockOAuthConnectionRepository.findByUserAndProvider.mockResolvedValue(
        githubConnection,
      );
      mockEncryptionService.decrypt.mockReturnValue('ghp-raw-token');

      // Act
      const result = await useCase.execute({
        userId,
        provider: OAuthProvider.GITHUB,
      });

      // Assert
      expect(result.accessToken).toBe('ghp-raw-token');
      expect(result.provider).toBe(OAuthProvider.GITHUB);
      expect(result.providerUserId).toBe('87654321');
    });

    it('should return decrypted token when tokenExpiresAt is null (never expires)', async () => {
      // Arrange: gitlabConnection has tokenExpiresAt = null
      mockOAuthConnectionRepository.findByUserAndProvider.mockResolvedValue(
        gitlabConnection,
      );
      mockEncryptionService.decrypt.mockReturnValue('glpat-raw-token');

      // Act
      const result = await useCase.execute({
        userId,
        provider: OAuthProvider.GITLAB,
      });

      // Assert
      expect(result.accessToken).toBe('glpat-raw-token');
      expect(mockTokenRefresher.refreshAccessToken).not.toHaveBeenCalled();
    });

    describe('when token is expired', () => {
      const expiredConnection = new OAuthConnectionEntity(
        '661f8400-e29b-41d4-a716-446655440111',
        userId,
        OAuthProvider.GITLAB,
        '12345678',
        'encrypted-access-token',
        'encrypted-refresh-token',
        new Date(Date.now() - 3600 * 1000), // expired 1 hour ago
        ['read_user', 'read_api'],
        new Date(),
        new Date(),
      );

      it('should refresh the token and return the new access token', async () => {
        // Arrange
        mockOAuthConnectionRepository.findByUserAndProvider.mockResolvedValue(
          expiredConnection,
        );
        mockEncryptionService.decrypt.mockReturnValue(
          'decrypted-refresh-token',
        );
        mockTokenRefresher.refreshAccessToken.mockResolvedValue({
          accessToken: 'glpat-new-access-token',
          refreshToken: 'new-refresh-token',
          expiresIn: 7200,
        });
        mockEncryptionService.encrypt
          .mockReturnValueOnce('encrypted-new-access-token')
          .mockReturnValueOnce('encrypted-new-refresh-token');

        // Act
        const result = await useCase.execute({
          userId,
          provider: OAuthProvider.GITLAB,
        });

        // Assert
        expect(result.accessToken).toBe('glpat-new-access-token');
        expect(result.provider).toBe(OAuthProvider.GITLAB);
        expect(result.providerUserId).toBe('12345678');
      });

      it('should select the refresher matching the connection provider', async () => {
        // Arrange
        mockOAuthConnectionRepository.findByUserAndProvider.mockResolvedValue(
          expiredConnection,
        );
        mockEncryptionService.decrypt.mockReturnValue(
          'decrypted-refresh-token',
        );
        mockTokenRefresher.refreshAccessToken.mockResolvedValue({
          accessToken: 'glpat-new-access-token',
          refreshToken: 'new-refresh-token',
          expiresIn: 7200,
        });
        mockEncryptionService.encrypt.mockReturnValue('encrypted-value');

        // Act
        await useCase.execute({ userId, provider: OAuthProvider.GITLAB });

        // Assert: refresher is resolved from the connection's own provider
        expect(mockTokenRefresherRegistry.getRefresher).toHaveBeenCalledWith(
          OAuthProvider.GITLAB,
        );
      });

      it('should decrypt the refresh token before calling refresher', async () => {
        // Arrange
        mockOAuthConnectionRepository.findByUserAndProvider.mockResolvedValue(
          expiredConnection,
        );
        mockEncryptionService.decrypt.mockReturnValue(
          'decrypted-refresh-token',
        );
        mockTokenRefresher.refreshAccessToken.mockResolvedValue({
          accessToken: 'glpat-new-access-token',
          refreshToken: 'new-refresh-token',
          expiresIn: 7200,
        });
        mockEncryptionService.encrypt.mockReturnValue('encrypted-value');

        // Act
        await useCase.execute({ userId, provider: OAuthProvider.GITLAB });

        // Assert
        expect(mockEncryptionService.decrypt).toHaveBeenCalledWith(
          'encrypted-refresh-token',
        );
        expect(mockTokenRefresher.refreshAccessToken).toHaveBeenCalledWith(
          'decrypted-refresh-token',
        );
      });

      it('should encrypt and save the new tokens to the repository', async () => {
        // Arrange
        mockOAuthConnectionRepository.findByUserAndProvider.mockResolvedValue(
          expiredConnection,
        );
        mockEncryptionService.decrypt.mockReturnValue(
          'decrypted-refresh-token',
        );
        mockTokenRefresher.refreshAccessToken.mockResolvedValue({
          accessToken: 'glpat-new-access-token',
          refreshToken: 'new-refresh-token',
          expiresIn: 7200,
        });
        mockEncryptionService.encrypt
          .mockReturnValueOnce('encrypted-new-access-token')
          .mockReturnValueOnce('encrypted-new-refresh-token');

        // Act
        await useCase.execute({ userId, provider: OAuthProvider.GITLAB });

        // Assert
        expect(mockEncryptionService.encrypt).toHaveBeenCalledWith(
          'glpat-new-access-token',
        );
        expect(mockEncryptionService.encrypt).toHaveBeenCalledWith(
          'new-refresh-token',
        );
        expect(mockOAuthConnectionRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            accessToken: 'encrypted-new-access-token',
            refreshToken: 'encrypted-new-refresh-token',
          }),
        );
      });

      it('should keep the old refresh token when refresher returns null refresh token', async () => {
        // Arrange
        mockOAuthConnectionRepository.findByUserAndProvider.mockResolvedValue(
          expiredConnection,
        );
        mockEncryptionService.decrypt.mockReturnValue(
          'decrypted-refresh-token',
        );
        mockTokenRefresher.refreshAccessToken.mockResolvedValue({
          accessToken: 'glpat-new-access-token',
          refreshToken: null,
          expiresIn: 7200,
        });
        mockEncryptionService.encrypt.mockReturnValue(
          'encrypted-new-access-token',
        );

        // Act
        await useCase.execute({ userId, provider: OAuthProvider.GITLAB });

        // Assert
        expect(mockOAuthConnectionRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            refreshToken: 'encrypted-refresh-token', // kept from original connection
          }),
        );
      });

      it('should delete the connection and signal reconnect when no refresh token is available', async () => {
        // Arrange
        const expiredNoRefresh = new OAuthConnectionEntity(
          '661f8400-e29b-41d4-a716-446655440111',
          userId,
          OAuthProvider.GITLAB,
          '12345678',
          'encrypted-access-token',
          null, // no refresh token
          new Date(Date.now() - 3600 * 1000), // expired
          ['read_user', 'read_api'],
          new Date(),
          new Date(),
        );
        mockOAuthConnectionRepository.findByUserAndProvider.mockResolvedValue(
          expiredNoRefresh,
        );

        // Act and Assert: 409 Conflict (reconnect required), connection deleted
        await expect(
          useCase.execute({ userId, provider: OAuthProvider.GITLAB }),
        ).rejects.toThrow(ConflictException);

        expect(
          mockOAuthConnectionRepository.deleteConnection,
        ).toHaveBeenCalledWith('661f8400-e29b-41d4-a716-446655440111', userId);
      });

      it('should not call refresher when no refresh token is available', async () => {
        // Arrange
        const expiredNoRefresh = new OAuthConnectionEntity(
          '661f8400-e29b-41d4-a716-446655440111',
          userId,
          OAuthProvider.GITLAB,
          '12345678',
          'encrypted-access-token',
          null,
          new Date(Date.now() - 3600 * 1000),
          ['read_user', 'read_api'],
          new Date(),
          new Date(),
        );
        mockOAuthConnectionRepository.findByUserAndProvider.mockResolvedValue(
          expiredNoRefresh,
        );

        // Act
        await useCase
          .execute({ userId, provider: OAuthProvider.GITLAB })
          .catch(() => null);

        // Assert
        expect(mockTokenRefresher.refreshAccessToken).not.toHaveBeenCalled();
      });

      it('should propagate error when refresh fails', async () => {
        // Arrange
        mockOAuthConnectionRepository.findByUserAndProvider.mockResolvedValue(
          expiredConnection,
        );
        mockEncryptionService.decrypt.mockReturnValue(
          'decrypted-refresh-token',
        );
        mockTokenRefresher.refreshAccessToken.mockRejectedValue(
          new Error('GitLab token refresh failed: 401 Unauthorized'),
        );

        // Act and Assert
        await expect(
          useCase.execute({ userId, provider: OAuthProvider.GITLAB }),
        ).rejects.toThrow('GitLab token refresh failed: 401 Unauthorized');
      });

      it('should NOT delete the connection on a transient refresh error', async () => {
        // Arrange: a plain Error represents a transient failure (5xx/network)
        mockOAuthConnectionRepository.findByUserAndProvider.mockResolvedValue(
          expiredConnection,
        );
        mockEncryptionService.decrypt.mockReturnValue(
          'decrypted-refresh-token',
        );
        mockTokenRefresher.refreshAccessToken.mockRejectedValue(
          new Error('GitLab token refresh failed: 503 Service Unavailable'),
        );

        // Act
        await useCase
          .execute({ userId, provider: OAuthProvider.GITLAB })
          .catch(() => null);

        // Assert: connection is kept so a later retry can succeed
        expect(
          mockOAuthConnectionRepository.deleteConnection,
        ).not.toHaveBeenCalled();
      });

      it('should delete the connection and signal reconnect on an unrecoverable refresh error', async () => {
        // Arrange: invalid_grant / no-refresh-support is unrecoverable
        mockOAuthConnectionRepository.findByUserAndProvider.mockResolvedValue(
          expiredConnection,
        );
        mockEncryptionService.decrypt.mockReturnValue(
          'decrypted-refresh-token',
        );
        mockTokenRefresher.refreshAccessToken.mockRejectedValue(
          new UnrecoverableTokenRefreshError(
            'GitLab token refresh failed: 400 Bad Request - {"error":"invalid_grant"}',
          ),
        );

        // Act and Assert
        await expect(
          useCase.execute({ userId, provider: OAuthProvider.GITLAB }),
        ).rejects.toThrow(ConflictException);

        expect(
          mockOAuthConnectionRepository.deleteConnection,
        ).toHaveBeenCalledWith('661f8400-e29b-41d4-a716-446655440111', userId);
      });
    });
  });
});
