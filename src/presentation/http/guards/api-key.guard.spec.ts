import { ApiKeyGuard } from './api-key.guard';
import { ConfigService } from '@nestjs/config';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

interface MockRequest {
  headers: Record<string, string>;
  internalService?: string;
}

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  let mockConfigService: jest.Mocked<Pick<ConfigService, 'get'>>;

  const createMockContext = (
    headers: Record<string, string>,
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: (): MockRequest => ({ headers }),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn(),
    };

    // Default config: one registered service (vitrina)
    mockConfigService.get.mockImplementation((key: string) => {
      const config: Record<string, string> = {
        INTERNAL_SERVICES: 'vitrina',
        VITRINA_API_KEY: 'secret-vitrina-key',
      };
      return config[key];
    });

    guard = new ApiKeyGuard(mockConfigService as unknown as ConfigService);
  });

  describe('canActivate', () => {
    it('should allow access when a valid API key is provided', () => {
      // Arrange
      const context = createMockContext({ 'x-api-key': 'secret-vitrina-key' });

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should throw UnauthorizedException when API key header is missing', () => {
      // Arrange
      const context = createMockContext({});

      // Act and Assert
      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow('API key missing');
    });

    it('should throw UnauthorizedException when API key does not match any service', () => {
      // Arrange
      const context = createMockContext({ 'x-api-key': 'wrong-key' });

      // Act and Assert
      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow('Invalid API key');
    });

    it('should attach internalService name to the request when key is valid', () => {
      // Arrange
      const request: MockRequest = {
        headers: { 'x-api-key': 'secret-vitrina-key' },
      };
      const context = {
        switchToHttp: () => ({ getRequest: (): MockRequest => request }),
      } as unknown as ExecutionContext;

      // Act
      guard.canActivate(context);

      // Assert
      expect(request.internalService).toBe('vitrina');
    });

    it('should support multiple registered services', () => {
      // Arrange: two services configured
      mockConfigService.get.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          INTERNAL_SERVICES: 'vitrina, profile',
          VITRINA_API_KEY: 'secret-vitrina-key',
          PROFILE_API_KEY: 'secret-profile-key',
        };
        return config[key];
      });

      const contextVitrina = createMockContext({
        'x-api-key': 'secret-vitrina-key',
      });
      const contextProfile = createMockContext({
        'x-api-key': 'secret-profile-key',
      });

      // Act and Assert
      expect(guard.canActivate(contextVitrina)).toBe(true);
      expect(guard.canActivate(contextProfile)).toBe(true);
    });

    it('should throw UnauthorizedException when INTERNAL_SERVICES is not configured', () => {
      // Arrange: no services configured
      mockConfigService.get.mockReturnValue(undefined);
      const context = createMockContext({ 'x-api-key': 'any-key' });

      // Act and Assert
      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow('Invalid API key');
    });

    it('should be case-insensitive for service names in INTERNAL_SERVICES', () => {
      // Arrange: service name in uppercase
      mockConfigService.get.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          INTERNAL_SERVICES: 'VITRINA',
          VITRINA_API_KEY: 'secret-vitrina-key',
        };
        return config[key];
      });

      const context = createMockContext({ 'x-api-key': 'secret-vitrina-key' });

      // Act and Assert
      expect(guard.canActivate(context)).toBe(true);
    });
  });
});
