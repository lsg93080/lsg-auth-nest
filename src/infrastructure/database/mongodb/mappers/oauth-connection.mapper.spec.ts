import { OAuthConnectionMapper } from './oauth-connection.mapper';
import { OAuthConnectionEntity } from '@/domain/entities/oauth-connection.entity';
import { OAuthProvider } from '@/domain/value-objects/oauth-provider.vo';
import type { OAuthConnectionDocument } from '../schemas/oauth-connection.schema';

// Helper to create a minimal mock MongoDB document
const makeMockDoc = (
  overrides: Partial<OAuthConnectionDocument> = {},
): OAuthConnectionDocument => {
  return {
    id: '661f8400-e29b-41d4-a716-446655440111',
    userId: '550e8400-e29b-41d4-a716-446655440000',
    provider: OAuthProvider.GITLAB,
    providerUserId: '12345678',
    accessToken: 'encrypted-access-token',
    refreshToken: 'encrypted-refresh-token',
    tokenExpiresAt: new Date('2026-12-31'),
    scopes: ['read_user', 'read_api'],
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-02-01'),
    ...overrides,
  } as unknown as OAuthConnectionDocument;
};

const makeEntity = (): OAuthConnectionEntity => {
  return new OAuthConnectionEntity(
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
};

describe('OAuthConnectionMapper (infrastructure)', () => {
  describe('toDomain', () => {
    it('should map a document to a domain entity with all fields', () => {
      // Arrange
      const doc = makeMockDoc();

      // Act
      const entity = OAuthConnectionMapper.toDomain(doc);

      // Assert
      expect(entity).not.toBeNull();
      expect(entity!.id).toBe('661f8400-e29b-41d4-a716-446655440111');
      expect(entity!.userId).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(entity!.provider).toBe(OAuthProvider.GITLAB);
      expect(entity!.providerUserId).toBe('12345678');
      expect(entity!.accessToken).toBe('encrypted-access-token');
      expect(entity!.refreshToken).toBe('encrypted-refresh-token');
      expect(entity!.tokenExpiresAt).toEqual(new Date('2026-12-31'));
      expect(entity!.scopes).toEqual(['read_user', 'read_api']);
      expect(entity!.createdAt).toEqual(new Date('2026-01-01'));
      expect(entity!.updatedAt).toEqual(new Date('2026-02-01'));
    });

    it('should return null when document is null', () => {
      // Act
      const result = OAuthConnectionMapper.toDomain(null);

      // Assert
      expect(result).toBeNull();
    });

    it('should map null refreshToken correctly', () => {
      // Arrange
      const doc = makeMockDoc({ refreshToken: null });

      // Act
      const entity = OAuthConnectionMapper.toDomain(doc);

      // Assert
      expect(entity!.refreshToken).toBeNull();
    });

    it('should map null tokenExpiresAt correctly', () => {
      // Arrange
      const doc = makeMockDoc({ tokenExpiresAt: null });

      // Act
      const entity = OAuthConnectionMapper.toDomain(doc);

      // Assert
      expect(entity!.tokenExpiresAt).toBeNull();
    });

    it('should return an instance of OAuthConnectionEntity', () => {
      // Arrange
      const doc = makeMockDoc();

      // Act
      const entity = OAuthConnectionMapper.toDomain(doc);

      // Assert
      expect(entity).toBeInstanceOf(OAuthConnectionEntity);
    });
  });

  describe('toDomainOrThrow', () => {
    it('should map a document to a domain entity', () => {
      // Arrange
      const doc = makeMockDoc();

      // Act
      const entity = OAuthConnectionMapper.toDomainOrThrow(doc);

      // Assert
      expect(entity).toBeInstanceOf(OAuthConnectionEntity);
      expect(entity.id).toBe('661f8400-e29b-41d4-a716-446655440111');
    });

    it('should throw when document is null', () => {
      // Act and Assert
      expect(() => OAuthConnectionMapper.toDomainOrThrow(null)).toThrow(
        'Cannot map null OAuthConnection to domain entity',
      );
    });
  });

  describe('toPersistence', () => {
    it('should map a domain entity to persistence object', () => {
      // Arrange
      const entity = makeEntity();

      // Act
      const persistence = OAuthConnectionMapper.toPersistence(entity);

      // Assert
      expect(persistence.id).toBe('661f8400-e29b-41d4-a716-446655440111');
      expect(persistence.userId).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(persistence.provider).toBe(OAuthProvider.GITLAB);
      expect(persistence.providerUserId).toBe('12345678');
      expect(persistence.accessToken).toBe('encrypted-access-token');
      expect(persistence.refreshToken).toBe('encrypted-refresh-token');
      expect(persistence.tokenExpiresAt).toEqual(new Date('2026-12-31'));
      expect(persistence.scopes).toEqual(['read_user', 'read_api']);
    });

    it('should not include createdAt or updatedAt (managed by MongoDB timestamps)', () => {
      // Arrange
      const entity = makeEntity();

      // Act
      const persistence = OAuthConnectionMapper.toPersistence(entity);

      // Assert: timestamps are managed by Mongoose automatically
      expect(persistence).not.toHaveProperty('createdAt');
      expect(persistence).not.toHaveProperty('updatedAt');
    });

    it('should map null refreshToken correctly', () => {
      // Arrange
      const entity = new OAuthConnectionEntity(
        '661f8400-e29b-41d4-a716-446655440111',
        '550e8400-e29b-41d4-a716-446655440000',
        OAuthProvider.GITLAB,
        '12345678',
        'encrypted-access-token',
        null, // no refresh token
        null,
        ['read_user'],
        new Date(),
        new Date(),
      );

      // Act
      const persistence = OAuthConnectionMapper.toPersistence(entity);

      // Assert
      expect(persistence.refreshToken).toBeNull();
      expect(persistence.tokenExpiresAt).toBeNull();
    });

    it('should preserve the encrypted token as-is (no decryption)', () => {
      // Arrange
      const entity = makeEntity();

      // Act
      const persistence = OAuthConnectionMapper.toPersistence(entity);

      // Assert: the mapper never decrypts, it stores what the entity has
      expect(persistence.accessToken).toBe('encrypted-access-token');
    });
  });

  describe('toDomainList', () => {
    it('should map a list of documents to entities', () => {
      // Arrange
      const docs = [makeMockDoc(), makeMockDoc({ id: 'another-id' })];

      // Act
      const entities = OAuthConnectionMapper.toDomainList(docs);

      // Assert
      expect(entities).toHaveLength(2);
      entities.forEach((e) => expect(e).toBeInstanceOf(OAuthConnectionEntity));
    });

    it('should return an empty array for an empty input', () => {
      // Act
      const entities = OAuthConnectionMapper.toDomainList([]);

      // Assert
      expect(entities).toEqual([]);
    });

    it('should filter out null results (defensive, should not happen with valid docs)', () => {
      // Arrange: toDomain handles null check internally. toDomainList filters them
      const docs = [makeMockDoc()];

      // Act
      const entities = OAuthConnectionMapper.toDomainList(docs);

      // Assert
      expect(entities).toHaveLength(1);
    });
  });

  describe('round-trip toDomain-toPersistence', () => {
    it('should preserve all fields through a domain-persistence cycle', () => {
      // Arrange
      const originalDoc = makeMockDoc();

      // Act
      const entity = OAuthConnectionMapper.toDomain(originalDoc)!;
      const persistence = OAuthConnectionMapper.toPersistence(entity);

      // Assert
      expect(persistence.id).toBe(originalDoc.id);
      expect(persistence.userId).toBe(originalDoc.userId);
      expect(persistence.provider).toBe(originalDoc.provider);
      expect(persistence.providerUserId).toBe(originalDoc.providerUserId);
      expect(persistence.accessToken).toBe(originalDoc.accessToken);
      expect(persistence.refreshToken).toBe(originalDoc.refreshToken);
      expect(persistence.tokenExpiresAt).toEqual(originalDoc.tokenExpiresAt);
      expect(persistence.scopes).toEqual(originalDoc.scopes);
    });
  });
});
