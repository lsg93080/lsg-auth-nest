import { Test } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { AddRoleUseCase } from '@/application/use-cases/roles/add-role.use-case';
import { RemoveRoleUseCase } from '@/application/use-cases/roles/remove-role.use-case';
import { GetProfileUseCase } from '@/application/use-cases/auth/get-profile.use-case';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Role } from '@/domain/value-objects/role.vo';
import { UserProfileDto } from '@/application/dto/auth/user-profile.dto';

describe('UsersController', () => {
  let controller: UsersController;
  let mockAddRoleUseCase: {
    execute: jest.MockedFunction<AddRoleUseCase['execute']>;
  };
  let mockRemoveRoleUseCase: {
    execute: jest.MockedFunction<RemoveRoleUseCase['execute']>;
  };
  let mockGetProfileUseCase: {
    execute: jest.MockedFunction<GetProfileUseCase['execute']>;
  };

  const mockUserProfile: UserProfileDto = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'user@example.com',
    displayName: 'Test User',
    roles: [Role.PLAYER],
    isActive: true,
    lastLogin: new Date(),
    createdAt: new Date(),
  };

  beforeEach(async () => {
    mockAddRoleUseCase = { execute: jest.fn() };
    mockRemoveRoleUseCase = { execute: jest.fn() };
    mockGetProfileUseCase = { execute: jest.fn() };

    const module = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: AddRoleUseCase, useValue: mockAddRoleUseCase },
        { provide: RemoveRoleUseCase, useValue: mockRemoveRoleUseCase },
        { provide: GetProfileUseCase, useValue: mockGetProfileUseCase },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<UsersController>(UsersController);
  });

  describe('getUser', () => {
    it('should return user profile by ID', async () => {
      // Arrange
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      mockGetProfileUseCase.execute.mockResolvedValue(mockUserProfile);

      // Act
      const result = await controller.getUser(userId);

      // Assert
      expect(mockGetProfileUseCase.execute).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockUserProfile);
    });

    it('should propagate NotFoundException when user does not exist', async () => {
      // Arrange
      const userId = 'non-existent-id';
      mockGetProfileUseCase.execute.mockRejectedValue(
        new NotFoundException(`User with id ${userId} not found`),
      );

      // Act and Assert
      await expect(controller.getUser(userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addRole', () => {
    it('should add a role to a user and return updated profile', async () => {
      // Arrange
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const updatedProfile: UserProfileDto = {
        ...mockUserProfile,
        roles: [Role.PLAYER, Role.DEVELOPER],
      };

      mockAddRoleUseCase.execute.mockResolvedValue(updatedProfile);

      // Act
      const result = await controller.addRole(userId, { role: Role.DEVELOPER });

      // Assert
      expect(mockAddRoleUseCase.execute).toHaveBeenCalledWith(
        userId,
        Role.DEVELOPER,
      );
      expect(result.roles).toContain(Role.DEVELOPER);
    });

    it('should propagate BadRequestException when user already has role', async () => {
      // Arrange
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      mockAddRoleUseCase.execute.mockRejectedValue(
        new BadRequestException(`User already has role: ${Role.PLAYER}`),
      );

      // Act and Assert
      await expect(
        controller.addRole(userId, { role: Role.PLAYER }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should propagate NotFoundException when user does not exist', async () => {
      // Arrange
      const userId = 'non-existent-id';
      mockAddRoleUseCase.execute.mockRejectedValue(
        new NotFoundException(`User with id ${userId} not found`),
      );

      // Act and Assert
      await expect(
        controller.addRole(userId, { role: Role.DEVELOPER }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeRole', () => {
    it('should remove a role from a user and return updated profile', async () => {
      // Arrange
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const updatedProfile: UserProfileDto = {
        ...mockUserProfile,
        roles: [Role.PLAYER],
      };

      mockRemoveRoleUseCase.execute.mockResolvedValue(updatedProfile);

      // Act
      const result = await controller.removeRole(userId, Role.DEVELOPER);

      // Assert
      expect(mockRemoveRoleUseCase.execute).toHaveBeenCalledWith(
        userId,
        Role.DEVELOPER,
      );
      expect(result.roles).not.toContain(Role.DEVELOPER);
    });

    it('should propagate BadRequestException when trying to remove PLAYER role', async () => {
      // Arrange
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      mockRemoveRoleUseCase.execute.mockRejectedValue(
        new BadRequestException(
          'Cannot remove PLAYER role. All users must have this role.',
        ),
      );

      // Act and Assert
      await expect(controller.removeRole(userId, Role.PLAYER)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should propagate BadRequestException when user does not have the role', async () => {
      // Arrange
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      mockRemoveRoleUseCase.execute.mockRejectedValue(
        new BadRequestException(`User does not have role: ${Role.DEVELOPER}`),
      );

      // Act and Assert
      await expect(
        controller.removeRole(userId, Role.DEVELOPER),
      ).rejects.toThrow(BadRequestException);
    });

    it('should propagate NotFoundException when user does not exist', async () => {
      // Arrange
      const userId = 'non-existent-id';
      mockRemoveRoleUseCase.execute.mockRejectedValue(
        new NotFoundException(`User with id ${userId} not found`),
      );

      // Act and Assert
      await expect(
        controller.removeRole(userId, Role.DEVELOPER),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
