// jest.mock hoists this mock before imports, preventing Mongoose @Prop decorators from executing when loading the schema
jest.mock('../schemas/oauth-connection.schema', () => ({
  OAuthConnection: { name: 'OAuthConnection' },
  OAuthConnectionSchema: {},
}));

import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { MongoOAuthConnectionRepository } from './mongo-oauth-connection.repository';
import { OAuthConnectionEntity } from '@/domain/entities/oauth-connection.entity';
import { OAuthProvider } from '@/domain/value-objects/oauth-provider.vo';

const makeEntity = (
  overrides: Partial<{
    id: string;
    userId: string;
    provider: OAuthProvider;
    providerUserId: string;
    accessToken: string;
    refreshToken: string | null;
    tokenExpiresAt: Date | null;
    scopes: string[];
    createdAt: Date;
    updatedAt: Date;
  }> = {},
): OAuthConnectionEntity => {
  return new OAuthConnectionEntity(
    overrides.id ?? '661f8400-e29b-41d4-a716-446655440111',
    overrides.userId ?? '550e8400-e29b-41d4-a716-446655440000',
    overrides.provider ?? OAuthProvider.GITLAB,
    overrides.providerUserId ?? '12345678',
    overrides.accessToken ?? 'encrypted-access-token',
    overrides.refreshToken ?? null,
    overrides.tokenExpiresAt ?? null,
    overrides.scopes ?? ['read_user', 'read_api'],
    overrides.createdAt ?? new Date('2026-01-01'),
    overrides.updatedAt ?? new Date('2026-02-01'),
  );
};

const makeMockDoc = (overrides: Record<string, unknown> = {}) => ({
  id: '661f8400-e29b-41d4-a716-446655440111',
  userId: '550e8400-e29b-41d4-a716-446655440000',
  provider: OAuthProvider.GITLAB,
  providerUserId: '12345678',
  accessToken: 'encrypted-access-token',
  refreshToken: null,
  tokenExpiresAt: null,
  scopes: ['read_user', 'read_api'],
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-02-01'),
  ...overrides,
});

const createMockModel = () => {
  const mockExec = jest.fn();

  const mockModel = jest.fn().mockImplementation(() => ({
    save: jest.fn(),
  }));

  Object.assign(mockModel, {
    findOne: jest.fn().mockReturnValue({ exec: mockExec }),
    find: jest.fn().mockReturnValue({ exec: mockExec }),
    findOneAndUpdate: jest.fn().mockReturnValue({ exec: mockExec }),
    findOneAndDelete: jest.fn().mockReturnValue({ exec: mockExec }),
  });

  return { mockModel, mockExec };
};

