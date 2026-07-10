import { Test } from '@nestjs/testing';
import { DeleteOAuthConnectionByProviderUseCase } from './delete-oauth-connection-by-provider.use-case';
import type { IOAuthConnectionRepository } from '@/domain/repositories/oauth-connection.repository.interface';
import { OAUTH_CONNECTION_REPOSITORY } from '@/domain/repositories/oauth-connection.repository.interface';
import { OAuthConnectionEntity } from '@/domain/entities/oauth-connection.entity';
import { OAuthProvider } from '@/domain/value-objects/oauth-provider.vo';
import type { MockedInterface } from 'test/test-utils';

describe('DeleteOAuthConnectionByProviderUseCase', () => {
  let useCase: DeleteOAuthConnectionByProviderUseCase;
  let repo: MockedInterface<IOAuthConnectionRepository>;

  const userId = '550e8400-e29b-41d4-a716-446655440000';
  const connection = new OAuthConnectionEntity(
    '661f8400-e29b-41d4-a716-446655440111',
    userId,
    OAuthProvider.GITHUB,
    '87654321',
    'encrypted-access-token',
    null,
    null,
    ['read:user'],
    new Date(),
    new Date(),
  );

  beforeEach(async () => {
    repo = {
      findById: jest.fn(),
      findByUserAndProvider: jest.fn(),
      findAllByUser: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      deleteConnection: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        DeleteOAuthConnectionByProviderUseCase,
        { provide: OAUTH_CONNECTION_REPOSITORY, useValue: repo },
      ],
    }).compile();

    useCase = module.get(DeleteOAuthConnectionByProviderUseCase);
  });

  it('should delete the matching connection and return deleted=true', async () => {
    repo.findByUserAndProvider.mockResolvedValue(connection);
    repo.deleteConnection.mockResolvedValue(true);

    const result = await useCase.execute({
      userId,
      provider: OAuthProvider.GITHUB,
    });

    expect(repo.deleteConnection).toHaveBeenCalledWith(
      '661f8400-e29b-41d4-a716-446655440111',
      userId,
    );
    expect(result).toEqual({ deleted: true });
  });

  it('should return deleted=false when there is no connection (idempotent)', async () => {
    repo.findByUserAndProvider.mockResolvedValue(null);

    const result = await useCase.execute({
      userId,
      provider: OAuthProvider.GITHUB,
    });

    expect(repo.deleteConnection).not.toHaveBeenCalled();
    expect(result).toEqual({ deleted: false });
  });
});
