import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';

export function ApiGitLabAuthorize() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Get GitLab authorization URL',
      description: `
Returns the GitLab OAuth authorization URL. The client should redirect the user to this URL.

**Flow:**
1. Client calls this endpoint (with JWT)
2. Client redirects user to returned \`authorizationUrl\`
3. User authorizes on GitLab
4. GitLab redirects to callback URL
5. Client receives result at \`redirect_url\`
      `.trim(),
    }),
    ApiQuery({
      name: 'redirect_url',
      description:
        'URL to redirect to after OAuth flow completes (success or error)',
      example: 'https://vitrina.app/oauth/callback',
    }),
    ApiResponse({
      status: 200,
      description: 'Authorization URL generated successfully',
      schema: {
        example: {
          authorizationUrl:
            'https://gitlab.com/oauth/authorize?client_id=...&redirect_uri=...&state=...',
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized, invalid or missing JWT',
    }),
  );
}

export function ApiGitLabCallback() {
  return applyDecorators(
    ApiOperation({
      summary: 'GitLab OAuth callback',
      description: `
Handles the OAuth callback from GitLab. This endpoint is called by GitLab after the user authorizes the app.

**Note:** This endpoint should not be called directly. It is the callback URL registered in the GitLab OAuth app.

On success: redirects to \`redirect_url?success=true\`
On error: redirects to \`redirect_url?error=MESSAGE\`
      `.trim(),
    }),
    ApiResponse({
      status: 302,
      description:
        'Redirects to the redirect_url with success or error query param',
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid state parameter or code exchange failed',
    }),
  );
}

export function ApiGetOAuthConnections() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'List OAuth connections for current user',
      description:
        'Returns all active OAuth provider connections for the authenticated user. Tokens are never included in the response.',
    }),
    ApiResponse({
      status: 200,
      description: 'List of OAuth connections',
      schema: {
        example: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            userId: '661f8400-e29b-41d4-a716-446655440111',
            provider: 'gitlab',
            providerUserId: '12345678',
            scopes: ['read_user', 'read_api'],
            tokenExpiresAt: null,
            createdAt: '2026-02-20T12:00:00.000Z',
            updatedAt: '2026-02-20T12:00:00.000Z',
          },
        ],
      },
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized, invalid or missing JWT',
    }),
  );
}

export function ApiDeleteOAuthConnection() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Disconnect an OAuth provider account',
      description:
        'Removes the OAuth connection for the given ID. Only the owner of the connection can delete it. Vitrina should call `can-disconnect` before invoking this endpoint.',
    }),
    ApiParam({
      name: 'id',
      description: 'OAuth connection UUID',
      example: '661f8400-e29b-41d4-a716-446655440111',
    }),
    ApiResponse({
      status: 204,
      description: 'Connection deleted successfully',
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized, invalid or missing JWT',
    }),
    ApiResponse({
      status: 404,
      description:
        'OAuth connection not found or does not belong to the authenticated user',
    }),
  );
}

export function ApiGitHubAuthorize() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Get GitHub authorization URL',
      description: `
Returns the GitHub OAuth authorization URL. The client should redirect the user to this URL.

**Flow:**
1. Client calls this endpoint (with JWT)
2. Client redirects user to returned \`authorizationUrl\`
3. User authorizes on GitHub
4. GitHub redirects to callback URL
5. Client receives result at \`redirect_url\`
      `.trim(),
    }),
    ApiQuery({
      name: 'redirect_url',
      description:
        'URL to redirect to after OAuth flow completes (success or error)',
      example: 'https://vitrina.app/oauth/callback',
    }),
    ApiResponse({
      status: 200,
      description: 'Authorization URL generated successfully',
      schema: {
        example: {
          authorizationUrl:
            'https://github.com/login/oauth/authorize?client_id=...&redirect_uri=...&state=...',
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized, invalid or missing JWT',
    }),
  );
}

export function ApiGitHubCallback() {
  return applyDecorators(
    ApiOperation({
      summary: 'GitHub OAuth callback',
      description: `
Handles the OAuth callback from GitHub. This endpoint is called by GitHub after the user authorizes the app.

**Note:** This endpoint should not be called directly. It is the callback URL registered in the GitHub OAuth app.

On success: redirects to \`redirect_url?success=true\`
On error: redirects to \`redirect_url?error=MESSAGE\`
      `.trim(),
    }),
    ApiResponse({
      status: 302,
      description:
        'Redirects to the redirect_url with success or error query param',
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid state parameter or code exchange failed',
    }),
  );
}

export function ApiVerifyGitLabRepoOwnership() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Verify GitLab repo ownership',
      description:
        'Verifies that the authenticated user is owner or maintainer (access_level >= 40) of the given GitLab repository. Used by Vitrina before allowing a publication.',
    }),
    ApiParam({
      name: 'repoId',
      description: 'Numeric GitLab project ID',
      example: 12345678,
    }),
    ApiResponse({
      status: 200,
      description: 'User is owner or maintainer of the repository',
      schema: {
        example: {
          verified: true,
          repoId: 12345678,
          accessLevel: 50,
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized, invalid or missing JWT',
    }),
    ApiResponse({
      status: 403,
      description:
        'User is not a member or does not have sufficient access level',
    }),
    ApiResponse({
      status: 404,
      description: 'No GitLab connection found for this user',
    }),
  );
}