describe('MongoOAuthConnectionRepository', () => {
  let repository: MongoOAuthConnectionRepository;
  let mockModel: ReturnType<typeof createMockModel>['mockModel'];
  let mockExec: jest.Mock;

  beforeEach(async () => {
    const { mockModel: model, mockExec: exec } = createMockModel();
    mockModel = model;
    mockExec = exec;

    const module = await Test.createTestingModule({
      providers: [
        MongoOAuthConnectionRepository,
        {
          provide: getModelToken('OAuthConnection'),
          useValue: mockModel,
        },
      ],
    }).compile();

    repository = module.get<MongoOAuthConnectionRepository>(
      MongoOAuthConnectionRepository,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return a domain entity when document is found', async () => {
      // Arrange
      const doc = makeMockDoc();
      mockExec.mockResolvedValue(doc);

      // Act
      const result = await repository.findById(
        '661f8400-e29b-41d4-a716-446655440111',
      );

      // Assert
      expect(mockModel.findOne).toHaveBeenCalledWith({
        id: '661f8400-e29b-41d4-a716-446655440111',
      });
      expect(result).toBeInstanceOf(OAuthConnectionEntity);
      expect(result!.id).toBe('661f8400-e29b-41d4-a716-446655440111');
    });

    it('should return null when no document is found', async () => {
      // Arrange
      mockExec.mockResolvedValue(null);

      // Act
      const result = await repository.findById('non-existent-id');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findByUserAndProvider', () => {
    it('should query by userId and provider', async () => {
      // Arrange
      const doc = makeMockDoc();
      mockExec.mockResolvedValue(doc);

      // Act
      const result = await repository.findByUserAndProvider(
        '550e8400-e29b-41d4-a716-446655440000',
        OAuthProvider.GITLAB,
      );

      // Assert
      expect(mockModel.findOne).toHaveBeenCalledWith({
        userId: '550e8400-e29b-41d4-a716-446655440000',
        provider: OAuthProvider.GITLAB,
      });
      expect(result).toBeInstanceOf(OAuthConnectionEntity);
    });

    it('should return null when user has no connection for that provider', async () => {
      // Arrange
      mockExec.mockResolvedValue(null);

      // Act
      const result = await repository.findByUserAndProvider(
        '550e8400-e29b-41d4-a716-446655440000',
        OAuthProvider.GITLAB,
      );

      // Assert
      expect(result).toBeNull();
    });

    it('should respect the provider discriminator (gitlab vs github)', async () => {
      // Arrange
      mockExec.mockResolvedValue(null);

      // Act
      await repository.findByUserAndProvider(
        '550e8400-e29b-41d4-a716-446655440000',
        OAuthProvider.GITHUB,
      );

      // Assert
      expect(mockModel.findOne).toHaveBeenCalledWith({
        userId: '550e8400-e29b-41d4-a716-446655440000',
        provider: OAuthProvider.GITHUB,
      });
    });
  });

  describe('findAllByUser', () => {
    it('should return all connections for a user', async () => {
      // Arrange
      const docs = [
        makeMockDoc({ provider: OAuthProvider.GITLAB }),
        makeMockDoc({ id: 'other-id', provider: OAuthProvider.GITHUB }),
      ];
      mockExec.mockResolvedValue(docs);

      // Act
      const results = await repository.findAllByUser(
        '550e8400-e29b-41d4-a716-446655440000',
      );

      // Assert
      expect(mockModel.find).toHaveBeenCalledWith({
        userId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(results).toHaveLength(2);
      results.forEach((r) => expect(r).toBeInstanceOf(OAuthConnectionEntity));
    });

    it('should return an empty array when user has no connections', async () => {
      // Arrange
      mockExec.mockResolvedValue([]);

      // Act
      const results = await repository.findAllByUser(
        'user-with-no-connections',
      );

      // Assert
      expect(results).toEqual([]);
    });
  });

  describe('save (new entity)', () => {
    it('should call the model constructor and save() for a fresh entity', async () => {
      // Arrange
      const newEntity = OAuthConnectionEntity.create(
        'brand-new-id',
        '550e8400-e29b-41d4-a716-446655440000',
        OAuthProvider.GITLAB,
        '12345678',
        'encrypted-access-token',
        null,
        null,
        ['read_user', 'read_api'],
      );
      const savedDoc = makeMockDoc({ id: 'brand-new-id' });
      const mockInstance = { save: jest.fn().mockResolvedValue(savedDoc) };
      mockModel.mockReturnValue(mockInstance);

      // Act
      const result = await repository.save(newEntity);

      // Assert
      expect(mockModel).toHaveBeenCalled();
      expect(mockInstance.save).toHaveBeenCalled();
      expect(result).toBeInstanceOf(OAuthConnectionEntity);
    });
  });

  describe('save (existing entity)', () => {
    it('should call findOneAndUpdate with upsert for an existing entity', async () => {
      // Arrange
      const existingEntity = makeEntity();
      const updatedDoc = makeMockDoc();
      mockExec.mockResolvedValue(updatedDoc);

      // Act
      const result = await repository.save(existingEntity);

      // Assert
      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: existingEntity.userId, provider: existingEntity.provider },
        expect.objectContaining({ accessToken: 'encrypted-access-token' }),
        { returnDocument: 'after', upsert: true, new: true },
      );
      expect(result).toBeInstanceOf(OAuthConnectionEntity);
    });

    it('should persist the updated tokens when re-authorizing', async () => {
      // Arrange
      const existing = makeEntity({ accessToken: 'old-encrypted-token' });
      const updated = existing.withUpdatedTokens(
        'new-encrypted-token',
        null,
        null,
      );
      mockExec.mockResolvedValue(
        makeMockDoc({ accessToken: 'new-encrypted-token' }),
      );

      // Act
      const result = await repository.save(updated);

      // Assert
      const updateData = (
        (mockModel.findOneAndUpdate as jest.Mock).mock.calls[0] as [
          unknown,
          Record<string, unknown>,
        ]
      )[1];
      expect(updateData.accessToken).toBe('new-encrypted-token');
      expect(result.accessToken).toBe('new-encrypted-token');
    });
  });

  describe('delete', () => {
    it('should call findOneAndDelete with the domain id', async () => {
      // Arrange
      mockExec.mockResolvedValue(makeMockDoc());

      // Act
      await repository.delete('661f8400-e29b-41d4-a716-446655440111');

      // Assert
      expect(mockModel.findOneAndDelete).toHaveBeenCalledWith({
        id: '661f8400-e29b-41d4-a716-446655440111',
      });
    });

    it('should throw NotFoundException when connection does not exist', async () => {
      // Arrange
      mockExec.mockResolvedValue(null);

      // Act and Assert
      await expect(repository.delete('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(repository.delete('non-existent-id')).rejects.toThrow(
        'OAuthConnection with id non-existent-id not found',
      );
    });

    it('should resolve without error when deletion succeeds', async () => {
      // Arrange
      mockExec.mockResolvedValue(makeMockDoc());

      // Act and Assert
      await expect(
        repository.delete('661f8400-e29b-41d4-a716-446655440111'),
      ).resolves.toBeUndefined();
    });
  });

  describe('deleteConnection', () => {
    const connectionId = '661f8400-e29b-41d4-a716-446655440111';
    const userId = '550e8400-e29b-41d4-a716-446655440000';

    it('should call findOneAndDelete with both id and userId for ownership check', async () => {
      // Arrange
      mockExec.mockResolvedValue(makeMockDoc());

      // Act
      await repository.deleteConnection(connectionId, userId);

      // Assert
      expect(mockModel.findOneAndDelete).toHaveBeenCalledWith({
        id: connectionId,
        userId,
      });
    });

    it('should return true when the connection is found and deleted', async () => {
      // Arrange
      mockExec.mockResolvedValue(makeMockDoc());

      // Act
      const result = await repository.deleteConnection(connectionId, userId);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when connection is not found (or belongs to a different user)', async () => {
      // Arrange
      mockExec.mockResolvedValue(null);

      // Act
      const result = await repository.deleteConnection(
        connectionId,
        'different-user-id',
      );

      // Assert
      expect(result).toBe(false);
    });
  });
});
