import { Test } from '@nestjs/testing';
import type { MockedInterface } from 'test/test-utils';
import { GrantDeveloperRoleUseCase } from './grant-developer-role.use-case';
import { NotFoundException } from '@nestjs/common';
import type { IUserRepository } from '@/domain/repositories/user.repository.interface';
import { USER_REPOSITORY } from '@/domain/repositories/user.repository.interface';
import { UserEntity } from '@/domain/entities/user.entity';
import { Role } from '@/domain/value-objects/role.vo';

describe('GrantDeveloperRoleUseCase', () => {
  let useCase: GrantDeveloperRoleUseCase;
  let mockUserRepository: MockedInterface<IUserRepository>;

  beforeEach(async () => {
    mockUserRepository = {
      findById: jest.fn(),
      findByAuthProviderId: jest.fn(),
      findByEmail: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        GrantDeveloperRoleUseCase,
        { provide: USER_REPOSITORY, useValue: mockUserRepository },
      ],
    }).compile();

    useCase = module.get<GrantDeveloperRoleUseCase>(GrantDeveloperRoleUseCase);
  });

  describe('execute', () => {
    it('should grant developer role to a player user', async () => {
      // Arrange
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const existingUser = new UserEntity(
        userId,
        'auth_provider_id_123',
        'aragorn@gondor.me',
        [Role.PLAYER],
        'Aragorn II Elessar',
        true,
        new Date(),
        new Date(),
        new Date(),
      );

      const updatedUser = new UserEntity(
        userId,
        'auth_provider_id_123',
        'aragorn@gondor.me',
        [Role.PLAYER, Role.DEVELOPER],
        'Aragorn II Elessar',
        true,
        new Date(),
        new Date(),
        new Date(),
      );

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.update.mockResolvedValue(updatedUser);

      // Act
      const result = await useCase.execute(userId);

      // Assert
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.update).toHaveBeenCalledWith(userId, {
        roles: [Role.PLAYER, Role.DEVELOPER],
      });
      expect(result.roles).toContain(Role.DEVELOPER);
      expect(result.roles).toContain(Role.PLAYER);
    });

    it('should be idempotent: return current state if user already has developer role', async () => {
      // Arrange
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const userWithDeveloper = new UserEntity(
        userId,
        'auth_provider_id_123',
        'aragorn@gondor.me',
        [Role.PLAYER, Role.DEVELOPER],
        'Aragorn II Elessar',
        true,
        new Date(),
        new Date(),
        new Date(),
      );

      mockUserRepository.findById.mockResolvedValue(userWithDeveloper);

      // Act
      const result = await useCase.execute(userId);

      // Assert
      expect(mockUserRepository.update).not.toHaveBeenCalled();
      expect(result.roles).toContain(Role.DEVELOPER);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      // Arrange
      const nonExistentId = 'non-existent-id';
      mockUserRepository.findById.mockResolvedValue(null);

      // Act and Assert
      await expect(useCase.execute(nonExistentId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(useCase.execute(nonExistentId)).rejects.toThrow(
        `User with id ${nonExistentId} not found`,
      );
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it('should preserve existing roles when granting developer role', async () => {
      // Arrange
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const existingUser = new UserEntity(
        userId,
        'auth_provider_id_123',
        'aragorn@gondor.me',
        [Role.PLAYER, Role.ADMIN],
        'Aragorn II Elessar',
        true,
        new Date(),
        new Date(),
        new Date(),
      );

      const updatedUser = new UserEntity(
        userId,
        'auth_provider_id_123',
        'aragorn@gondor.me',
        [Role.PLAYER, Role.ADMIN, Role.DEVELOPER],
        'Aragorn II Elessar',
        true,
        new Date(),
        new Date(),
        new Date(),
      );

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.update.mockResolvedValue(updatedUser);

      // Act
      const result = await useCase.execute(userId);

      // Assert
      expect(mockUserRepository.update).toHaveBeenCalledWith(userId, {
        roles: [Role.PLAYER, Role.ADMIN, Role.DEVELOPER],
      });
      expect(result.roles).toContain(Role.PLAYER);
      expect(result.roles).toContain(Role.ADMIN);
      expect(result.roles).toContain(Role.DEVELOPER);
    });
  });
});
