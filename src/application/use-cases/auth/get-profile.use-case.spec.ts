import { Test } from '@nestjs/testing';
import type { MockedInterface } from 'test/test-utils';
import { GetProfileUseCase } from './get-profile.use-case';
import { NotFoundException } from '@nestjs/common';
import type { IUserRepository } from '@/domain/repositories/user.repository.interface';
import { USER_REPOSITORY } from '@/domain/repositories/user.repository.interface';
import { UserEntity } from '@/domain/entities/user.entity';
import { Role } from '@/domain/value-objects/role.vo';

describe('GetProfileUseCase', () => {
  let useCase: GetProfileUseCase;
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
        GetProfileUseCase,
        { provide: USER_REPOSITORY, useValue: mockUserRepository },
      ],
    }).compile();

    useCase = module.get<GetProfileUseCase>(GetProfileUseCase);
  });

  describe('execute', () => {
    it('should return user profile when user exists', async () => {
      // Arrange
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const existingUser = new UserEntity(
        userId,
        'auth_provider_id_666',
        'legolas@mirkwood.me',
        [Role.PLAYER],
        'Legolas Greenleaf',
        true,
        new Date('2026-01-01'),
        new Date('2026-01-01'),
        new Date('2026-01-01'),
      );

      mockUserRepository.findById.mockResolvedValue(existingUser);

      // Act
      const result = await useCase.execute(userId);

      // Assert
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(result).toMatchObject({
        id: userId,
        email: 'legolas@mirkwood.me',
        displayName: 'Legolas Greenleaf',
        roles: [Role.PLAYER],
        isActive: true,
      });
      expect(result.lastLogin).toBeInstanceOf(Date);
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('should return user with multiple roles', async () => {
      // Arrange
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const userWithMultipleRoles = new UserEntity(
        userId,
        'auth_provider_id_666',
        'developer@example.com',
        [Role.PLAYER, Role.DEVELOPER],
        'Developer User',
        true,
        new Date(),
        new Date(),
        new Date(),
      );

      mockUserRepository.findById.mockResolvedValue(userWithMultipleRoles);

      // Act
      const result = await useCase.execute(userId);

      // Assert
      expect(result.roles).toEqual([Role.PLAYER, Role.DEVELOPER]);
      expect(result.roles).toContain(Role.DEVELOPER);
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      const nonExistentUserId = 'non-existent-id';
      mockUserRepository.findById.mockResolvedValue(null);

      // Act and Assert
      await expect(useCase.execute(nonExistentUserId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(useCase.execute(nonExistentUserId)).rejects.toThrow(
        'User with id non-existent-id not found',
      );
      expect(mockUserRepository.findById).toHaveBeenCalledWith(
        nonExistentUserId,
      );
    });

    it('should return user profile with admin role', async () => {
      // Arrange
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const adminUser = new UserEntity(
        userId,
        'firebase_uid_admin',
        'admin@example.com',
        [Role.PLAYER, Role.ADMIN],
        'Admin User',
        true,
        new Date(),
        new Date(),
        new Date(),
      );

      mockUserRepository.findById.mockResolvedValue(adminUser);

      // Act
      const result = await useCase.execute(userId);

      // Assert
      expect(result.roles).toContain(Role.ADMIN);
      expect(result.email).toBe('admin@example.com');
    });
  });
});
