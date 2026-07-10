import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { Role } from '@/domain/value-objects/role.vo';
import type {
  AuthenticatedRequest,
  CurrentUserData,
} from '../types/authenticated-request.interface';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  // Helper to create mock ExecutionContext with typed user

  const createMockContext = (
    user: CurrentUserData | null,
  ): ExecutionContext => {
    const mockRequest: Partial<AuthenticatedRequest> = {
      user: user as CurrentUserData,
    };

    return {
      switchToHttp: () => ({
        getRequest: (): Partial<AuthenticatedRequest> => mockRequest,
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;
  };

  describe('when no roles are required', () => {
    it('should allow access for any user', () => {
      // Arrange
      const user: CurrentUserData = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        roles: [Role.PLAYER],
      };

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      const context = createMockContext(user);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should allow access even if user has no roles', () => {
      // Arrange
      const user: CurrentUserData = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        roles: [],
      };

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      const context = createMockContext(user);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('when roles are required', () => {
    it('should allow access when user has the required role', () => {
      // Arrange
      const user: CurrentUserData = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        email: 'admin@example.com',
        roles: [Role.PLAYER, Role.ADMIN],
      };

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
      const context = createMockContext(user);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should deny access when user lacks the required role', () => {
      // Arrange
      const user: CurrentUserData = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        email: 'user@example.com',
        roles: [Role.PLAYER],
      };

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
      const context = createMockContext(user);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(false);
    });

    it('should allow access when user has at least one of multiple required roles', () => {
      // Arrange
      const user: CurrentUserData = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        email: 'developer@example.com',
        roles: [Role.PLAYER, Role.DEVELOPER],
      };

      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([Role.ADMIN, Role.DEVELOPER]);
      const context = createMockContext(user);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should deny access when user has none of the required roles', () => {
      // Arrange
      const user: CurrentUserData = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        email: 'user@example.com',
        roles: [Role.PLAYER],
      };

      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([Role.ADMIN, Role.DEVELOPER]);
      const context = createMockContext(user);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(false);
    });

    it('should handle user with undefined roles gracefully', () => {
      // Arrange
      const user = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        email: 'user@example.com',
        roles: undefined as unknown as string[],
      };

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
      const context = createMockContext(user);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(false);
    });

    it('should handle user with empty roles array', () => {
      // Arrange
      const user: CurrentUserData = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        email: 'user@example.com',
        roles: [],
      };

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
      const context = createMockContext(user);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle developer role correctly', () => {
      // Arrange
      const user: CurrentUserData = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        email: 'dev@example.com',
        roles: [Role.PLAYER, Role.DEVELOPER],
      };

      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([Role.DEVELOPER]);
      const context = createMockContext(user);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should work with all three roles', () => {
      // Arrange
      const superUser: CurrentUserData = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        email: 'super@example.com',
        roles: [Role.PLAYER, Role.DEVELOPER, Role.ADMIN],
      };

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
      const context = createMockContext(superUser);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(superUser.roles).toHaveLength(3);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});
