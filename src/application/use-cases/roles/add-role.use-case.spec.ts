import { Test } from '@nestjs/testing';
import type { MockedInterface } from 'test/test-utils';
import { AddRoleUseCase } from './add-role.use-case';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import type { IUserRepository } from '@/domain/repositories/user.repository.interface';
import { USER_REPOSITORY } from '@/domain/repositories/user.repository.interface';
import { UserEntity } from '@/domain/entities/user.entity';
import { Role } from '@/domain/value-objects/role.vo';

describe('AddRoleUseCase', () => {
  let useCase: AddRoleUseCase;
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
        AddRoleUseCase,
        { provide: USER_REPOSITORY, useValue: mockUserRepository },
      ],
    }).compile();

    useCase = module.get<AddRoleUseCase>(AddRoleUseCase);
  });

  describe('execute', () => {
    it('should add developer role to a player user', async () => {
      // Arrange
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const existingUser = new UserEntity(
        userId,
        'auth_provider_id_123',
        'frodo@theshire.me',
        [Role.PLAYER],
        'Frodo Baggins',
        true,
        new Date(),
        new Date(),
        new Date(),
      );

      const updatedUser = new UserEntity(
        userId,
        'auth_provider_id_123',
        'frodo@theshire.me',
        [Role.PLAYER, Role.DEVELOPER],
        'Frodo Baggins',
        true,
        new Date(),
        new Date(),
        new Date(),
      );

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.update.mockResolvedValue(updatedUser);

      // Act
      const result = await useCase.execute(userId, Role.DEVELOPER);

      // Assert
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.update).toHaveBeenCalledWith(userId, {
        roles: [Role.PLAYER, Role.DEVELOPER],
      });
      expect(result.roles).toContain(Role.DEVELOPER);
      expect(result.roles).toContain(Role.PLAYER);
    });

    it('should add admin role to a player user', async () => {
      // Arrange
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const existingUser = new UserEntity(
        userId,
        'auth_provider_id_123',
        'frodo@theshire.me',
        [Role.PLAYER],
        'Frodo Baggins',
        true,
        new Date(),
        new Date(),
        new Date(),
      );

      const updatedUser = new UserEntity(
        userId,
        'auth_provider_id_123',
        'frodo@theshire.me',
        [Role.PLAYER, Role.ADMIN],
        'Frodo Baggins',
        true,
        new Date(),
        new Date(),
        new Date(),
      );

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.update.mockResolvedValue(updatedUser);

      // Act
      const result = await useCase.execute(userId, Role.ADMIN);

      // Assert
      expect(mockUserRepository.update).toHaveBeenCalledWith(userId, {
        roles: [Role.PLAYER, Role.ADMIN],
      });
      expect(result.roles).toContain(Role.ADMIN);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      // Arrange
      const nonExistentId = 'non-existent-id';
      mockUserRepository.findById.mockResolvedValue(null);

      // Act and Assert
      await expect(
        useCase.execute(nonExistentId, Role.DEVELOPER),
      ).rejects.toThrow(NotFoundException);
      await expect(
        useCase.execute(nonExistentId, Role.DEVELOPER),
      ).rejects.toThrow(`User with id ${nonExistentId} not found`);
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when user already has the role', async () => {
      // Arrange
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const userWithDeveloper = new UserEntity(
        userId,
        'auth_provider_id_123',
        'frodo@theshire.me',
        [Role.PLAYER, Role.DEVELOPER],
        'Frodo Baggins',
        true,
        new Date(),
        new Date(),
        new Date(),
      );

      mockUserRepository.findById.mockResolvedValue(userWithDeveloper);

      // Act and Assert
      await expect(useCase.execute(userId, Role.DEVELOPER)).rejects.toThrow(
        BadRequestException,
      );
      await expect(useCase.execute(userId, Role.DEVELOPER)).rejects.toThrow(
        `User already has role: ${Role.DEVELOPER}`,
      );
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for an invalid role', async () => {
      // Arrange
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const invalidRole = 'superadmin' as Role;

      // Act and Assert
      await expect(useCase.execute(userId, invalidRole)).rejects.toThrow(
        BadRequestException,
      );
      await expect(useCase.execute(userId, invalidRole)).rejects.toThrow(
        `Invalid role: ${invalidRole}`,
      );
      expect(mockUserRepository.findById).not.toHaveBeenCalled();
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it('should return the persisted user from update, not the in-memory object', async () => {
      // Arrange
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const existingUser = new UserEntity(
        userId,
        'auth_provider_id_123',
        'frodo@theshire.me',
        [Role.PLAYER],
        'Frodo Baggins',
        true,
        new Date(),
        new Date(),
        new Date(),
      );

      // Simulate DB returning slightly different data, for example updatedAt refreshed
      const persistedUser = new UserEntity(
        userId,
        'auth_provider_id_123',
        'frodo@theshire.me',
        [Role.PLAYER, Role.DEVELOPER],
        'Frodo Baggins',
        true,
        new Date(),
        new Date(),
        new Date('2099-01-01'), // updatedAt set by DB
      );

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.update.mockResolvedValue(persistedUser);

      // Act
      const result = await useCase.execute(userId, Role.DEVELOPER);

      // Assert
      expect(result.updatedAt).toEqual(new Date('2099-01-01'));
    });
  });
});
