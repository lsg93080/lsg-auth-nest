import { OAuthConnectionMapper } from './oauth-connection.mapper';
import { OAuthConnectionEntity } from '@/domain/entities/oauth-connection.entity';
import { OAuthProvider } from '@/domain/value-objects/oauth-provider.vo';

describe('OAuthConnectionMapper', () => {
  const entity = new OAuthConnectionEntity(
    '661f8400-e29b-41d4-a716-446655440111',
    '550e8400-e29b-41d4-a716-446655440000',
    OAuthProvider.GITLAB,
    '12345678',
    'encrypted-access-token',
    'encrypted-refresh-token',
    new Date('2026-12-31'),
    ['read_user', 'read_api'],
    new Date('2026-01-01'),
    new Date('2026-02-01'),
  );

  describe('toDto', () => {
    it('should map all safe fields correctly', () => {
      // Act
      const dto = OAuthConnectionMapper.toDto(entity);

      // Assert
      expect(dto.id).toBe('661f8400-e29b-41d4-a716-446655440111');
      expect(dto.userId).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(dto.provider).toBe(OAuthProvider.GITLAB);
      expect(dto.providerUserId).toBe('12345678');
      expect(dto.scopes).toEqual(['read_user', 'read_api']);
      expect(dto.tokenExpiresAt).toEqual(new Date('2026-12-31'));
      expect(dto.createdAt).toEqual(new Date('2026-01-01'));
      expect(dto.updatedAt).toEqual(new Date('2026-02-01'));
    });

    it('should never include accessToken in the DTO', () => {
      // Act
      const dto = OAuthConnectionMapper.toDto(entity);

      // Assert
      expect(dto).not.toHaveProperty('accessToken');
    });

    it('should never include refreshToken in the DTO', () => {
      // Act
      const dto = OAuthConnectionMapper.toDto(entity);

      // Assert
      expect(dto).not.toHaveProperty('refreshToken');
    });

    it('should handle null tokenExpiresAt', () => {
      // Arrange
      const entityWithoutExpiry = new OAuthConnectionEntity(
        '661f8400-e29b-41d4-a716-446655440111',
        '550e8400-e29b-41d4-a716-446655440000',
        OAuthProvider.GITLAB,
        '12345678',
        'encrypted-access-token',
        null,
        null,
        ['read_user'],
        new Date(),
        new Date(),
      );

      // Act
      const dto = OAuthConnectionMapper.toDto(entityWithoutExpiry);

      // Assert
      expect(dto.tokenExpiresAt).toBeNull();
    });
  });

  describe('toDtoList', () => {
    it('should map a list of entities to DTOs', () => {
      // Arrange
      const entities = [entity, entity];

      // Act
      const dtos = OAuthConnectionMapper.toDtoList(entities);

      // Assert
      expect(dtos).toHaveLength(2);
      dtos.forEach((dto) => {
        expect(dto).not.toHaveProperty('accessToken');
        expect(dto).not.toHaveProperty('refreshToken');
      });
    });

    it('should return an empty array for an empty input', () => {
      // Act
      const dtos = OAuthConnectionMapper.toDtoList([]);

      // Assert
      expect(dtos).toEqual([]);
    });
  });
});
