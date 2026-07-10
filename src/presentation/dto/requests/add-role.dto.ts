import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Role } from '@/domain/value-objects/role.vo';

export class AddRoleDto {
  @ApiProperty({
    enum: Role,
    example: Role.DEVELOPER,
    description: 'Role to assign to the user',
  })
  @IsEnum(Role)
  role: Role;
}
