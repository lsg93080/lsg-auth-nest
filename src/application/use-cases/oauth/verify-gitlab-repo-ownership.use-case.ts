import { Injectable, ForbiddenException } from '@nestjs/common';
import {
  GitLabOAuthProvider,
  GITLAB_ACCESS_LEVEL,
} from '@/infrastructure/oauth/gitlab/gitlab-oauth.provider';
import { OAuthProvider } from '@/domain/value-objects/oauth-provider.vo';
import { GetOAuthTokenUseCase } from './get-oauth-token.use-case';

export interface VerifyGitLabRepoOwnershipInput {
  userId: string;
  repoId: number;
}

export interface VerifyGitLabRepoOwnershipOutput {
  verified: boolean;
  repoId: number;
  accessLevel: number;
}

@Injectable()
export class VerifyGitLabRepoOwnershipUseCase {
  constructor(
    private gitLabOAuthProvider: GitLabOAuthProvider,
    private getOAuthTokenUseCase: GetOAuthTokenUseCase,
  ) {}

  async execute(
    input: VerifyGitLabRepoOwnershipInput,
  ): Promise<VerifyGitLabRepoOwnershipOutput> {
    const { accessToken, providerUserId } =
      await this.getOAuthTokenUseCase.execute({
        userId: input.userId,
        provider: OAuthProvider.GITLAB,
      });

    const gitLabUserId = Number(providerUserId);

    const member = await this.gitLabOAuthProvider.getProjectMember(
      accessToken,
      input.repoId,
      gitLabUserId,
    );

    if (!member) {
      throw new ForbiddenException('User is not a member of this repository.');
    }

    const isMaintainerOrOwner =
      member.access_level >= GITLAB_ACCESS_LEVEL.MAINTAINER;

    if (!isMaintainerOrOwner) {
      throw new ForbiddenException(
        'User does not have maintainer or owner access to this repository.',
      );
    }

    return {
      verified: true,
      repoId: input.repoId,
      accessLevel: member.access_level,
    };
  }
}
