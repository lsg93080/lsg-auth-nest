import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HandleGitLabCallbackUseCase } from './handle-gitlab-callback.use-case';
import { BadRequestException } from '@nestjs/common';
import { GitLabOAuthProvider } from '@/infrastructure/oauth/gitlab/gitlab-oauth.provider';
import type { IOAuthConnectionRepository } from '@/domain/repositories/oauth-connection.repository.interface';
import { OAUTH_CONNECTION_REPOSITORY } from '@/domain/repositories/oauth-connection.repository.interface';
import type { IEncryptionService } from '@/domain/services/encryption.service.interface';
import { ENCRYPTION_SERVICE } from '@/domain/services/encryption.service.interface';
import type { IIdGenerator } from '@/domain/services/id-generator.interface';
import { ID_GENERATOR } from '@/domain/services/id-generator.interface';
import { OAuthConnectionEntity } from '@/domain/entities/oauth-connection.entity';
import { OAuthProvider } from '@/domain/value-objects/oauth-provider.vo';
import { encodeOAuthState } from '@/application/utils/oauth-state.util';
import type { MockedInterface } from 'test/test-utils';

const TEST_HMAC_KEY = 'test-hmac-secret-key-for-unit-tests';

describe('HandleGitLabCallbackUseCase', () => {
  let useCase: HandleGitLabCallbackUseCase;
  let mockGitLabOAuthProvider: jest.Mocked<
    Pick<GitLabOAuthProvider, 'exchangeCodeForToken' | 'getAuthenticatedUser'>
  >;
  let mockOAuthConnectionRepository: MockedInterface<IOAuthConnectionRepository>;
  let mockEncryptionService: jest.Mocked<IEncryptionService>;
  let mockIdGenerator: jest.Mocked<IIdGenerator>;

  const validState = encodeOAuthState(
    {
      userId: '550e8400-e29b-41d4-a716-446655440000',
      redirectUrl: 'https://vitrina.app/callback',
    },
    TEST_HMAC_KEY,
  );

  const mockTokenResponse = {
    access_token: 'glpat-real-gitlab-token',
    refresh_token: null,
    expires_in: null,
    scope: 'read_user read_api',
    token_type: 'Bearer',
  };

  const mockGitLabUser = {
    id: 12345678,
    username: 'aragorn',
    email: 'aragorn@gondor.me',
    name: 'Aragorn II Elessar',
  };

  beforeEach(async () => {
    mockGitLabOAuthProvider = {
      exchangeCodeForToken: jest.fn(),
      getAuthenticatedUser: jest.fn(),
    };

    mockOAuthConnectionRepository = {
      findById: jest.fn(),
      findByUserAndProvider: jest.fn(),
      findAllByUser: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    mockEncryptionService = {
      encrypt: jest.fn(),
      decrypt: jest.fn(),
    };

    mockIdGenerator = {
      generate: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        HandleGitLabCallbackUseCase,
        { provide: GitLabOAuthProvider, useValue: mockGitLabOAuthProvider },
        {
          provide: OAUTH_CONNECTION_REPOSITORY,
          useValue: mockOAuthConnectionRepository,
        },
        { provide: ENCRYPTION_SERVICE, useValue: mockEncryptionService },
        { provide: ID_GENERATOR, useValue: mockIdGenerator },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(TEST_HMAC_KEY) },
        },
      ],
    }).compile();

    useCase = module.get<HandleGitLabCallbackUseCase>(
      HandleGitLabCallbackUseCase,
    );
  });

  describe('execute', () => {
    it('should create a new connection when none exists', async () => {
      // Arrange
      const generatedId = '661f8400-e29b-41d4-a716-446655440111';
      mockGitLabOAuthProvider.exchangeCodeForToken.mockResolvedValue(
        mockTokenResponse,
      );
      mockGitLabOAuthProvider.getAuthenticatedUser.mockResolvedValue(
        mockGitLabUser,
      );
      mockOAuthConnectionRepository.findByUserAndProvider.mockResolvedValue(
        null,
      );
      mockEncryptionService.encrypt.mockReturnValue('encrypted-token');
      mockIdGenerator.generate.mockReturnValue(generatedId);
      mockOAuthConnectionRepository.save.mockResolvedValue(
        OAuthConnectionEntity.create(
          generatedId,
          '550e8400-e29b-41d4-a716-446655440000',
          OAuthProvider.GITLAB,
          '12345678',
          'encrypted-token',
          null,
          null,
          ['read_user', 'read_api'],
        ),
      );

      // Act
      const result = await useCase.execute({
        code: 'auth-code',
        state: validState,
      });

      // Assert
      expect(mockOAuthConnectionRepository.save).toHaveBeenCalledTimes(1);
      expect(result.isNewConnection).toBe(true);
      expect(result.redirectUrl).toBe('https://vitrina.app/callback');
    });

    it('should update tokens when connection already exists (re-authorization)', async () => {
      // Arrange
      const existingConnection = new OAuthConnectionEntity(
        '661f8400-e29b-41d4-a716-446655440111',
        '550e8400-e29b-41d4-a716-446655440000',
        OAuthProvider.GITLAB,
        '12345678',
        'old-encrypted-token',
        null,
        null,
        ['read_user'],
        new Date(),
        new Date(),
      );

      mockGitLabOAuthProvider.exchangeCodeForToken.mockResolvedValue(
        mockTokenResponse,
      );
      mockGitLabOAuthProvider.getAuthenticatedUser.mockResolvedValue(
        mockGitLabUser,
      );
      mockOAuthConnectionRepository.findByUserAndProvider.mockResolvedValue(
        existingConnection,
      );
      mockEncryptionService.encrypt.mockReturnValue('new-encrypted-token');
      mockOAuthConnectionRepository.save.mockResolvedValue(
        existingConnection.withUpdatedTokens('new-encrypted-token', null, null),
      );

      // Act
      const result = await useCase.execute({
        code: 'auth-code',
        state: validState,
      });

      // Assert
      expect(result.isNewConnection).toBe(false);
      // ID generator should not be called (no new entity created)
      expect(mockIdGenerator.generate).not.toHaveBeenCalled();
    });

    it('should encrypt the access token before saving', async () => {
      // Arrange
      mockGitLabOAuthProvider.exchangeCodeForToken.mockResolvedValue(
        mockTokenResponse,
      );
      mockGitLabOAuthProvider.getAuthenticatedUser.mockResolvedValue(
        mockGitLabUser,
      );
      mockOAuthConnectionRepository.findByUserAndProvider.mockResolvedValue(
        null,
      );
      mockEncryptionService.encrypt.mockReturnValue('encrypted-token');
      mockIdGenerator.generate.mockReturnValue('new-id');
      mockOAuthConnectionRepository.save.mockResolvedValue(
        OAuthConnectionEntity.create(
          'new-id',
          'user',
          OAuthProvider.GITLAB,
          '123',
          'encrypted-token',
          null,
          null,
          [],
        ),
      );

      // Act
      await useCase.execute({ code: 'auth-code', state: validState });

      // Assert: encrypt was called with the raw token
      expect(mockEncryptionService.encrypt).toHaveBeenCalledWith(
        'glpat-real-gitlab-token',
      );

      // Assert: what was saved is the encrypted version, not the raw token
      const savedEntity = mockOAuthConnectionRepository.save.mock.calls[0][0];
      expect(savedEntity.accessToken).toBe('encrypted-token');
      expect(savedEntity.accessToken).not.toBe('glpat-real-gitlab-token');
    });

    it('should encrypt the refresh token when present', async () => {
      // Arrange
      const tokenWithRefresh = {
        ...mockTokenResponse,
        refresh_token: 'raw-refresh-token',
      };

      mockGitLabOAuthProvider.exchangeCodeForToken.mockResolvedValue(
        tokenWithRefresh,
      );
      mockGitLabOAuthProvider.getAuthenticatedUser.mockResolvedValue(
        mockGitLabUser,
      );
      mockOAuthConnectionRepository.findByUserAndProvider.mockResolvedValue(
        null,
      );
      mockEncryptionService.encrypt
        .mockReturnValueOnce('encrypted-access-token')
        .mockReturnValueOnce('encrypted-refresh-token');
      mockIdGenerator.generate.mockReturnValue('new-id');
      mockOAuthConnectionRepository.save.mockResolvedValue(
        OAuthConnectionEntity.create(
          'new-id',
          'user',
          OAuthProvider.GITLAB,
          '123',
          'encrypted-access-token',
          'encrypted-refresh-token',
          null,
          [],
        ),
      );

      // Act
      await useCase.execute({ code: 'auth-code', state: validState });

      // Assert: encrypt called twice (once for access and once for refresh)
      expect(mockEncryptionService.encrypt).toHaveBeenCalledTimes(2);
      expect(mockEncryptionService.encrypt).toHaveBeenCalledWith(
        'raw-refresh-token',
      );
    });

    it('should calculate tokenExpiresAt when expires_in is present', async () => {
      // Arrange
      const tokenWithExpiry = {
        ...mockTokenResponse,
        expires_in: 7200, // 2 hours
      };

      const beforeExecution = Date.now();

      mockGitLabOAuthProvider.exchangeCodeForToken.mockResolvedValue(
        tokenWithExpiry,
      );
      mockGitLabOAuthProvider.getAuthenticatedUser.mockResolvedValue(
        mockGitLabUser,
      );
      mockOAuthConnectionRepository.findByUserAndProvider.mockResolvedValue(
        null,
      );
      mockEncryptionService.encrypt.mockReturnValue('encrypted-token');
      mockIdGenerator.generate.mockReturnValue('new-id');
      mockOAuthConnectionRepository.save.mockImplementation(
        (entity: OAuthConnectionEntity) => Promise.resolve(entity),
      );

      // Act
      await useCase.execute({ code: 'auth-code', state: validState });

      // Assert
      const savedEntity = mockOAuthConnectionRepository.save.mock.calls[0][0];
      expect(savedEntity.tokenExpiresAt).toBeInstanceOf(Date);
      expect(savedEntity.tokenExpiresAt!.getTime()).toBeGreaterThanOrEqual(
        beforeExecution + 7200 * 1000,
      );
    });

    it('should set tokenExpiresAt to null when expires_in is not present', async () => {
      // Arrange
      mockGitLabOAuthProvider.exchangeCodeForToken.mockResolvedValue(
        mockTokenResponse,
      ); // expires_in: null
      mockGitLabOAuthProvider.getAuthenticatedUser.mockResolvedValue(
        mockGitLabUser,
      );
      mockOAuthConnectionRepository.findByUserAndProvider.mockResolvedValue(
        null,
      );
      mockEncryptionService.encrypt.mockReturnValue('encrypted-token');
      mockIdGenerator.generate.mockReturnValue('new-id');
      mockOAuthConnectionRepository.save.mockImplementation(
        (entity: OAuthConnectionEntity) => Promise.resolve(entity),
      );

      // Act
      await useCase.execute({ code: 'auth-code', state: validState });

      // Assert
      const savedEntity = mockOAuthConnectionRepository.save.mock.calls[0][0];
      expect(savedEntity.tokenExpiresAt).toBeNull();
    });

    it('should throw BadRequestException when state is invalid', async () => {
      // Arrange
      const promise = useCase.execute({
        code: 'auth-code',
        state: 'invalid-state',
      });

      // Act and Assert
      await expect(promise).rejects.toThrow(BadRequestException);
      await expect(
        useCase.execute({ code: 'auth-code', state: 'invalid-state' }),
      ).rejects.toThrow('Invalid OAuth state parameter');
    });

    it('should store the GitLab user id as providerUserId', async () => {
      // Arrange
      mockGitLabOAuthProvider.exchangeCodeForToken.mockResolvedValue(
        mockTokenResponse,
      );
      mockGitLabOAuthProvider.getAuthenticatedUser.mockResolvedValue(
        mockGitLabUser,
      );
      mockOAuthConnectionRepository.findByUserAndProvider.mockResolvedValue(
        null,
      );
      mockEncryptionService.encrypt.mockReturnValue('encrypted-token');
      mockIdGenerator.generate.mockReturnValue('new-id');
      mockOAuthConnectionRepository.save.mockImplementation(
        (entity: OAuthConnectionEntity) => Promise.resolve(entity),
      );

      // Act
      await useCase.execute({ code: 'auth-code', state: validState });

      // Assert
      const savedEntity = mockOAuthConnectionRepository.save.mock.calls[0][0];
      expect(savedEntity.providerUserId).toBe('12345678');
    });
  });
});
