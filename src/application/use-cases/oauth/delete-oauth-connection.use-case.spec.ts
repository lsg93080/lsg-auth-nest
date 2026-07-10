import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DeleteOAuthConnectionUseCase } from './delete-oauth-connection.use-case';
import type { IOAuthConnectionRepository } from '@/domain/repositories/oauth-connection.repository.interface';
import { OAUTH_CONNECTION_REPOSITORY } from '@/domain/repositories/oauth-connection.repository.interface';
import type { MockedInterface } from 'test/test-utils';

describe('DeleteOAuthConnectionUseCase', () => {
  let useCase: DeleteOAuthConnectionUseCase;
  let mockOAuthConnectionRepository: MockedInterface<IOAuthConnectionRepository>;

  const connectionId = '661f8400-e29b-41d4-a716-446655440111';
  const userId = '550e8400-e29b-41d4-a716-446655440000';
  const otherUserId = '999e8400-e29b-41d4-a716-446655440999';

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
        DeleteOAuthConnectionUseCase,
        {
          provide: OAUTH_CONNECTION_REPOSITORY,
          useValue: mockOAuthConnectionRepository,
        },
      ],
    }).compile();

    useCase = module.get<DeleteOAuthConnectionUseCase>(
      DeleteOAuthConnectionUseCase,
    );
  });

  describe('execute', () => {
    it('should delete connection successfully when connection belongs to user', async () => {
      // Arrange
      mockOAuthConnectionRepository.deleteConnection.mockResolvedValue(true);

      // Act
      const result = await useCase.execute(connectionId, userId);

      // Assert
      expect(
        mockOAuthConnectionRepository.deleteConnection,
      ).toHaveBeenCalledWith(connectionId, userId);
      expect(result).toBeUndefined();
    });

    it('should throw NotFoundException when connection is not found', async () => {
      // Arrange
      mockOAuthConnectionRepository.deleteConnection.mockResolvedValue(false);

      // Act and Assert
      await expect(useCase.execute(connectionId, userId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(useCase.execute(connectionId, userId)).rejects.toThrow(
        'OAuth connection not found',
      );
    });

    it('should throw NotFoundException when connection belongs to a different user', async () => {
      // Arrange: repository returns false because the query includes userId, ownership check is opaque
      mockOAuthConnectionRepository.deleteConnection.mockResolvedValue(false);

      // Act and Assert
      await expect(useCase.execute(connectionId, otherUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should pass both connectionId and userId to the repository', async () => {
      // Arrange
      mockOAuthConnectionRepository.deleteConnection.mockResolvedValue(true);

      // Act
      await useCase.execute(connectionId, userId);

      // Assert: ownership is enforced at the query level, not separately
      expect(
        mockOAuthConnectionRepository.deleteConnection,
      ).toHaveBeenCalledWith(connectionId, userId);
      expect(
        mockOAuthConnectionRepository.deleteConnection,
      ).toHaveBeenCalledTimes(1);
    });
  });
});
