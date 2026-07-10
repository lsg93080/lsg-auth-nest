import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  OAUTH_CONNECTION_REPOSITORY,
  type IOAuthConnectionRepository,
} from '@/domain/repositories/oauth-connection.repository.interface';

@Injectable()
export class DeleteOAuthConnectionUseCase {
  constructor(
    @Inject(OAUTH_CONNECTION_REPOSITORY)
    private oAuthConnectionRepository: IOAuthConnectionRepository,
  ) {}

  async execute(connectionId: string, userId: string): Promise<void> {
    const deleted = await this.oAuthConnectionRepository.deleteConnection(
      connectionId,
      userId,
    );

    if (!deleted) {
      throw new NotFoundException('OAuth connection not found');
    }
  }
}
