import { Test } from '@nestjs/testing';
import { ValidateTokenUseCase } from './validate-token.use-case';
import { JwtService } from '@nestjs/jwt';

describe('ValidateTokenUseCase', () => {
  let useCase: ValidateTokenUseCase;
  let mockJwtService: {
    verify: jest.MockedFunction<JwtService['verify']>;
  };

  beforeEach(async () => {
    mockJwtService = {
      verify: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        ValidateTokenUseCase,
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    useCase = module.get<ValidateTokenUseCase>(ValidateTokenUseCase);
  });

  describe('execute', () => {
    it('should return valid true and userId when token is valid', () => {
      // Arrange
      const token = 'valid.jwt.token';
      const payload = {
        sub: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        roles: ['player'],
      };

      mockJwtService.verify.mockReturnValue(payload);

      // Act
      const result = useCase.execute(token);

      // Assert
      expect(mockJwtService.verify).toHaveBeenCalledWith(token);
      expect(result).toEqual({
        valid: true,
        userId: '550e8400-e29b-41d4-a716-446655440000',
      });
    });

    it('should return valid false when token is invalid', () => {
      // Arrange
      const invalidToken = 'invalid.jwt.token';
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act
      const result = useCase.execute(invalidToken);

      // Assert
      expect(mockJwtService.verify).toHaveBeenCalledWith(invalidToken);
      expect(result).toEqual({ valid: false });
    });

    it('should return valid false when token is expired', () => {
      // Arrange
      const expiredToken = 'expired.jwt.token';
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Token expired');
      });

      // Act
      const result = useCase.execute(expiredToken);

      // Assert
      expect(result).toEqual({ valid: false });
    });

    it('should return valid false when token is malformed', () => {
      // Arrange
      const malformedToken = 'not-a-jwt';
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Malformed token');
      });

      // Act
      const result = useCase.execute(malformedToken);

      // Assert
      expect(result).toEqual({ valid: false });
    });
  });
});
