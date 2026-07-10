import { Test } from '@nestjs/testing';
import { InternalController } from './internal.controller';
import { GrantDeveloperRoleUseCase } from '@/application/use-cases/roles/grant-developer-role.use-case';
import { ValidateTokenUseCase } from '@/application/use-cases/auth/validate-token.use-case';
import { GetProfileUseCase } from '@/application/use-cases/auth/get-profile.use-case';
import { GetOAuthTokenUseCase } from '@/application/use-cases/oauth/get-oauth-token.use-case';
import { DeleteOAuthConnectionByProviderUseCase } from '@/application/use-cases/oauth/delete-oauth-connection-by-provider.use-case';
import { NotFoundException } from '@nestjs/common';
import { Role } from '@/domain/value-objects/role.vo';
import { OAuthProvider } from '@/domain/value-objects/oauth-provider.vo';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { UserProfileDto } from '@/application/dto/auth/user-profile.dto';

describe('InternalController', () => {
  let controller: InternalController;
  let mockGrantDeveloperRoleUseCase: {
    execute: jest.MockedFunction<GrantDeveloperRoleUseCase['execute']>;
  };
  let mockValidateTokenUseCase: {
    execute: jest.MockedFunction<ValidateTokenUseCase['execute']>;
  };
  let mockGetProfileUseCase: {
    execute: jest.MockedFunction<GetProfileUseCase['execute']>;
  };
  let mockGetOAuthTokenUseCase: {
    execute: jest.MockedFunction<GetOAuthTokenUseCase['execute']>;
  };
  let mockDeleteOAuthConnectionByProviderUseCase: {
    execute: jest.MockedFunction<
      DeleteOAuthConnectionByProviderUseCase['execute']
    >;
  };

  beforeEach(async () => {
    mockGrantDeveloperRoleUseCase = {
      execute: jest.fn(),
    };

    mockValidateTokenUseCase = {
      execute: jest.fn(),
    };

    mockGetProfileUseCase = {
      execute: jest.fn(),
    };

    mockGetOAuthTokenUseCase = {
      execute: jest.fn(),
    };

    mockDeleteOAuthConnectionByProviderUseCase = {
      execute: jest.fn(),
    };

    const module = await Test.createTestingModule({
      controllers: [InternalController],
      providers: [
        {
          provide: GrantDeveloperRoleUseCase,
          useValue: mockGrantDeveloperRoleUseCase,
        },
        { provide: ValidateTokenUseCase, useValue: mockValidateTokenUseCase },
        { provide: GetProfileUseCase, useValue: mockGetProfileUseCase },
        { provide: GetOAuthTokenUseCase, useValue: mockGetOAuthTokenUseCase },
        {
          provide: DeleteOAuthConnectionByProviderUseCase,
          useValue: mockDeleteOAuthConnectionByProviderUseCase,
        },
      ],
    })
      .overrideGuard(ApiKeyGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<InternalController>(InternalController);
  });

  describe('validateToken', () => {
    it('should return valid true with user data when token is valid', async () => {
      // Arrange
      const token = 'valid.jwt.token';
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      mockValidateTokenUseCase.execute.mockReturnValue({
        valid: true,
        userId,
      });

      mockGetProfileUseCase.execute.mockResolvedValue({
        id: userId,
        email: 'gandalf@valinor.me',
        displayName: 'Gandalf the Grey',
        roles: [Role.PLAYER, Role.DEVELOPER],
        isActive: true,
        lastLogin: new Date(),
        createdAt: new Date(),
      });

      // Act
      const result = await controller.validateToken({ token });

      // Assert
      expect(mockValidateTokenUseCase.execute).toHaveBeenCalledWith(token);
      expect(mockGetProfileUseCase.execute).toHaveBeenCalledWith(userId);
      expect(result).toEqual({
        valid: true,
        userId,
        email: 'gandalf@valinor.me',
        roles: [Role.PLAYER, Role.DEVELOPER],
      });
    });

    it('should return valid false when token is invalid', async () => {
      // Arrange
      const invalidToken = 'invalid.jwt.token';

      mockValidateTokenUseCase.execute.mockReturnValue({
        valid: false,
      });

      // Act
      const result = await controller.validateToken({ token: invalidToken });

      // Assert
      expect(mockValidateTokenUseCase.execute).toHaveBeenCalledWith(
        invalidToken,
      );
      expect(mockGetProfileUseCase.execute).not.toHaveBeenCalled();
      expect(result).toEqual({ valid: false });
    });

    it('should return valid false when user is not found', async () => {
      // Arrange
      const token = 'valid.jwt.token';
      const userId = 'non_existent_user_id';

      mockValidateTokenUseCase.execute.mockReturnValue({
        valid: true,
        userId,
      });

      mockGetProfileUseCase.execute.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      // Act
      const result = await controller.validateToken({ token });

      // Assert
      expect(mockValidateTokenUseCase.execute).toHaveBeenCalledWith(token);
      expect(mockGetProfileUseCase.execute).toHaveBeenCalledWith(userId);
      expect(result).toEqual({ valid: false });
    });

    it('should return current user roles from database not from JWT', async () => {
      // Arrange: Simulating JWT has old roles, but DB has updated roles
      const token = 'jwt.with.old.roles';
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      mockValidateTokenUseCase.execute.mockReturnValue({
        valid: true,
        userId,
      });

      // User in database has developer role (updated after JWT was issued)
      mockGetProfileUseCase.execute.mockResolvedValue({
        id: userId,
        email: 'gandalf@valinor.me',
        displayName: 'Gandalf the Grey',
        roles: [Role.PLAYER, Role.DEVELOPER],
        isActive: true,
        lastLogin: new Date(),
        createdAt: new Date(),
      });

      // Act
      const result = await controller.validateToken({ token });

      // Assert
      expect(result.roles).toEqual([Role.PLAYER, Role.DEVELOPER]);
      expect(result.roles).toContain(Role.DEVELOPER); // From DB, not JWT
    });
  });

  describe('grantDeveloperRole', () => {
    it('should grant developer role successfully', async () => {
      // Arrange
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const expectedResult = {
        id: userId,
        roles: [Role.PLAYER, Role.DEVELOPER],
      };

      mockGrantDeveloperRoleUseCase.execute.mockResolvedValue(
        expectedResult as UserProfileDto,
      );

      // Act
      const result = await controller.grantDeveloperRole({ userId });

      // Assert
      expect(mockGrantDeveloperRoleUseCase.execute).toHaveBeenCalledWith(
        userId,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getOAuthToken', () => {
    it('should return the decrypted token for the given user and provider', async () => {
      // Arrange
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const expectedResult = {
        accessToken: 'glpat-xxxxxxxxxxxxxxxxxxxx',
        provider: OAuthProvider.GITLAB,
        providerUserId: '12345678',
      };

      mockGetOAuthTokenUseCase.execute.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.getOAuthToken(
        userId,
        OAuthProvider.GITLAB,
      );

      // Assert
      expect(mockGetOAuthTokenUseCase.execute).toHaveBeenCalledWith({
        userId,
        provider: OAuthProvider.GITLAB,
      });
      expect(result).toEqual(expectedResult);
    });

    it('should propagate NotFoundException when user has no connection for the provider', async () => {
      // Arrange
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      mockGetOAuthTokenUseCase.execute.mockRejectedValue(
        new NotFoundException('No gitlab connection found for this user'),
      );

      // Act and Assert
      await expect(
        controller.getOAuthToken(userId, OAuthProvider.GITLAB),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteOAuthConnection', () => {
    it('should delegate to the delete-by-provider use case', async () => {
      // Arrange
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      mockDeleteOAuthConnectionByProviderUseCase.execute.mockResolvedValue({
        deleted: true,
      });

      // Act
      const result = await controller.deleteOAuthConnection({
        userId,
        provider: OAuthProvider.GITHUB,
      });

      // Assert
      expect(
        mockDeleteOAuthConnectionByProviderUseCase.execute,
      ).toHaveBeenCalledWith({ userId, provider: OAuthProvider.GITHUB });
      expect(result).toEqual({ deleted: true });
    });
  });
});
