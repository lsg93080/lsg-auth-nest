import { OAuthConnectionEntity } from '@/domain/entities/oauth-connection.entity';
import { OAuthProvider } from '@/domain/value-objects/oauth-provider.vo';

export interface IOAuthConnectionRepository {
  findById(id: string): Promise<OAuthConnectionEntity | null>;
  findByUserAndProvider(
    userId: string,
    provider: OAuthProvider,
  ): Promise<OAuthConnectionEntity | null>;
  findAllByUser(userId: string): Promise<OAuthConnectionEntity[]>;
  save(connection: OAuthConnectionEntity): Promise<OAuthConnectionEntity>;
  delete(id: string): Promise<void>;
  deleteConnection(connectionId: string, userId: string): Promise<boolean>;
}

export const OAUTH_CONNECTION_REPOSITORY = Symbol(
  'OAUTH_CONNECTION_REPOSITORY',
);
