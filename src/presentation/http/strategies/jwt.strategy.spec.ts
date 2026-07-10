import { Test } from '@nestjs/testing';
import { JwtStrategy } from './jwt.strategy';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import type { JwtPayload } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn().mockReturnValue('test-secret'),
    };

    const module = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  describe('validate', () => {
    it('should return user data when payload is valid', async () => {
      // Arrange
      const validPayload: JwtPayload = {
        sub: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        roles: ['player'],
      };

      // Act
      const result = await strategy.validate(validPayload);

      // Assert
      expect(result).toEqual({
        userId: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        roles: ['player'],
      });
    });

    it('should return user with multiple roles', async () => {
      // Arrange
      const validPayload: JwtPayload = {
        sub: '550e8400-e29b-41d4-a716-446655440000',
        email: 'developer@example.com',
        roles: ['player', 'developer'],
      };

      // Act
      const result = await strategy.validate(validPayload);

      // Assert
      expect(result.roles).toEqual(['player', 'developer']);
    });

    it('should throw UnauthorizedException when sub is missing', async () => {
      // Arrange
      const invalidPayload: JwtPayload = {
        sub: '',
        email: 'test@example.com',
        roles: ['player'],
      };

      // Act and Assert
      await expect(strategy.validate(invalidPayload)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(invalidPayload)).rejects.toThrow(
        'Invalid token payload',
      );
    });

    it('should throw UnauthorizedException when email is missing', async () => {
      // Arrange
      const invalidPayload: JwtPayload = {
        sub: '550e8400-e29b-41d4-a716-446655440000',
        email: '',
        roles: ['player'],
      };

      // Act and Assert
      await expect(strategy.validate(invalidPayload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when roles is not an array', async () => {
      // Arrange
      const invalidPayload = {
        sub: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        roles: 'player',
      } as unknown as JwtPayload;

      // Act and Assert
      await expect(strategy.validate(invalidPayload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when roles is empty array', async () => {
      // Arrange
      const invalidPayload: JwtPayload = {
        sub: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        roles: [],
      };

      // Act and Assert
      await expect(strategy.validate(invalidPayload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when roles is null', async () => {
      // Arrange
      const invalidPayload = {
        sub: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        roles: null,
      } as unknown as JwtPayload;

      // Act and Assert
      await expect(strategy.validate(invalidPayload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when sub is null', async () => {
      // Arrange
      const invalidPayload = {
        sub: null,
        email: 'test@example.com',
        roles: ['player'],
      } as unknown as JwtPayload;

      // Act and Assert
      await expect(strategy.validate(invalidPayload)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('constructor', () => {
    it('should throw error when JWT_SECRET is not defined', () => {
      // Arrange
      const mockConfigService = {
        get: jest.fn().mockReturnValue(undefined),
      };

      // Act and Assert
      expect(() => {
        new JwtStrategy(mockConfigService as unknown as ConfigService);
      }).toThrow('JWT_SECRET is not defined in environment variables');
    });
  });
});
