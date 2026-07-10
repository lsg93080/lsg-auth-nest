import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: 403 })
  statusCode: number;

  @ApiProperty({
    example: "Access denied. 'admin' role required.",
  })
  message: string;

  @ApiProperty({ example: 'Forbidden' })
  error: string;
}
