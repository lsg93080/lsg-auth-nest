import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ErrorResponseDto } from '@/presentation/dto/responses/error-response.dto';

export function ApiAdminAuth() {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiResponse({
      status: 401,
      description: 'Authentication token is missing or invalid',
      type: ErrorResponseDto,
    }),
    ApiResponse({
      status: 403,
      description: "Access denied. 'admin' role required.",
      type: ErrorResponseDto,
    }),
  );
}
