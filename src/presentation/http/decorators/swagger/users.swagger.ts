import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';

export function ApiGetUser() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({ summary: 'Get user by ID (admin only)' }),
    ApiParam({
      name: 'id',
      description: 'User domain UUID',
      example: '550e8400-e29b-41d4-a716-446655440000',
    }),
    ApiResponse({
      status: 200,
      description: 'User found',
      schema: {
        example: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'aragorn@gondor.me',
          displayName: 'Aragorn II Elessar',
          roles: ['player'],
          isActive: true,
          lastLogin: '2026-02-20T12:00:00.000Z',
          createdAt: '2026-01-15T10:00:00.000Z',
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({
      status: 403,
      description: 'Forbidden, admin role required',
    }),
    ApiResponse({ status: 404, description: 'User not found' }),
  );
}

export function ApiAddRole() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({ summary: 'Add role to user (admin only)' }),
    ApiParam({
      name: 'id',
      description: 'User domain UUID',
      example: '550e8400-e29b-41d4-a716-446655440000',
    }),
    ApiBody({
      schema: {
        example: { role: 'developer' },
        description: 'Role to add. Valid values: player, developer, admin',
      },
    }),
    ApiResponse({
      status: 200,
      description: 'Role added successfully',
      schema: {
        example: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'aragorn@gondor.me',
          displayName: 'Aragorn II Elessar',
          roles: ['player', 'developer'],
          isActive: true,
          lastLogin: '2026-02-20T12:00:00.000Z',
          createdAt: '2026-01-15T10:00:00.000Z',
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid role or user already has role',
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({
      status: 403,
      description: 'Forbidden, admin role required',
    }),
    ApiResponse({ status: 404, description: 'User not found' }),
  );
}

export function ApiRemoveRole() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({ summary: 'Remove role from user (admin only)' }),
    ApiParam({
      name: 'id',
      description: 'User domain UUID',
      example: '550e8400-e29b-41d4-a716-446655440000',
    }),
    ApiParam({
      name: 'role',
      description:
        'Role to remove. Valid values: developer, admin (player cannot be removed)',
      example: 'developer',
    }),
    ApiResponse({
      status: 200,
      description: 'Role removed successfully',
      schema: {
        example: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'aragorn@gondor.me',
          displayName: 'Aragorn II Elessar',
          roles: ['player'],
          isActive: true,
          lastLogin: '2026-02-20T12:00:00.000Z',
          createdAt: '2026-01-15T10:00:00.000Z',
        },
      },
    }),
    ApiResponse({
      status: 400,
      description:
        'Invalid role, cannot remove PLAYER role, or user does not have role',
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({
      status: 403,
      description: 'Forbidden, admin role required',
    }),
    ApiResponse({ status: 404, description: 'User not found' }),
  );
}
