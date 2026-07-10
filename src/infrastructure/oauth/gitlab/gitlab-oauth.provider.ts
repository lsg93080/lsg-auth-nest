import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  type IOAuthTokenRefresher,
  type OAuthTokenRefreshResult,
} from '@/domain/services/oauth-token-refresher.interface';
import { UnrecoverableTokenRefreshError } from '@/domain/services/oauth-token-refresh.error';

export interface GitLabTokenResponse {
  access_token: string;
  refresh_token: string | null;
  expires_in: number | null;
  scope: string;
  token_type: string;
}

export interface GitLabUser {
  id: number;
  username: string;
  email: string;
  name: string;
}

export interface GitLabProjectMember {
  id: number;
  access_level: number;
}

// GitLab access levels relevant for ownership verification
export const GITLAB_ACCESS_LEVEL = {
  MAINTAINER: 40,
  OWNER: 50,
} as const;

@Injectable()
export class GitLabOAuthProvider implements IOAuthTokenRefresher {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly callbackUrl: string;
  private readonly baseUrl = 'https://gitlab.com';

  constructor(configService: ConfigService) {
    this.clientId = configService.getOrThrow<string>('GITLAB_CLIENT_ID');
    this.clientSecret = configService.getOrThrow<string>(
      'GITLAB_CLIENT_SECRET',
    );
    this.callbackUrl = configService.getOrThrow<string>('GITLAB_CALLBACK_URL');
  }

  buildAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.callbackUrl,
      response_type: 'code',
      scope: 'read_user read_api',
      state,
    });

    return `${this.baseUrl}/oauth/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<GitLabTokenResponse> {
    const response = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.callbackUrl,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `GitLab token exchange failed: ${response.status} ${response.statusText}`,
      );
    }

    return response.json() as Promise<GitLabTokenResponse>;
  }

  async getAuthenticatedUser(accessToken: string): Promise<GitLabUser> {
    const response = await fetch(`${this.baseUrl}/api/v4/user`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error(
        `GitLab user fetch failed: ${response.status} ${response.statusText}`,
      );
    }

    return response.json() as Promise<GitLabUser>;
  }

  async getProjectMember(
    accessToken: string,
    projectId: number,
    gitLabUserId: number,
  ): Promise<GitLabProjectMember | null> {
    const response = await fetch(
      `${this.baseUrl}/api/v4/projects/${projectId}/members/all/${gitLabUserId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    // 404 means the user is not a member of the project
    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(
        `GitLab member fetch failed: ${response.status} ${response.statusText}`,
      );
    }

    return response.json() as Promise<GitLabProjectMember>;
  }

  async refreshAccessToken(
    refreshToken: string,
  ): Promise<OAuthTokenRefreshResult> {
    const response = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      // Capture the OAuth error body, such as {"error":"invalid_grant", ...}, for diagnosis.
      const errorBody = await response.text().catch(() => '');
      const message = `GitLab token refresh failed: ${response.status} ${response.statusText}${
        errorBody ? ` - ${errorBody}` : ''
      }`;

      // invalid_grant means the connection can never be refreshed again; any other status is transient.
      if (this.isInvalidGrant(response.status, errorBody)) {
        throw new UnrecoverableTokenRefreshError(message);
      }

      throw new Error(message);
    }

    const data = (await response.json()) as GitLabTokenResponse;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  }

  // Detects GitLab's invalid_grant error: HTTP 400/401 with body {"error":"invalid_grant", ...}.
  private isInvalidGrant(status: number, body: string): boolean {
    if (status !== 400 && status !== 401) return false;
    try {
      const parsed = JSON.parse(body) as { error?: string };
      return parsed.error === 'invalid_grant';
    } catch {
      return false;
    }
  }
}
