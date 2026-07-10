import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  type IOAuthTokenRefresher,
  type OAuthTokenRefreshResult,
} from '@/domain/services/oauth-token-refresher.interface';
import { UnrecoverableTokenRefreshError } from '@/domain/services/oauth-token-refresh.error';

export interface GitHubTokenResponse {
  access_token: string;
  scope: string;
  token_type: string;
}

export interface GitHubUser {
  id: number;
  login: string;
  email: string | null;
  name: string | null;
}

interface GitHubEmailEntry {
  email: string;
  primary: boolean;
  verified: boolean;
}

@Injectable()
export class GitHubOAuthProvider implements IOAuthTokenRefresher {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly callbackUrl: string;
  private readonly baseUrl = 'https://github.com';
  private readonly apiUrl = 'https://api.github.com';

  constructor(configService: ConfigService) {
    this.clientId = configService.getOrThrow<string>('GITHUB_CLIENT_ID');
    this.clientSecret = configService.getOrThrow<string>(
      'GITHUB_CLIENT_SECRET',
    );
    this.callbackUrl = configService.getOrThrow<string>('GITHUB_CALLBACK_URL');
  }

  buildAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.callbackUrl,
      scope: 'read:user',
      state,
    });

    return `${this.baseUrl}/login/oauth/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<GitHubTokenResponse> {
    const response = await fetch(`${this.baseUrl}/login/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.callbackUrl,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `GitHub token exchange failed: ${response.status} ${response.statusText}`,
      );
    }

    return response.json() as Promise<GitHubTokenResponse>;
  }

  async getAuthenticatedUser(accessToken: string): Promise<GitHubUser> {
    const response = await fetch(`${this.apiUrl}/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'LifeSyncGames',
      },
    });

    if (!response.ok) {
      throw new Error(
        `GitHub user fetch failed: ${response.status} ${response.statusText}`,
      );
    }

    const user = (await response.json()) as GitHubUser;

    // GitHub does not always include email in /user; fall back to /user/emails when missing.
    if (!user.email) {
      user.email = await this.fetchPrimaryEmail(accessToken, user.login);
    }

    return user;
  }

  // Classic GitHub OAuth App tokens never expire and have no refresh token, so this always signals unrecoverable.
  refreshAccessToken(): Promise<OAuthTokenRefreshResult> {
    return Promise.reject(
      new UnrecoverableTokenRefreshError(
        'GitHub access tokens do not support refresh.',
      ),
    );
  }

  private async fetchPrimaryEmail(
    accessToken: string,
    login: string,
  ): Promise<string> {
    const response = await fetch(`${this.apiUrl}/user/emails`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'LifeSyncGames',
      },
    });

    if (!response.ok) {
      // Fall back to a synthetic email, better than crashing
      return `${login}@github.local`;
    }

    const emails = (await response.json()) as GitHubEmailEntry[];
    const primary = emails.find((e) => e.primary && e.verified);

    return primary?.email ?? `${login}@github.local`;
  }
}
