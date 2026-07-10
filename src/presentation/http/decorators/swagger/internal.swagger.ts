import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';

export function ApiGrantDeveloper() {
  return applyDecorators(
    ApiSecurity('API-key'),
    ApiOperation({
      summary: 'Grant developer role to user',
      description:
        'Grants developer role to a user. Idempotent, can be called multiple times safely. Used by Vitrina service when user creates their first repository.',
    }),
    ApiBody({
      schema: {
        example: { userId: '550e8400-e29b-41d4-a716-446655440000' },
        description: 'User ID (UUID v4 format) from Auth Service',
      },
    }),
    ApiResponse({
      status: 200,
      description:
        'Developer role granted successfully (or user already has the role)',
      schema: {
        example: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'bilbo@theshire.me',
          displayName: 'Bilbo Baggins',
          roles: ['player', 'developer'],
          isActive: true,
          lastLogin: '2026-02-20T12:00:00.000Z',
          createdAt: '2026-01-15T10:00:00.000Z',
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: 'Invalid API key or unknown service',
      schema: {
        example: {
          statusCode: 401,
          message: 'Invalid API key',
        },
      },
    }),
    ApiResponse({
      status: 404,
      description: 'User not found',
      schema: {
        example: {
          statusCode: 404,
          message: 'User not found',
        },
      },
    }),
  );
}

export function ApiValidateToken() {
  return applyDecorators(
    ApiSecurity('API-key'),
    ApiOperation({
      summary: 'Validate JWT and get current user data',
      description: `
Validates a JWT token and returns current user information from the database.

**Process:**
1. Validates JWT signature and expiration
2. Fetches current user data from database (including up-to-date roles)
3. Returns user information if valid

**Important:** Returns current roles from database, not from JWT. This ensures role changes are reflected immediately even if the user's JWT hasn't been refreshed.

**Use case:** Other services (like Vitrina) use this endpoint to validate user tokens and get current permissions.
      `.trim(),
    }),
    ApiBody({
      schema: {
        example: { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
        description: 'JWT token to validate',
      },
    }),
    ApiResponse({
      status: 200,
      description:
        'Token validated successfully, returns current user data from database',
      schema: {
        example: {
          valid: true,
          userId: '550e8400-e29b-41d4-a716-446655440000',
          email: 'bilbo@theshire.me',
          roles: ['player', 'developer'],
        },
      },
    }),
    ApiResponse({
      status: 200,
      description: 'Token is invalid, expired, or user not found/inactive',
      schema: {
        example: {
          valid: false,
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: 'Invalid API key or unknown service',
      schema: {
        example: {
          statusCode: 401,
          message: 'Invalid API key',
        },
      },
    }),
  );
}

export function ApiGetOAuthToken() {
  return applyDecorators(
    ApiSecurity('API-key'),
    ApiOperation({
      summary: 'Get decrypted OAuth access token for a user (internal)',
      description: `
Internal endpoint for inter-service communication. Returns the decrypted
OAuth access token for a given user and provider so that other services
(such as Vitrina) can call provider APIs directly.

Protected by API key. Not intended for public use.
      `.trim(),
    }),
    ApiQuery({
      name: 'userId',
      description: 'Domain UUID of the user',
      example: '550e8400-e29b-41d4-a716-446655440000',
    }),
    ApiQuery({
      name: 'provider',
      description: 'OAuth provider identifier',
      enum: ['gitlab', 'github'],
      example: 'gitlab',
    }),
    ApiResponse({
      status: 200,
      description: 'Access token retrieved successfully',
      schema: {
        example: {
          accessToken: 'glpat-xxxxxxxxxxxxxxxxxxxx',
          provider: 'gitlab',
          providerUserId: '12345678',
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Missing or invalid API key' }),
    ApiResponse({
      status: 404,
      description: 'No connection found for this user and provider',
    }),
    ApiResponse({
      status: 409,
      description:
        'The connection is unrecoverable (revoked/expired) and was deleted. The user must reconnect.',
      schema: {
        example: {
          statusCode: 409,
          message:
            'Your gitlab connection is no longer valid and has been removed. Please reconnect your account.',
          error: 'reconnect_required',
          provider: 'gitlab',
        },
      },
    }),
  );
}

export function ApiDeleteOAuthConnection() {
  return applyDecorators(
    ApiSecurity('API-key'),
    ApiOperation({
      summary: 'Delete a user OAuth connection by provider (internal)',
      description: `
Internal endpoint for inter-service communication. Deletes the stored OAuth
connection for a given user and provider. Used when another service (such as
Vitrina) detects the stored token is dead, for example a 401 from the
provider API, so the user can re-run the connect flow.

Idempotent. Protected by API key. Not intended for public use.
      `.trim(),
    }),
    ApiBody({
      schema: {
        example: {
          userId: '550e8400-e29b-41d4-a716-446655440000',
          provider: 'github',
        },
        description: 'User UUID and OAuth provider',
      },
    }),
    ApiResponse({
      status: 200,
      description:
        'Connection deleted (deleted=true) or nothing to delete (deleted=false)',
      schema: { example: { deleted: true } },
    }),
    ApiResponse({ status: 401, description: 'Missing or invalid API key' }),
  );
}
