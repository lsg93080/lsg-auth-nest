import { Test } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { LoginUseCase } from '@/application/use-cases/auth/login.use-case';
import { RegisterUseCase } from '@/application/use-cases/auth/register.use-case';
import { GetProfileUseCase } from '@/application/use-cases/auth/get-profile.use-case';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { Role } from '@/domain/value-objects/role.vo';
import type { CurrentUserData } from '../types/authenticated-request.interface';

describe('AuthController', () => {
  let controller: AuthController;
  let mockLoginUseCase: {
    execute: jest.MockedFunction<LoginUseCase['execute']>;
  };
  let mockRegisterUseCase: {
    execute: jest.MockedFunction<RegisterUseCase['execute']>;
  };
  let mockGetProfileUseCase: {
    execute: jest.MockedFunction<GetProfileUseCase['execute']>;
  };

  beforeEach(async () => {
    mockLoginUseCase = { execute: jest.fn() };
    mockRegisterUseCase = { execute: jest.fn() };
    mockGetProfileUseCase = { execute: jest.fn() };

    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: LoginUseCase, useValue: mockLoginUseCase },
        { provide: RegisterUseCase, useValue: mockRegisterUseCase },
        { provide: GetProfileUseCase, useValue: mockGetProfileUseCase },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('register', () => {
    it('should call RegisterUseCase with extracted token and return result', async () => {
      // Arrange
      const authHeader = 'Bearer authProvider_token_123';
      const expectedResponse = {
        access_token: 'jwt_token',
        isNewUser: true,
        user: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'new@example.com',
          displayName: 'New User',
          roles: [Role.PLAYER],
        },
      };

      mockRegisterUseCase.execute.mockResolvedValue(expectedResponse);

      // Act
      const result = await controller.register(authHeader);

      // Assert
      expect(mockRegisterUseCase.execute).toHaveBeenCalledWith(
        'authProvider_token_123',
      );
      expect(result).toEqual(expectedResponse);
    });

    it('should throw UnauthorizedException when Authorization header is empty', async () => {
      // Act and Assert: empty string is falsy, same path as missing header
      await expect(controller.register('')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(controller.register('')).rejects.toThrow(
        'No token provided',
      );
      expect(mockRegisterUseCase.execute).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when Authorization header does not start with Bearer', async () => {
      // Act and Assert
      await expect(controller.register('Basic abc123')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockRegisterUseCase.execute).not.toHaveBeenCalled();
    });

    it('should propagate exceptions from RegisterUseCase', async () => {
      // Arrange
      mockRegisterUseCase.execute.mockRejectedValue(
        new UnauthorizedException('Invalid token'),
      );

      // Act and Assert
      await expect(
        controller.register('Bearer authProvider_token_invalid'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login', () => {
    it('should call LoginUseCase with extracted token and return result', async () => {
      // Arrange
      const authHeader = 'Bearer authProvider_token_456';
      const expectedResponse = {
        access_token: 'jwt_token',
        isNewUser: false,
        user: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'existing@example.com',
          displayName: 'Existing User',
          roles: [Role.PLAYER, Role.DEVELOPER],
        },
      };

      mockLoginUseCase.execute.mockResolvedValue(expectedResponse);

      // Act
      const result = await controller.login(authHeader);

      // Assert
      expect(mockLoginUseCase.execute).toHaveBeenCalledWith(
        'authProvider_token_456',
      );
      expect(result).toEqual(expectedResponse);
    });

    it('should throw UnauthorizedException when Authorization header is empty', async () => {
      // Act and Assert
      await expect(controller.login('')).rejects.toThrow(UnauthorizedException);
      expect(mockLoginUseCase.execute).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when Authorization header does not start with Bearer', async () => {
      // Act and Assert
      await expect(controller.login('Token abc123')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockLoginUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    it('should call GetProfileUseCase with userId from JWT and return profile', async () => {
      // Arrange
      const currentUser: CurrentUserData = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        email: 'user@example.com',
        roles: [Role.PLAYER],
      };

      const expectedProfile = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'user@example.com',
        displayName: 'Test User',
        roles: [Role.PLAYER],
        isActive: true,
        lastLogin: new Date(),
        createdAt: new Date(),
      };

      mockGetProfileUseCase.execute.mockResolvedValue(expectedProfile);

      // Act
      const result = await controller.getProfile(currentUser);

      // Assert
      expect(mockGetProfileUseCase.execute).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
      );
      expect(result).toEqual(expectedProfile);
    });

    it('should propagate NotFoundException from GetProfileUseCase', async () => {
      // Arrange
      const currentUser: CurrentUserData = {
        userId: 'non-existent-id',
        email: 'ghost@example.com',
        roles: [Role.PLAYER],
      };

      mockGetProfileUseCase.execute.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      // Act
      const promise = controller.getProfile(currentUser);

      // Assert
      await expect(promise).rejects.toThrow(NotFoundException);
      await expect(promise).rejects.toThrow('User not found');
    });
  });
});
