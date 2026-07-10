import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@/domain/value-objects/role.vo';

export class UserResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    example: 'aragorn@gondor.me',
  })
  email: string;

  @ApiProperty({
    enum: Role,
    isArray: true,
    example: ['player', 'developer'],
  })
  roles: Role[];

  @ApiProperty({
    example: 'Aragorn II Elessar',
    required: false,
  })
  displayName?: string;

  @ApiProperty({
    example: true,
  })
  isActive: boolean;
}
