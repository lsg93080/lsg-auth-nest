import { Inject, Injectable } from '@nestjs/common';
import {
  OAUTH_CONNECTION_REPOSITORY,
  type IOAuthConnectionRepository,
} from '@/domain/repositories/oauth-connection.repository.interface';
import { OAuthProvider } from '@/domain/value-objects/oauth-provider.vo';

export interface DeleteOAuthConnectionByProviderInput {
  userId: string;
  provider: OAuthProvider;
}

// Deletes a user's OAuth connection for a given provider; used internally when another service detects a dead token. Idempotent.
@Injectable()
export class DeleteOAuthConnectionByProviderUseCase {
  constructor(
    @Inject(OAUTH_CONNECTION_REPOSITORY)
    private oAuthConnectionRepository: IOAuthConnectionRepository,
  ) {}

  async execute(
    input: DeleteOAuthConnectionByProviderInput,
  ): Promise<{ deleted: boolean }> {
    const connection =
      await this.oAuthConnectionRepository.findByUserAndProvider(
        input.userId,
        input.provider,
      );

    if (!connection || !connection.id) {
      return { deleted: false };
    }

    const deleted = await this.oAuthConnectionRepository.deleteConnection(
      connection.id,
      input.userId,
    );

    return { deleted };
  }
}
