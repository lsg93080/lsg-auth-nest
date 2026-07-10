import { Inject, Injectable } from '@nestjs/common';
import {
  OAUTH_CONNECTION_REPOSITORY,
  type IOAuthConnectionRepository,
} from '@/domain/repositories/oauth-connection.repository.interface';
import { OAuthConnectionDto } from '@/application/dto/oauth/oauth-connection.dto';
import { OAuthConnectionMapper } from '@/application/mappers/oauth-connection.mapper';

@Injectable()
export class GetOAuthConnectionsUseCase {
  constructor(
    @Inject(OAUTH_CONNECTION_REPOSITORY)
    private oAuthConnectionRepository: IOAuthConnectionRepository,
  ) {}

  async execute(userId: string): Promise<OAuthConnectionDto[]> {
    const connections =
      await this.oAuthConnectionRepository.findAllByUser(userId);

    return OAuthConnectionMapper.toDtoList(connections);
  }
}
