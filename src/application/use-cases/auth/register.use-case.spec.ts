import { Test } from '@nestjs/testing';
import { RegisterUseCase } from './register.use-case';
import { ConflictException } from '@nestjs/common';
import type { IAuthProvider } from '@/domain/services/auth-provider.interface';
import type { IUserRepository } from '@/domain/repositories/user.repository.interface';
import type { IIdGenerator } from '@/domain/services/id-generator.interface';
import { AUTH_PROVIDER } from '@/domain/services/auth-provider.interface';
import { USER_REPOSITORY } from '@/domain/repositories/user.repository.interface';
import { ID_GENERATOR } from '@/domain/services/id-generator.interface';
import { JwtService } from '@nestjs/jwt';
import { UserEntity } from '@/domain/entities/user.entity';
import { Role } from '@/domain/value-objects/role.vo';

describe('RegisterUseCase', () => {
  let useCase: RegisterUseCase;
  let mockAuthProvider: jest.Mocked<IAuthProvider>;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockIdGenerator: jest.Mocked<IIdGenerator>;
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
      save: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    mockIdGenerator = {
      generate: jest.fn(),
    };

    mockJwtService = {
      sign: jest.fn(),
    };

    // Create testing module
    const module = await Test.createTestingModule({
      providers: [
        RegisterUseCase,
        { provide: AUTH_PROVIDER, useValue: mockAuthProvider },
        { provide: USER_REPOSITORY, useValue: mockUserRepository },
        { provide: ID_GENERATOR, useValue: mockIdGenerator },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    useCase = module.get<RegisterUseCase>(RegisterUseCase);
  });

  describe('execute', () => {
    it('should register new user successfully', async () => {
      // Arrange
      const authProviderToken = 'valid_auth_provider_token';
      const decodedToken = {
        uid: 'auth_provider_uid_123',
        email: 'newuser@example.com',
        name: 'New User',
      };

      const generatedId = 'generated-uuid-666';

      // New user created (with generated ID)
      const newUser = new UserEntity(
        generatedId,
        'auth_provider_uid_123',
        'newuser@example.com',
        [Role.PLAYER],
        'New User',
        true,
        new Date(),
      );

      mockAuthProvider.verifyToken.mockResolvedValue(decodedToken);
      mockUserRepository.findByAuthProviderId.mockResolvedValue(null); // User doesn't exist
      mockIdGenerator.generate.mockReturnValue(generatedId); // Mock ID generation
      mockUserRepository.save.mockResolvedValue(newUser);
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
      expect(mockIdGenerator.generate).toHaveBeenCalled();
      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: generatedId,
          authProviderId: 'auth_provider_uid_123',
          email: 'newuser@example.com',
        }),
      );
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: generatedId,
        email: 'newuser@example.com',
        roles: [Role.PLAYER],
      });
      expect(result.access_token).toBe('generated_jwt_token');
      expect(result.isNewUser).toBe(true);
      expect(result.user.id).toBe(generatedId);
      expect(result.user.email).toBe('newuser@example.com');
    });

    it('should throw ConflictException when user already exists', async () => {
      // Arrange
      const authProviderToken = 'valid_auth_provider_token';
      const decodedToken = {
        uid: 'auth_provider_uid_123',
        email: 'existing@example.com',
        name: 'Existing User',
      };

      const existingUser = new UserEntity(
        'existing-uuid-777',
        'auth_provider_uid_123',
        'existing@example.com',
        [Role.PLAYER, Role.DEVELOPER],
        'Existing User',
        true,
        new Date(),
        new Date(),
        new Date(),
      );

      mockAuthProvider.verifyToken.mockResolvedValue(decodedToken);
      mockUserRepository.findByAuthProviderId.mockResolvedValue(existingUser); // User exists

      // Act and Assert
      await expect(useCase.execute(authProviderToken)).rejects.toThrow(
        ConflictException,
      );
      await expect(useCase.execute(authProviderToken)).rejects.toThrow(
        'User already exists. Please login instead.',
      );

      // ID generator should not be called
      expect(mockIdGenerator.generate).not.toHaveBeenCalled();
    });
  });
});
