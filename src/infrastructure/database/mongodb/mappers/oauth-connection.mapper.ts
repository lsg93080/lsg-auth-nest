import { OAuthConnectionEntity } from '@/domain/entities/oauth-connection.entity';
import { OAuthConnectionDocument } from '../schemas/oauth-connection.schema';

export class OAuthConnectionMapper {
  static toDomain(
    doc: OAuthConnectionDocument | null,
  ): OAuthConnectionEntity | null {
    if (!doc) return null;

    return new OAuthConnectionEntity(
      doc.id,
      doc.userId,
      doc.provider,
      doc.providerUserId,
      doc.accessToken,
      doc.refreshToken,
      doc.tokenExpiresAt,
      doc.scopes,
      doc.createdAt,
      doc.updatedAt,
    );
  }

  static toDomainOrThrow(
    doc: OAuthConnectionDocument | null,
  ): OAuthConnectionEntity {
    if (!doc) {
      throw new Error('Cannot map null OAuthConnection to domain entity');
    }

    return new OAuthConnectionEntity(
      doc.id,
      doc.userId,
      doc.provider,
      doc.providerUserId,
      doc.accessToken,
      doc.refreshToken,
      doc.tokenExpiresAt,
      doc.scopes,
      doc.createdAt,
      doc.updatedAt,
    );
  }

  static toPersistence(
    entity: OAuthConnectionEntity,
  ): Partial<OAuthConnectionDocument> {
    return {
      id: entity.id!,
      userId: entity.userId,
      provider: entity.provider,
      providerUserId: entity.providerUserId,
      accessToken: entity.accessToken,
      refreshToken: entity.refreshToken,
      tokenExpiresAt: entity.tokenExpiresAt,
      scopes: entity.scopes,
    };
  }

  static toDomainList(
    docs: OAuthConnectionDocument[],
  ): OAuthConnectionEntity[] {
    return docs
      .map((doc) => this.toDomain(doc))
      .filter((entity): entity is OAuthConnectionEntity => entity !== null);
  }
}
