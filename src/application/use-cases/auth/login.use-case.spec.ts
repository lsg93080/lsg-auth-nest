import { Test } from '@nestjs/testing';
import { MockedInterface } from 'test/test-utils';
import { IAuthProvider } from '@/domain/services/auth-provider.interface';
import { IUserRepository } from '@/domain/repositories/user.repository.interface';
import { LoginUseCase } from './login.use-case';
import { UnauthorizedException } from '@nestjs/common';
import { AUTH_PROVIDER } from '@/domain/services/auth-provider.interface';
import { USER_REPOSITORY } from '@/domain/repositories/user.repository.interface';
import { JwtService } from '@nestjs/jwt';
import { UserEntity } from '@/domain/entities/user.entity';
import { Role } from '@/domain/value-objects/role.vo';

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;
  let mockAuthProvider: MockedInterface<IAuthProvider>;
  let mockUserRepository: MockedInterface<IUserRepository>;
  let mockJwtService: {
    sign: jest.MockedFunction<JwtService['sign']>;
  };

  beforeEach(async () => {
    // Create mocks
    mockAuthProvider = {
      verifyToken: jest.fn(),
    };

    mockUserRepository = {
      findByAuthProviderId: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    mockJwtService = {
      sign: jest.fn(),
    };

    // Create testing module
    const module = await Test.createTestingModule({
      providers: [
        LoginUseCase,
        { provide: AUTH_PROVIDER, useValue: mockAuthProvider },
        { provide: USER_REPOSITORY, useValue: mockUserRepository },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    useCase = module.get<LoginUseCase>(LoginUseCase);
  });

  describe('execute', () => {
    it('should login existing user successfully', async () => {
      // Arrange
      const authProviderToken = 'valid_auth_provider_token';
      const decodedToken = {
        uid: 'auth_provider_uid_123',
        email: 'test@example.com',
        name: 'Test User',
      };

      const existingUser = new UserEntity(
        'test_user_id',
        'auth_provider_uid_123',
        'test@example.com',
        [Role.PLAYER],
        'Test User',
        true,
        new Date('2025-01-01'),
        new Date('2025-01-01'),
        new Date('2025-01-01'),
      );

      const updatedUser = new UserEntity(
        'test_user_id',
        'auth_provider_uid_123',
        'test@example.com',
        [Role.PLAYER],
        'Test User',
        true,
        new Date(),
        new Date('2025-01-01'),
        new Date(),
      );

      mockAuthProvider.verifyToken.mockResolvedValue(decodedToken);
      mockUserRepository.findByAuthProviderId.mockResolvedValue(existingUser);
      mockUserRepository.update.mockResolvedValue(updatedUser);
      mockJwtService.sign.mockReturnValue('generated_jwt_token');

      // Act
      const result = await useCase.execute(authProviderToken);

      // Assert
      expect(mockAuthProvider.verifyToken).toHaveBeenCalledWith(
        authProviderToken,
      );
      expect(mockUserRepository.findByAuthProviderId).toHaveBeenCalledWith(
        'auth_provider_uid_123',
      );
      expect(mockUserRepository.update).toHaveBeenCalledTimes(1);
      const [, updatePayload] = mockUserRepository.update.mock.calls[0];
      expect(updatePayload.lastLogin).toBeInstanceOf(Date);

      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: 'test_user_id',
        email: 'test@example.com',
        roles: [Role.PLAYER],
      });
      expect(result.access_token).toBe('generated_jwt_token');
      expect(result.isNewUser).toBe(false);
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.roles).toContain(Role.PLAYER);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      // Arrange
      const authProviderToken = 'valid_auth_provider_token';
      const decodedToken = {
        uid: 'auth_provider_uid_123',
        email: 'test@example.com',
        name: 'Test User',
      };

      mockAuthProvider.verifyToken.mockResolvedValue(decodedToken);
      mockUserRepository.findByAuthProviderId.mockResolvedValue(null);

      // Act and Assert
      await expect(useCase.execute(authProviderToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(useCase.execute(authProviderToken)).rejects.toThrow(
        'User not found. Please register first.',
      );
    });

    it('should throw UnauthorizedException when auth provider token is invalid', async () => {
      // Arrange
      const invalidToken = 'invalid_auth_provider_token';
      mockAuthProvider.verifyToken.mockRejectedValue(
        new UnauthorizedException('Invalid token'),
      );

      // Act and Assert
      await expect(useCase.execute(invalidToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
