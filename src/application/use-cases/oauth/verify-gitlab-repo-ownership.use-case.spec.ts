import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { VerifyGitLabRepoOwnershipUseCase } from './verify-gitlab-repo-ownership.use-case';
import {
  GitLabOAuthProvider,
  GITLAB_ACCESS_LEVEL,
} from '@/infrastructure/oauth/gitlab/gitlab-oauth.provider';
import { GetOAuthTokenUseCase } from './get-oauth-token.use-case';
import { OAuthProvider } from '@/domain/value-objects/oauth-provider.vo';

describe('VerifyGitLabRepoOwnershipUseCase', () => {
  let useCase: VerifyGitLabRepoOwnershipUseCase;
  let mockGitLabOAuthProvider: jest.Mocked<
    Pick<GitLabOAuthProvider, 'getProjectMember'>
  >;
  let mockGetOAuthTokenUseCase: jest.Mocked<
    Pick<GetOAuthTokenUseCase, 'execute'>
  >;

  const userId = '550e8400-e29b-41d4-a716-446655440000';
  const repoId = 11111111;

  beforeEach(async () => {
    mockGitLabOAuthProvider = { getProjectMember: jest.fn() };
    mockGetOAuthTokenUseCase = { execute: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        VerifyGitLabRepoOwnershipUseCase,
        {
          provide: GitLabOAuthProvider,
          useValue: mockGitLabOAuthProvider,
        },
        {
          provide: GetOAuthTokenUseCase,
          useValue: mockGetOAuthTokenUseCase,
        },
      ],
    }).compile();

    useCase = module.get<VerifyGitLabRepoOwnershipUseCase>(
      VerifyGitLabRepoOwnershipUseCase,
    );
  });

  describe('execute', () => {
    it('should return verified true when user is owner (access_level 50)', async () => {
      // Arrange
      mockGetOAuthTokenUseCase.execute.mockResolvedValue({
        accessToken: 'raw-access-token',
        provider: OAuthProvider.GITLAB,
        providerUserId: '12345678',
      });
      mockGitLabOAuthProvider.getProjectMember.mockResolvedValue({
        id: 12345678,
        access_level: GITLAB_ACCESS_LEVEL.OWNER,
      });

      // Act
      const result = await useCase.execute({ userId, repoId });

      // Assert
      expect(result.verified).toBe(true);
      expect(result.repoId).toBe(repoId);
      expect(result.accessLevel).toBe(GITLAB_ACCESS_LEVEL.OWNER);
    });

    it('should return verified true when user is maintainer (access_level 40)', async () => {
      // Arrange
      mockGetOAuthTokenUseCase.execute.mockResolvedValue({
        accessToken: 'raw-access-token',
        provider: OAuthProvider.GITLAB,
        providerUserId: '12345678',
      });
      mockGitLabOAuthProvider.getProjectMember.mockResolvedValue({
        id: 12345678,
        access_level: GITLAB_ACCESS_LEVEL.MAINTAINER,
      });

      // Act
      const result = await useCase.execute({ userId, repoId });

      // Assert
      expect(result.verified).toBe(true);
      expect(result.accessLevel).toBe(GITLAB_ACCESS_LEVEL.MAINTAINER);
    });

    it('should throw ForbiddenException when user is a member but below maintainer (developer, access_level 30)', async () => {
      // Arrange
      mockGetOAuthTokenUseCase.execute.mockResolvedValue({
        accessToken: 'raw-access-token',
        provider: OAuthProvider.GITLAB,
        providerUserId: '12345678',
      });
      mockGitLabOAuthProvider.getProjectMember.mockResolvedValue({
        id: 12345678,
        access_level: 30, // Developer
      });

      // Act and Assert
      await expect(useCase.execute({ userId, repoId })).rejects.toThrow(
        ForbiddenException,
      );
      await expect(useCase.execute({ userId, repoId })).rejects.toThrow(
        'User does not have maintainer or owner access',
      );
    });

    it('should throw ForbiddenException when user is not a member of the repo', async () => {
      // Arrange
      mockGetOAuthTokenUseCase.execute.mockResolvedValue({
        accessToken: 'raw-access-token',
        provider: OAuthProvider.GITLAB,
        providerUserId: '12345678',
      });
      mockGitLabOAuthProvider.getProjectMember.mockResolvedValue(null);

      // Act and Assert
      await expect(useCase.execute({ userId, repoId })).rejects.toThrow(
        ForbiddenException,
      );
      await expect(useCase.execute({ userId, repoId })).rejects.toThrow(
        'User is not a member of this repository',
      );
    });

    it('should propagate NotFoundException when GetOAuthToken finds no connection', async () => {
      // Arrange
      mockGetOAuthTokenUseCase.execute.mockRejectedValue(
        new NotFoundException('No gitlab connection found for this user.'),
      );

      // Act and Assert
      await expect(useCase.execute({ userId, repoId })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should call GetOAuthTokenUseCase with correct userId and GITLAB provider', async () => {
      // Arrange
      mockGetOAuthTokenUseCase.execute.mockResolvedValue({
        accessToken: 'raw-access-token',
        provider: OAuthProvider.GITLAB,
        providerUserId: '12345678',
      });
      mockGitLabOAuthProvider.getProjectMember.mockResolvedValue({
        id: 12345678,
        access_level: GITLAB_ACCESS_LEVEL.OWNER,
      });

      // Act
      await useCase.execute({ userId, repoId });

      // Assert
      expect(mockGetOAuthTokenUseCase.execute).toHaveBeenCalledWith({
        userId,
        provider: OAuthProvider.GITLAB,
      });
      expect(mockGitLabOAuthProvider.getProjectMember).toHaveBeenCalledWith(
        'raw-access-token',
        repoId,
        12345678, // providerUserId converted to number
      );
    });

    it('should not call GitLab API when GetOAuthToken throws', async () => {
      // Arrange
      mockGetOAuthTokenUseCase.execute.mockRejectedValue(
        new NotFoundException('No gitlab connection found for this user.'),
      );

      // Act
      await useCase.execute({ userId, repoId }).catch(() => null);

      // Assert
      expect(mockGitLabOAuthProvider.getProjectMember).not.toHaveBeenCalled();
    });
  });
});
