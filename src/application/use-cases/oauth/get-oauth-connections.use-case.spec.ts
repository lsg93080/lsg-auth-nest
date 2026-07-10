import { Test } from '@nestjs/testing';
import { GetOAuthConnectionsUseCase } from './get-oauth-connections.use-case';
import type { IOAuthConnectionRepository } from '@/domain/repositories/oauth-connection.repository.interface';
import { OAUTH_CONNECTION_REPOSITORY } from '@/domain/repositories/oauth-connection.repository.interface';
import { OAuthConnectionEntity } from '@/domain/entities/oauth-connection.entity';
import { OAuthProvider } from '@/domain/value-objects/oauth-provider.vo';
import type { MockedInterface } from 'test/test-utils';

describe('GetOAuthConnectionsUseCase', () => {
  let useCase: GetOAuthConnectionsUseCase;
  let mockOAuthConnectionRepository: MockedInterface<IOAuthConnectionRepository>;

  const userId = '550e8400-e29b-41d4-a716-446655440000';

  const gitlabConnection = new OAuthConnectionEntity(
    '661f8400-e29b-41d4-a716-446655440111',
    userId,
    OAuthProvider.GITLAB,
    '12345678',
    'encrypted-access-token',
    'encrypted-refresh-token',
    null,
    ['read_user', 'read_api'],
    new Date('2026-01-01'),
    new Date('2026-01-01'),
  );

  beforeEach(async () => {
    mockOAuthConnectionRepository = {
      findById: jest.fn(),
      findByUserAndProvider: jest.fn(),
      findAllByUser: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      deleteConnection: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        GetOAuthConnectionsUseCase,
        {
          provide: OAUTH_CONNECTION_REPOSITORY,
          useValue: mockOAuthConnectionRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetOAuthConnectionsUseCase>(
      GetOAuthConnectionsUseCase,
    );
  });

  describe('execute', () => {
    it('should return a list of connections for the user', async () => {
      // Arrange
      mockOAuthConnectionRepository.findAllByUser.mockResolvedValue([
        gitlabConnection,
      ]);

      // Act
      const result = await useCase.execute(userId);

      // Assert
      expect(mockOAuthConnectionRepository.findAllByUser).toHaveBeenCalledWith(
        userId,
      );
      expect(result).toHaveLength(1);
      expect(result[0].provider).toBe(OAuthProvider.GITLAB);
      expect(result[0].userId).toBe(userId);
    });

    it('should return an empty array when user has no connections', async () => {
      // Arrange
      mockOAuthConnectionRepository.findAllByUser.mockResolvedValue([]);

      // Act
      const result = await useCase.execute(userId);

      // Assert
      expect(result).toEqual([]);
    });

    it('should never expose accessToken in the DTO', async () => {
      // Arrange
      mockOAuthConnectionRepository.findAllByUser.mockResolvedValue([
        gitlabConnection,
      ]);

      // Act
      const result = await useCase.execute(userId);

      // Assert
      expect(result[0]).not.toHaveProperty('accessToken');
    });

    it('should never expose refreshToken in the DTO', async () => {
      // Arrange
      mockOAuthConnectionRepository.findAllByUser.mockResolvedValue([
        gitlabConnection,
      ]);

      // Act
      const result = await useCase.execute(userId);

      // Assert
      expect(result[0]).not.toHaveProperty('refreshToken');
    });

    it('should return correct fields in the DTO', async () => {
      // Arrange
      mockOAuthConnectionRepository.findAllByUser.mockResolvedValue([
        gitlabConnection,
      ]);

      // Act
      const result = await useCase.execute(userId);

      // Assert
      expect(result[0]).toMatchObject({
        id: '661f8400-e29b-41d4-a716-446655440111',
        userId,
        provider: OAuthProvider.GITLAB,
        providerUserId: '12345678',
        scopes: ['read_user', 'read_api'],
        tokenExpiresAt: null,
      });
    });

    it('should return multiple connections when user has more than one provider', async () => {
      // Arrange
      const githubConnection = new OAuthConnectionEntity(
        '772f9511-f3ac-52e5-b827-557766551222',
        userId,
        OAuthProvider.GITHUB,
        '87654321',
        'encrypted-github-token',
        null,
        null,
        ['read:user', 'repo'],
        new Date('2026-02-01'),
        new Date('2026-02-01'),
      );

      mockOAuthConnectionRepository.findAllByUser.mockResolvedValue([
        gitlabConnection,
        githubConnection,
      ]);

      // Act
      const result = await useCase.execute(userId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result.map((c) => c.provider)).toContain(OAuthProvider.GITLAB);
      expect(result.map((c) => c.provider)).toContain(OAuthProvider.GITHUB);
    });
  });
});
