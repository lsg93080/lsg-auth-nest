import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

export function ApiRegister() {
  return applyDecorators(
    ApiOperation({ summary: 'Register new user with auth provider token' }),
    ApiBearerAuth('JWT-auth'),
    ApiResponse({
      status: 201,
      description: 'User registered successfully',
      schema: {
        example: {
          access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          isNewUser: true,
          user: {
            id: '67a8f9b2c1d3e4f5g6h7i8j9',
            email: 'user@example.com',
            displayName: 'John Doe',
            roles: ['player'],
          },
        },
      },
    }),
    ApiResponse({ status: 409, description: 'User already exists' }),
    ApiResponse({ status: 401, description: 'Invalid auth provider token' }),
  );
}

export function ApiLogin() {
  return applyDecorators(
    ApiOperation({ summary: 'Login existing user with auth provider token' }),
    ApiBearerAuth('JWT-auth'),
    ApiResponse({
      status: 200,
      description: 'User logged in successfully',
      schema: {
        example: {
          access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          isNewUser: false,
          user: {
            id: '67a8f9b2c1d3e4f5g6h7i8j9',
            email: 'user@example.com',
            displayName: 'Guy Incognito',
            roles: ['player', 'developer'],
          },
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: 'User not found or invalid token',
    }),
  );
}

export function ApiGetProfile() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({ summary: 'Get current user profile' }),
    ApiResponse({
      status: 200,
      description: 'User profile retrieved successfully',
      schema: {
        example: {
          id: '67a8f9b2c1d3e4f5g6h7i8j9',
          email: 'user@example.com',
          displayName: 'Guy Incognito',
          roles: ['player', 'developer'],
          isActive: true,
          lastLogin: '2026-02-15T19:14:15.050Z',
          createdAt: '2025-12-04T22:33:37.421Z',
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized, invalid or missing JWT',
    }),
  );
}
