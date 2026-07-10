import { OAuthConnectionEntity } from '@/domain/entities/oauth-connection.entity';
import { OAuthConnectionDto } from '@/application/dto/oauth/oauth-connection.dto';

export class OAuthConnectionMapper {
  // Tokens are intentionally excluded
  static toDto(entity: OAuthConnectionEntity): OAuthConnectionDto {
    return {
      id: entity.id!,
      userId: entity.userId,
      provider: entity.provider,
      providerUserId: entity.providerUserId,
      scopes: entity.scopes,
      tokenExpiresAt: entity.tokenExpiresAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  static toDtoList(entities: OAuthConnectionEntity[]): OAuthConnectionDto[] {
    return entities.map((entity) => this.toDto(entity));
  }
}
